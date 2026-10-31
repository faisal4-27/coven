import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import type { SpriteDef } from '../sprites'

interface Run {
  x: number
  y: number
  w: number
  color: string
}

const cache = new WeakMap<string[], { runs: Run[]; w: number; h: number }>()

/** Merge horizontal runs of the same color into one rect each, so a 24x26 sprite is ~150 nodes, not 600. */
function computeRuns(grid: string[], palette: Record<string, string>) {
  const runs: Run[] = []
  grid.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const ch = row[x]
      let end = x + 1
      while (end < row.length && row[end] === ch) end++
      const color = palette[ch]
      if (ch !== '.' && color) runs.push({ x, y, w: end - x, color })
      x = end
    }
  })
  return { runs, w: Math.max(...grid.map((r) => r.length)), h: grid.length }
}

function cachedRuns(grid: string[], palette: Record<string, string>) {
  let hit = cache.get(grid)
  if (!hit) cache.set(grid, (hit = computeRuns(grid, palette)))
  return hit
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => setReduced(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return reduced
}

interface Props {
  sprite: SpriteDef
  /** Screen pixels per sprite pixel. */
  scale?: number
  /** Force a frame instead of animating. */
  frame?: number
  /** Override palette entries, e.g. to tint a sprite. */
  tint?: Record<string, string>
  title?: string
  className?: string
  style?: CSSProperties
}

export function PixelSprite({ sprite, scale = 4, frame, tint, title, className, style }: Props) {
  const reduced = usePrefersReducedMotion()
  const animate = frame === undefined && !reduced && sprite.frames.length > 1
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!animate) return
    const id = setInterval(() => setTick((t) => t + 1), 1000 / (sprite.fps ?? 3))
    return () => clearInterval(id)
  }, [animate, sprite.fps])

  const grid = sprite.frames[(frame ?? tick) % sprite.frames.length]
  const palette = useMemo(() => (tint ? { ...sprite.palette, ...tint } : sprite.palette), [sprite.palette, tint])
  const { runs, w, h } = useMemo(
    () => (tint ? computeRuns(grid, palette) : cachedRuns(grid, palette)),
    [grid, palette, tint],
  )

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w * scale}
      height={h * scale}
      shapeRendering="crispEdges"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      className={className}
      style={style}
    >
      {title && <title>{title}</title>}
      {runs.map((r) => (
        <rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={r.w} height={1} fill={r.color} />
      ))}
    </svg>
  )
}

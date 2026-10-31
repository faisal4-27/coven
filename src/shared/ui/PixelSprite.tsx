import { useMemo, type CSSProperties } from 'react'
import type { SpriteDef } from '../sprites'

interface Layer {
  color: string
  /** One path per color: every horizontal run as a 1px-tall subpath. */
  d: string
}

interface Compiled {
  w: number
  h: number
  /** Distinct frames only. A blink that repeats the base frame doesn't get drawn twice. */
  frames: Layer[][]
  /** Which distinct frame shows on each tick of the loop. */
  schedule: number[]
  name: string
}

let nextId = 0
/** Per sprite, keyed by tint ('' for none), so tinting with a fresh object literal each render stays cheap. */
const cache = new WeakMap<SpriteDef, Map<string, Compiled>>()

function compileFrame(grid: string[], palette: Record<string, string>): Layer[] {
  const byColor = new Map<string, string[]>()
  grid.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const ch = row[x]
      let end = x + 1
      while (end < row.length && row[end] === ch) end++
      const color = palette[ch]
      if (ch !== '.' && color) {
        const parts = byColor.get(color) ?? []
        parts.push(`M${x} ${y}h${end - x}v1h${x - end}z`)
        byColor.set(color, parts)
      }
      x = end
    }
  })
  return [...byColor].map(([color, parts]) => ({ color, d: parts.join('') }))
}

function compile(sprite: SpriteDef, palette: Record<string, string>): Compiled {
  const unique = new Map<string[], number>()
  const keys = new Map<string, number>()
  const frames: Layer[][] = []
  const schedule = sprite.frames.map((grid) => {
    let idx = unique.get(grid)
    if (idx === undefined) {
      const key = grid.join('\n')
      idx = keys.get(key)
      if (idx === undefined) {
        idx = frames.length
        frames.push(compileFrame(grid, palette))
        keys.set(key, idx)
      }
      unique.set(grid, idx)
    }
    return idx
  })
  const all = sprite.frames
  return {
    w: Math.max(...all.flatMap((g) => g.map((r) => r.length))),
    h: Math.max(...all.map((g) => g.length)),
    frames,
    schedule,
    name: `pxs${nextId++}`,
  }
}

/** Keyframes that show distinct frame `k` on exactly the ticks where the schedule picks it. */
function keyframes(c: Compiled) {
  const n = c.schedule.length
  return c.frames
    .map((_, k) => {
      const stops = c.schedule.map((s, j) => `${((j / n) * 100).toFixed(3)}%{visibility:${s === k ? 'visible' : 'hidden'}}`)
      stops.push(`100%{visibility:${c.schedule[0] === k ? 'visible' : 'hidden'}}`)
      return `@keyframes ${c.name}-${k}{${stops.join('')}}`
    })
    .join('')
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

/**
 * Pixel sprite as crisp SVG. Frames animate purely in CSS (stepped visibility), so an idle page with a dozen
 * sprites does zero JavaScript work. Reduced motion is handled by the global rule in index.css, which
 * ends every animation and leaves the first frame showing.
 */
export function PixelSprite({ sprite, scale = 4, frame, tint, title, className, style }: Props) {
  const tintKey = tint ? JSON.stringify(tint) : ''
  const c = useMemo(() => {
    let bySprite = cache.get(sprite)
    if (!bySprite) cache.set(sprite, (bySprite = new Map()))
    let hit = bySprite.get(tintKey)
    if (!hit) {
      const palette = tintKey ? { ...sprite.palette, ...(JSON.parse(tintKey) as Record<string, string>) } : sprite.palette
      bySprite.set(tintKey, (hit = compile(sprite, palette)))
    }
    return hit
  }, [sprite, tintKey])

  const animate = frame === undefined && c.frames.length > 1
  const css = useMemo(() => (animate ? keyframes(c) : ''), [animate, c])
  const duration = c.schedule.length / (sprite.fps ?? 3)
  const shown = frame === undefined ? null : c.schedule[frame % c.schedule.length]

  return (
    <svg
      viewBox={`0 0 ${c.w} ${c.h}`}
      width={c.w * scale}
      height={c.h * scale}
      shapeRendering="crispEdges"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      className={className}
      style={style}
    >
      {title && <title>{title}</title>}
      {css && <style>{css}</style>}
      {c.frames.map((layers, k) => {
        if (shown !== null && k !== shown) return null
        if (!animate && shown === null && k !== c.schedule[0]) return null
        return (
          <g
            key={k}
            style={
              animate
                ? {
                    visibility: k === c.schedule[0] ? 'visible' : 'hidden',
                    animation: `${c.name}-${k} ${duration}s step-end infinite`,
                  }
                : undefined
            }
          >
            {layers.map((l) => (
              <path key={l.color} d={l.d} fill={l.color} />
            ))}
          </g>
        )
      })}
    </svg>
  )
}

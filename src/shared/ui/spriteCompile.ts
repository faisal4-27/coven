// Compiles text-grid sprites into SVG path data, cached per sprite and tint. Used by <PixelSprite> and by
// spriteSvg() for places React can't render into, such as Leaflet marker icons.
import type { SpriteDef } from '../sprites'

interface Layer {
  color: string
  /** One path per color: every horizontal run as a 1px-tall subpath. */
  d: string
}

export interface Compiled {
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

export function compiled(sprite: SpriteDef, tintKey: string): Compiled {
  let bySprite = cache.get(sprite)
  if (!bySprite) cache.set(sprite, (bySprite = new Map()))
  let hit = bySprite.get(tintKey)
  if (!hit) {
    const palette = tintKey ? { ...sprite.palette, ...(JSON.parse(tintKey) as Record<string, string>) } : sprite.palette
    bySprite.set(tintKey, (hit = compile(sprite, palette)))
  }
  return hit
}

/**
 * One frame of a sprite as an SVG string, for places React can't render into (Leaflet marker icons).
 * Shares the compile cache with <PixelSprite>.
 */
export function spriteSvg(
  sprite: SpriteDef,
  { frame = 0, scale = 2, tint }: { frame?: number; scale?: number; tint?: Record<string, string> } = {},
): string {
  const c = compiled(sprite, tint ? JSON.stringify(tint) : '')
  const layers = c.frames[c.schedule[frame % c.schedule.length]]
  const paths = layers.map((l) => `<path d="${l.d}" fill="${l.color}"/>`).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${c.w} ${c.h}" width="${c.w * scale}" height="${c.h * scale}" shape-rendering="crispEdges">${paths}</svg>`
}

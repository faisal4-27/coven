import { useMemo, type CSSProperties } from 'react'
import type { SpriteDef } from '../sprites'
import { compiled, type Compiled } from './spriteCompile'

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
  const c = useMemo(() => compiled(sprite, tintKey), [sprite, tintKey])

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

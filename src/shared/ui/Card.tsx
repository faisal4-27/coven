import type { CSSProperties, HTMLAttributes } from 'react'
import { accents } from '../tokens'
import type { Monster } from '../types'

interface Props extends HTMLAttributes<HTMLDivElement> {
  accent?: Monster
}

/** Pixel panel with stepped corners and a hard drop shadow. */
export function Card({ accent, className = '', style, ...rest }: Props) {
  const edge = accent ? accents[accent].main : 'var(--color-edge)'
  return (
    <div
      className={`relative bg-panel p-5 ${className}`}
      style={
        {
          boxShadow: `0 -4px 0 0 ${edge}, 0 4px 0 0 ${edge}, -4px 0 0 0 ${edge}, 4px 0 0 0 ${edge}, 8px 8px 0 0 #000`,
          ...style,
        } as CSSProperties
      }
      {...rest}
    />
  )
}

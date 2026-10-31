import type { CrunchWeek } from '../types'
import { colors } from '../tokens'

const lit: Record<CrunchWeek['phase'], number> = {
  new: 0,
  'waxing-crescent': 0.25,
  'first-quarter': 0.5,
  'waxing-gibbous': 0.75,
  full: 1,
}

/** Pixel moon, lit from the right according to phase. Size is in sprite pixels (rendered at `scale`). */
export function MoonIcon({ phase, size = 12, scale = 3, glow }: { phase: CrunchWeek['phase']; size?: number; scale?: number; glow?: string }) {
  const r = size / 2
  const fraction = lit[phase]
  const cells: { x: number; y: number; on: boolean }[] = []
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - r
      const dy = y + 0.5 - r
      if (dx * dx + dy * dy > r * r) continue
      const half = Math.sqrt(r * r - dy * dy)
      // Terminator sweeps from the right edge (new) to the left edge (full).
      const terminator = half - 2 * half * fraction
      cells.push({ x, y, on: fraction > 0 && dx >= terminator })
    }
  }
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size * scale}
      height={size * scale}
      shapeRendering="crispEdges"
      aria-label={`${phase.replace('-', ' ')} moon`}
      style={glow && phase === 'full' ? { filter: `drop-shadow(0 0 6px ${glow})` } : undefined}
    >
      {cells.map((c) => (
        <rect key={`${c.x}-${c.y}`} x={c.x} y={c.y} width={1} height={1} fill={c.on ? colors.moon : colors.panelHi} />
      ))}
    </svg>
  )
}

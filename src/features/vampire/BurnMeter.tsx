import { colors } from '../../shared/tokens'

const SEGMENTS = 10

/** Pixel health bar for sun exposure. Full = you're toast. */
export function BurnMeter({ exposure, label = 'Burn' }: { exposure: number; label?: string }) {
  const lit = Math.round(exposure * SEGMENTS)
  const pct = Math.round(exposure * 100)
  return (
    <div className="flex items-center gap-3" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={`${label} ${pct}%`}>
      <span className="shrink-0 font-display text-sm uppercase tracking-widest text-ash">{label}</span>
      <div className="flex min-w-0 gap-1 bg-night p-1 [box-shadow:0_0_0_4px_var(--color-edge)]">
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <span
            key={i}
            className="h-4 w-3 min-w-0"
            style={{
              background: i < lit ? (i < 3 ? colors.sun : i < 7 ? '#ff7a1a' : '#d7263d') : colors.panelHi,
            }}
          />
        ))}
      </div>
      <span className="w-12 shrink-0 text-right text-2xl tabular-nums">{pct}%</span>
    </div>
  )
}

import { colors } from '../../shared/tokens'
import type { SlotExposure } from './logic'

const fmt = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

function color(s: SlotExposure) {
  if (s.night || s.sunExposure < 0.1) return s.night ? colors.panelHi : colors.shadow
  if (s.sunExposure < 0.3) return colors.sun
  if (s.sunExposure < 0.6) return '#ff7a1a'
  return '#d7263d'
}

/**
 * Sun exposure of the route through the day, one pixel bar per 15 minutes, lined up with the time slider.
 * Taller and hotter means more sun. Click a bar to leave then.
 */
export function ExposureStrip({ slots, at, onPick }: { slots: SlotExposure[] | null; at: Date; onPick: (at: Date) => void }) {
  const selected = slots ? slots.findIndex((s, i) => at >= s.at && (i === slots.length - 1 || at < slots[i + 1].at)) : -1
  const day = slots?.filter((s) => !s.night) ?? []
  const best = day.length ? day.reduce((a, b) => (b.sunExposure < a.sunExposure ? b : a)) : null
  const label = !slots
    ? 'Sun exposure through the day, loading'
    : best
      ? `Sun exposure through the day. Least sun at ${fmt(best.at)}, ${Math.round(best.sunExposure * 100)} percent.`
      : 'The sun is down all day on this route.'

  return (
    <div
      role="img"
      aria-label={label}
      className="flex h-9 cursor-pointer items-end gap-px"
      onClick={(e) => {
        if (!slots) return
        const r = e.currentTarget.getBoundingClientRect()
        const i = Math.min(slots.length - 1, Math.max(0, Math.floor(((e.clientX - r.left) / r.width) * slots.length)))
        onPick(slots[i].at)
      }}
    >
      {(slots ?? Array.from({ length: 57 }, () => null)).map((s, i) => (
        <span
          key={i}
          title={s ? `${fmt(s.at)} · ${s.night ? 'sun down' : `${Math.round(s.sunExposure * 100)}% sun`}` : undefined}
          className="block flex-1"
          style={{
            height: s ? `${4 + Math.round((s.night ? 0 : s.sunExposure) * 28)}px` : '4px',
            background: s ? color(s) : colors.edge,
            boxShadow: i === selected ? `0 0 0 2px ${colors.bone}` : undefined,
            opacity: s ? 1 : 0.5,
          }}
        />
      ))}
    </div>
  )
}

import L from 'leaflet'
import { useEffect, useMemo, useRef } from 'react'
import { useMap } from 'react-leaflet'
import { vampire } from '../../shared/sprites'
import { spriteSvg } from '../../shared/ui'
import type { RoutePlan } from './logic'

type Kind = 'walk' | 'scorched'

const SCORCHED = { s: '#f0a58f', S: '#c96f5a' }
const smoke = [0, 0.4, 0.8]
  .map((d, i) => `<span class="anim-smoke" style="position:absolute;top:-6px;left:${14 + i * 8}px;width:6px;height:6px;background:#9c94b8;animation-delay:${d}s"></span>`)
  .join('')

const icons: Record<Kind, L.DivIcon> = {
  walk: L.divIcon({ className: '', iconSize: [48, 52], iconAnchor: [24, 50], html: spriteSvg(vampire, { scale: 2 }) }),
  scorched: L.divIcon({
    className: '',
    iconSize: [48, 52],
    iconAnchor: [24, 50],
    html: `<div style="position:relative">${smoke}${spriteSvg(vampire, { scale: 2, tint: SCORCHED })}</div>`,
  }),
}

interface Track {
  pts: L.LatLng[]
  /** Cumulative metres at each point. */
  cum: number[]
  /** Whether each segment (pts[i] -> pts[i + 1]) is in direct sun. */
  sunny: boolean[]
  total: number
}

function buildTrack(plan: RoutePlan, night: boolean): Track | null {
  const pts: L.LatLng[] = []
  const sunny: boolean[] = []
  for (const piece of plan.pieces) {
    piece.coords.forEach(([lng, lat], i) => {
      if (pts.length && i === 0) return // pieces share their first point with the previous piece
      if (pts.length) sunny.push(!night && piece.kind === 'sun')
      pts.push(L.latLng(lat, lng))
    })
  }
  if (pts.length < 2) return null
  const cum = [0]
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i - 1].distanceTo(pts[i]))
  return { pts, cum, sunny, total: cum[cum.length - 1] }
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * A pixel vampire walking the current route on a loop, scorched and smoking on sunny stretches.
 * Moved imperatively every frame (setLatLng), so it never re-renders React.
 */
export function Walker({ plan }: { plan: RoutePlan | null }) {
  const map = useMap()
  const night = plan ? plan.sun.altitude <= 0 : false
  const track = useMemo(() => (plan ? buildTrack(plan, night) : null), [plan, night])
  const latest = useRef(track)
  const marker = useRef<L.Marker | null>(null)

  useEffect(() => {
    latest.current = track
    if (!track) marker.current?.remove()
    else if (marker.current && !map.hasLayer(marker.current)) marker.current.addTo(map)
    // With reduced motion the vampire stands still at the start of whatever route is showing.
    if (track && reducedMotion()) marker.current?.setLatLng(track.pts[0])
  }, [track, map])

  useEffect(() => {
    const m = L.marker([0, 0], { icon: icons.walk, interactive: false, keyboard: false, zIndexOffset: 2000 })
    marker.current = m
    let kind: Kind = 'walk'
    let raf = 0
    // Fraction of the lap, kept across route changes so the vampire doesn't jump back to the start.
    let progress = 0
    let last = performance.now()

    const place = (t: Track) => {
      const d = progress * t.total
      let i = 0
      while (i < t.cum.length - 2 && t.cum[i + 1] < d) i++
      const seg = t.cum[i + 1] - t.cum[i] || 1
      const f = Math.min(1, Math.max(0, (d - t.cum[i]) / seg))
      const a = t.pts[i]
      const b = t.pts[i + 1]
      m.setLatLng([a.lat + (b.lat - a.lat) * f, a.lng + (b.lng - a.lng) * f])
      const next: Kind = t.sunny[i] ? 'scorched' : 'walk'
      if (next !== kind) m.setIcon(icons[(kind = next)])
    }

    const tick = (now: number) => {
      const t = latest.current
      if (t) {
        if (!map.hasLayer(m)) m.addTo(map)
        // About 1.2 s per 100 m, so short and long routes both read as a stroll; 4 to 9 s per lap.
        const lap = Math.min(9000, Math.max(4000, t.total * 12))
        progress = (progress + (now - last) / lap) % 1
        place(t)
      }
      last = now
      raf = requestAnimationFrame(tick)
    }

    if (reducedMotion()) {
      if (latest.current) {
        m.addTo(map)
        place(latest.current)
      }
    } else raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      m.remove()
      marker.current = null
    }
  }, [map])

  return null
}

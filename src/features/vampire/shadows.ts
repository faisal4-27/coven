// Building shadows from sun position. Pure geometry, no UI.
import { getPosition } from 'suncalc'
import { CAMPUS, fallbackFootprints, massingOverrides, type Footprint } from './campus'

type P = [number, number]

export interface Shadow {
  ring: P[]
  bbox: [number, number, number, number]
}

export interface Sun {
  /** Degrees above the horizon. */
  altitude: number
  /** Compass bearing in degrees, 0 = north, 90 = east. */
  bearing: number
}

const M_PER_DEG_LAT = 111_320
const M_PER_DEG_LNG = 111_320 * Math.cos((CAMPUS.lat * Math.PI) / 180)
/** Low sun makes shadows absurdly long; past this they stop mattering for a campus walk. */
const MAX_SHADOW_M = 300

export function sunAt(at: Date): Sun {
  // suncalc v2 reports degrees, azimuth clockwise from north.
  const { altitude, azimuth } = getPosition(at, CAMPUS.lat, CAMPUS.lng)
  return { altitude, bearing: azimuth }
}

let massing: Promise<Footprint[]> | null = null

/** Real LiDAR massing if the clipped file is present, otherwise the hand-traced fallback. */
export function loadMassing(): Promise<Footprint[]> {
  massing ??= fetch('/data/massing-stgeorge.geojson')
    .then((r) => {
      if (!r.ok) throw new Error(String(r.status))
      return r.json() as Promise<{ features: { properties: { height: number }; geometry: { coordinates: P[][] } }[] }>
    })
    .then((fc) => [
      ...fc.features.map((f) => ({ name: '', height: f.properties.height, ring: f.geometry.coordinates[0] })),
      ...massingOverrides,
    ])
    .catch(() => fallbackFootprints)
  return massing
}

function cross(o: P, a: P, b: P) {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
}

/** Andrew's monotone chain. Fine in lng/lat at campus scale. */
function convexHull(points: P[]): P[] {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const lower: P[] = []
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop()
    lower.push(p)
  }
  const upper: P[] = []
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop()
    upper.push(p)
  }
  const hull = lower.slice(0, -1).concat(upper.slice(0, -1))
  return [...hull, hull[0]]
}

function bboxOf(ring: P[]): Shadow['bbox'] {
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity]
  for (const [x, y] of ring) {
    if (x < x0) x0 = x
    if (y < y0) y0 = y
    if (x > x1) x1 = x
    if (y > y1) y1 = y
  }
  return [x0, y0, x1, y1]
}

/**
 * Each footprint is swept away from the sun by height / tan(altitude). The hull of the footprint and its
 * translated copy is the shadow on flat ground.
 */
export function castShadows(footprints: Footprint[], sun: Sun): Shadow[] {
  if (sun.altitude <= 0) return []
  const tanAlt = Math.tan((sun.altitude * Math.PI) / 180)
  const away = ((sun.bearing + 180) * Math.PI) / 180
  const ux = Math.sin(away) / M_PER_DEG_LNG
  const uy = Math.cos(away) / M_PER_DEG_LAT
  return footprints.map((f) => {
    const len = Math.min(MAX_SHADOW_M, f.height / tanAlt)
    const moved = f.ring.map(([x, y]) => [x + ux * len, y + uy * len] as P)
    const ring = convexHull([...f.ring, ...moved])
    return { ring, bbox: bboxOf(ring) }
  })
}

function inRing([x, y]: P, ring: P[]) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

export function inShadow(p: P, shadows: Shadow[]) {
  for (const s of shadows) {
    const [x0, y0, x1, y1] = s.bbox
    if (p[0] < x0 || p[0] > x1 || p[1] < y0 || p[1] > y1) continue
    if (inRing(p, s.ring)) return true
  }
  return false
}

export function metres(a: P, b: P) {
  return Math.hypot((b[0] - a[0]) * M_PER_DEG_LNG, (b[1] - a[1]) * M_PER_DEG_LAT)
}

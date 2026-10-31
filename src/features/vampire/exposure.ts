// Which parts of the walking graph are in the sun for a 15 minute slot, plus the shadow shapes to draw.
// Heavy (~1,200 footprints), so the browser runs it in exposure.worker.ts; Node tests call it directly.
import type { Footprint } from './campus'
import { graph } from './graph'
import { castShadows, inShadow, sunAt, type Sun } from './shadows'

export const SLOT_MS = 900_000

/** 15 minute slots, shadows barely move inside one. */
export const slotOf = (at: Date) => Math.floor(at.getTime() / SLOT_MS)

export interface ExposureData {
  slot: number
  sun: Sun
  /** Per graph edge (by index), per sample: true when that point is in direct sun. */
  sunny: Uint8Array[]
  /** Shadow rings as flat [lat, lng, lat, lng, …] with ring start offsets. Flat so the worker can transfer it. */
  shadowCoords: Float64Array
  shadowOffsets: Uint32Array
}

export function computeExposure(footprints: Footprint[], slot: number): ExposureData {
  const sun = sunAt(new Date(slot * SLOT_MS + SLOT_MS / 2))
  const shadows = castShadows(footprints, sun)
  const sunny = graph.map((edge) =>
    Uint8Array.from(edge.samples, (s) => (!edge.indoor && sun.altitude > 0 && !inShadow(s.p, shadows) ? 1 : 0)),
  )

  const offsets = new Uint32Array(shadows.length + 1)
  let total = 0
  shadows.forEach((s, i) => {
    offsets[i] = total
    total += s.ring.length * 2
  })
  offsets[shadows.length] = total
  const coords = new Float64Array(total)
  let k = 0
  for (const s of shadows)
    for (const [lng, lat] of s.ring) {
      coords[k++] = lat
      coords[k++] = lng
    }
  return { slot, sun, sunny, shadowCoords: coords, shadowOffsets: offsets }
}

const ringsCache = new WeakMap<ExposureData, [number, number][][]>()

/** Shadow rings in Leaflet's [lat, lng] order. Built once per slot and reused, so React sees a stable array. */
export function shadowRings(data: ExposureData): [number, number][][] {
  let rings = ringsCache.get(data)
  if (rings) return rings
  rings = []
  const { shadowCoords: c, shadowOffsets: o } = data
  for (let i = 0; i < o.length - 1; i++) {
    const ring: [number, number][] = []
    for (let j = o[i]; j < o[i + 1]; j += 2) ring.push([c[j], c[j + 1]])
    rings.push(ring)
  }
  ringsCache.set(data, rings)
  return rings
}

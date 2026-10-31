// Vampire sun-safe routing. Logic only, so Zombie mode can import it without UI (AGENTS.md section 12).
import { getTimes } from 'suncalc'
import type { RouteResult } from '../../shared/types'
import { buildingByCode, CAMPUS } from './campus'
import { computeExposure, shadowRings, slotOf, type ExposureData } from './exposure'
import type { ToWorker } from './exposure.worker'
import { adjacency, type Edge, type P } from './graph'
import { loadMassing, type Sun } from './shadows'

export type RouteMode = 'shadiest' | 'fastest'

/** A stretch of the route with uniform exposure, for drawing. */
export interface RoutePiece {
  coords: P[]
  kind: 'indoor' | 'shade' | 'sun'
}

export interface RoutePlan {
  result: RouteResult
  pieces: RoutePiece[]
  sun: Sun
  /** Shadow rings in Leaflet [lat, lng] order. Same array for every plan in a time slot. */
  shadows: [number, number][][]
}

const WALK_M_PER_MIN = 80
const PENALTY = { shadiest: 8, minimizeWalking: 0.5, fastest: 0 }

const ready = new Map<number, ExposureData>()
const pending = new Map<number, { promise: Promise<ExposureData>; resolve: (d: ExposureData) => void }>()

let worker: Worker | null | undefined
function getWorker() {
  if (worker === undefined) {
    worker = typeof Worker === 'undefined' ? null : new Worker(new URL('./exposure.worker.ts', import.meta.url), { type: 'module' })
    worker?.addEventListener('message', (e: MessageEvent<ExposureData>) => {
      ready.set(e.data.slot, e.data)
      pending.get(e.data.slot)?.resolve(e.data)
      pending.delete(e.data.slot)
    })
  }
  return worker
}

function request(slot: number): Promise<ExposureData> {
  const hit = ready.get(slot)
  if (hit) return Promise.resolve(hit)
  let entry = pending.get(slot)
  if (!entry) {
    let resolve!: (d: ExposureData) => void
    const promise = new Promise<ExposureData>((r) => (resolve = r))
    pending.set(slot, (entry = { promise, resolve }))
  }
  return entry.promise
}

/** Shadows and per-edge sun for a 15 minute slot, computed in a worker so the page never stalls. */
function exposureAt(at: Date): Promise<ExposureData> {
  const slot = slotOf(at)
  if (ready.has(slot)) return Promise.resolve(ready.get(slot)!)
  const w = getWorker()
  if (!w) {
    // No workers (Node tests): compute inline.
    return loadMassing().then((fp) => {
      const data = computeExposure(fp, slot)
      ready.set(slot, data)
      return data
    })
  }
  const promise = request(slot)
  w.postMessage({ type: 'want', slot } satisfies ToWorker)
  return promise
}

/** Warm every slot of a day in the background so dragging the time slider hits the cache. */
export function prefetchDay(day: Date, fromHour = 6, toHour = 20) {
  const w = getWorker()
  if (!w) return
  const start = new Date(day)
  start.setHours(fromHour, 0, 0, 0)
  const slots: number[] = []
  for (let t = start.getTime(); t <= start.getTime() + (toHour - fromHour) * 3_600_000; t += 900_000) {
    const slot = slotOf(new Date(t))
    if (!ready.has(slot) && !pending.has(slot)) {
      request(slot)
      slots.push(slot)
    }
  }
  if (slots.length) w.postMessage({ type: 'prefetch', slots } satisfies ToWorker)
}

function sunMetres(edge: Edge, flags: Uint8Array) {
  let m = 0
  edge.samples.forEach((s, i) => flags[i] && (m += s.d))
  return m
}

function dijkstra(from: string, to: string, cost: (e: Edge) => number) {
  const dist = new Map<string, number>([[from, 0]])
  const prev = new Map<string, { node: string; edge: Edge; forward: boolean }>()
  const open = new Set([from])
  while (open.size) {
    let cur = ''
    let best = Infinity
    for (const n of open) {
      const d = dist.get(n) ?? Infinity
      if (d < best) [best, cur] = [d, n]
    }
    open.delete(cur)
    if (cur === to) break
    for (const { edge, to: next, forward } of adjacency.get(cur) ?? []) {
      const nd = best + cost(edge)
      if (nd < (dist.get(next) ?? Infinity)) {
        dist.set(next, nd)
        prev.set(next, { node: cur, edge, forward })
        open.add(next)
      }
    }
  }
  const hops: { edge: Edge; forward: boolean }[] = []
  for (let n = to; n !== from; ) {
    const step = prev.get(n)
    if (!step) return null
    hops.unshift({ edge: step.edge, forward: step.forward })
    n = step.node
  }
  return hops
}

function describe(m: number, sunM: number, indoor: boolean) {
  const dist = `${Math.max(10, Math.round(m / 10) * 10)} m`
  if (indoor) return `${dist}, indoors`
  const share = m ? sunM / m : 0
  if (share < 0.1) return `${dist}, in shade`
  if (share > 0.7) return `${dist}, full sun`
  return `${dist}, ${Math.round(share * 100)}% sun`
}

export async function planRoute(
  from: string,
  to: string,
  at: Date,
  opts?: { minimizeWalking?: boolean; avoidSun?: boolean },
): Promise<RoutePlan> {
  const start = buildingByCode[from]
  const end = buildingByCode[to]
  if (!start || !end) throw new Error(`Unknown building ${!start ? from : to}`)

  const exposure = await exposureAt(at)
  const { sun, sunny } = exposure
  const penalty = opts?.avoidSun === false ? PENALTY.fastest : opts?.minimizeWalking ? PENALTY.minimizeWalking : PENALTY.shadiest
  const hops = dijkstra(start.node, end.node, (e) => e.length + penalty * sunMetres(e, sunny[e.index])) ?? []

  const path: P[] = []
  const pieces: RoutePiece[] = []
  const steps: string[] = [`Leave ${start.name}`]
  let total = 0
  let sunTotal = 0
  let indoorTotal = 0
  let group: { label: string; m: number; sunM: number; indoor: boolean } | null = null
  const flush = () => group && steps.push(`${group.label} · ${describe(group.m, group.sunM, group.indoor)}`)

  for (const { edge, forward } of hops) {
    const flags = sunny[edge.index]
    const samples = forward ? edge.samples : [...edge.samples].reverse()
    const sflags = forward ? flags : [...flags].reverse()
    const coords = forward ? edge.coords : [...edge.coords].reverse()
    path.push(...(path.length ? coords.slice(1) : coords))

    const sunM = sunMetres(edge, flags)
    total += edge.length
    sunTotal += sunM
    if (edge.indoor) indoorTotal += edge.length

    samples.forEach((s, i) => {
      const kind: RoutePiece['kind'] = edge.indoor ? 'indoor' : sflags[i] ? 'sun' : 'shade'
      const last = pieces[pieces.length - 1]
      if (last && last.kind === kind) last.coords.push(s.p)
      else pieces.push({ kind, coords: last ? [last.coords[last.coords.length - 1], s.p] : [s.p] })
    })

    if (group && group.label === edge.label) {
      group.m += edge.length
      group.sunM += sunM
    } else {
      flush()
      group = { label: edge.label, m: edge.length, sunM, indoor: edge.indoor }
    }
  }
  flush()
  steps.push(`Arrive at ${end.name}`)

  return {
    sun,
    shadows: shadowRings(exposure),
    pieces,
    result: {
      path,
      distanceM: Math.round(total),
      durationMin: Math.max(1, Math.round(total / WALK_M_PER_MIN)),
      sunExposure: total ? sunTotal / total : 0,
      indoorFraction: total ? indoorTotal / total : 0,
      steps,
    },
  }
}

/** Contract from AGENTS.md section 5. */
export async function getRoute(
  from: string,
  to: string,
  at: Date,
  opts?: { minimizeWalking?: boolean; avoidSun?: boolean },
): Promise<RouteResult> {
  return (await planRoute(from, to, at, opts)).result
}

export function sunTimes(at: Date) {
  const t = getTimes(at, CAMPUS.lat, CAMPUS.lng)
  // Never null at Toronto's latitude, the fallbacks only satisfy the polar-day types.
  return { sunrise: t.sunrise ?? t.solarNoon, sunset: t.sunset ?? t.nadir }
}

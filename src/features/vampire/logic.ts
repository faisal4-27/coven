// Vampire sun-safe routing. Logic only, so Zombie mode can import it without UI (AGENTS.md section 12).
import { getTimes } from 'suncalc'
import type { RouteResult } from '../../shared/types'
import { buildingByCode, CAMPUS, edges, nodes, toLngLat } from './campus'
import { castShadows, inShadow, loadMassing, metres, sunAt, type Shadow, type Sun } from './shadows'

type P = [number, number]

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
  shadows: Shadow[]
}

const SAMPLE_M = 3
const WALK_M_PER_MIN = 80
const PENALTY = { shadiest: 8, minimizeWalking: 0.5, fastest: 0 }

interface Sample {
  p: P
  /** Metres from the previous sample. */
  d: number
}

interface Edge {
  a: string
  b: string
  coords: P[]
  samples: Sample[]
  length: number
  indoor: boolean
  label: string
}

const graph: Edge[] = edges.map((e) => {
  const coords = [nodes[e.a], ...(e.via ?? []), nodes[e.b]].map(([u, v]) => toLngLat(u, v))
  const samples: Sample[] = [{ p: coords[0], d: 0 }]
  let length = 0
  for (let i = 1; i < coords.length; i++) {
    const [a, b] = [coords[i - 1], coords[i]]
    const seg = metres(a, b)
    const n = Math.max(1, Math.round(seg / SAMPLE_M))
    for (let k = 1; k <= n; k++) {
      const t = k / n
      samples.push({ p: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], d: seg / n })
    }
    length += seg
  }
  return { a: e.a, b: e.b, coords, samples, length, indoor: Boolean(e.indoor), label: e.label }
})

const adjacency = new Map<string, { edge: Edge; to: string; forward: boolean }[]>()
for (const edge of graph) {
  for (const [from, to, forward] of [[edge.a, edge.b, true], [edge.b, edge.a, false]] as const) {
    adjacency.set(from, [...(adjacency.get(from) ?? []), { edge, to, forward }])
  }
}

/** 15 minute buckets, shadows barely move inside one. */
const bucket = (at: Date) => Math.floor(at.getTime() / 900_000)
const shadowCache = new Map<number, { sun: Sun; shadows: Shadow[]; sunny: Map<Edge, boolean[]> }>()

async function exposureAt(at: Date) {
  const key = bucket(at)
  const hit = shadowCache.get(key)
  if (hit) return hit
  const footprints = await loadMassing()
  const sun = sunAt(new Date(key * 900_000 + 450_000))
  const shadows = castShadows(footprints, sun)
  const sunny = new Map<Edge, boolean[]>()
  for (const edge of graph) {
    sunny.set(edge, edge.samples.map((s) => !edge.indoor && sun.altitude > 0 && !inShadow(s.p, shadows)))
  }
  const out = { sun, shadows, sunny }
  if (shadowCache.size > 200) shadowCache.clear()
  shadowCache.set(key, out)
  return out
}

function sunMetres(edge: Edge, flags: boolean[]) {
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

  const { sun, shadows, sunny } = await exposureAt(at)
  const penalty = opts?.avoidSun === false ? PENALTY.fastest : opts?.minimizeWalking ? PENALTY.minimizeWalking : PENALTY.shadiest
  const hops = dijkstra(start.node, end.node, (e) => e.length + penalty * sunMetres(e, sunny.get(e)!)) ?? []

  const path: P[] = []
  const pieces: RoutePiece[] = []
  const steps: string[] = [`Leave ${start.name}`]
  let total = 0
  let sunTotal = 0
  let indoorTotal = 0
  let group: { label: string; m: number; sunM: number; indoor: boolean } | null = null
  const flush = () => group && steps.push(`${group.label} · ${describe(group.m, group.sunM, group.indoor)}`)

  for (const { edge, forward } of hops) {
    const flags = sunny.get(edge)!
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
    shadows,
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

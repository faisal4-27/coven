// The walking graph, sampled every few metres so sun exposure can be measured along each edge.
// Pure data, shared by the main thread (routing) and the exposure worker (shadow tests).
import { edges, nodes, toLngLat } from './campus'
import { metres } from './shadows'

export type P = [number, number]

const SAMPLE_M = 3

export interface Sample {
  p: P
  /** Metres from the previous sample. */
  d: number
}

export interface Edge {
  index: number
  a: string
  b: string
  coords: P[]
  samples: Sample[]
  length: number
  indoor: boolean
  label: string
}

export const graph: Edge[] = edges.map((e, index) => {
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
  return { index, a: e.a, b: e.b, coords, samples, length, indoor: Boolean(e.indoor), label: e.label }
})

export const adjacency = new Map<string, { edge: Edge; to: string; forward: boolean }[]>()
for (const edge of graph) {
  for (const [from, to, forward] of [[edge.a, edge.b, true], [edge.b, edge.a, false]] as const) {
    adjacency.set(from, [...(adjacency.get(from) ?? []), { edge, to, forward }])
  }
}

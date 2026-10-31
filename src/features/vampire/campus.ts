// Hand-built St. George walking graph for the demo buildings.
// Geometry is authored in a local street-aligned frame (metres): u runs "campus east" along College St,
// v runs "campus north" up St. George St. Toronto's grid is rotated about 16.7° west of true north.

export const CAMPUS = { lat: 43.6629, lng: -79.3957 }

const ORIGIN = { lat: 43.65914, lng: -79.39639 } // St. George St centreline just north of College (OSM)
const ROT = (16.7 * Math.PI) / 180
const M_PER_DEG_LAT = 111_320
const M_PER_DEG_LNG = 111_320 * Math.cos((ORIGIN.lat * Math.PI) / 180)

/** Local (u, v) metres → [lng, lat]. */
export function toLngLat(u: number, v: number): [number, number] {
  const east = u * Math.cos(ROT) - v * Math.sin(ROT)
  const north = u * Math.sin(ROT) + v * Math.cos(ROT)
  return [ORIGIN.lng + east / M_PER_DEG_LNG, ORIGIN.lat + north / M_PER_DEG_LAT]
}

export interface Building {
  code: string
  name: string
  /** Entrance node id in the graph. */
  node: string
}

export const buildings: Building[] = [
  { code: 'BA', name: 'Bahen Centre', node: 'BA' },
  { code: 'GB', name: 'Galbraith', node: 'GB' },
  { code: 'SF', name: 'Sandford Fleming', node: 'SF' },
  { code: 'MY', name: 'Myhal Centre', node: 'MY' },
  { code: 'MP', name: 'McLennan Physical Labs', node: 'MP' },
  { code: 'LM', name: 'Lash Miller', node: 'LM' },
  { code: 'SS', name: 'Sidney Smith', node: 'SS' },
  { code: 'RL', name: 'Robarts Library', node: 'RL' },
  { code: 'UC', name: 'University College', node: 'UC' },
]

export const buildingByCode = Object.fromEntries(buildings.map((b) => [b.code, b]))

type UV = [number, number]

// Calibrated against OSM: St. George centreline is u = 0, building faces sit at u = ±17, Hoskin/Harbord is v = 574.
export const nodes: Record<string, UV> = {
  // St. George St, west sidewalk
  W0: [-12, -40], W1: [-12, 80], W2: [-12, 190], W3: [-12, 285], W4: [-12, 400], W5: [-12, 566], W6: [-12, 620],
  // St. George St, east sidewalk
  E0: [12, -40], E1: [12, 50], E2: [12, 190], E3: [12, 250], E4: [12, 400], E5: [12, 566], E6: [12, 620],
  // College St north sidewalk, King's College Rd, King's College Circle
  C1: [100, -42], K0: [176, -48], K1: [176, 90], K2: [176, 134], K3: [144, 179], K4: [106, 290],
  // Building entrances
  BA: [-18, 80], MP: [-78, 200], LM: [-18, 285], SS: [-18, 400], RL: [-16, 620],
  GB: [18, 50], MY: [18, 182], SF: [198, 90], UC: [150, 333],
}
export interface EdgeDef {
  a: string
  b: string
  /** Intermediate points, local frame. */
  via?: UV[]
  indoor?: boolean
  label: string
  /** Hand-mapped indoor edges are placeholders until indoor-graph.json lands (AGENTS.md 6.3). */
  verified?: boolean
}

const sidewalk = (ids: string[], label: string): EdgeDef[] =>
  ids.slice(1).map((id, i) => ({ a: ids[i], b: id, label }))

export const edges: EdgeDef[] = [
  ...sidewalk(['W0', 'W1', 'W2', 'W3', 'W4', 'W5', 'W6'], 'St. George St, west side'),
  ...sidewalk(['E0', 'E1', 'E2', 'E3', 'E4', 'E5', 'E6'], 'St. George St, east side'),
  { a: 'W0', b: 'E0', label: 'Cross St. George at College' },
  { a: 'W2', b: 'E2', label: 'Cross St. George by Myhal' },
  { a: 'W4', b: 'E4', label: 'Cross St. George at the Sid Smith crosswalk' },
  { a: 'W5', b: 'E5', label: 'Cross St. George at Harbord' },
  ...sidewalk(['E0', 'C1', 'K0'], 'College St, north side'),
  ...sidewalk(['K0', 'K1', 'K2'], "King's College Rd"),
  { a: 'K2', b: 'K3', label: "King's College Circle" },
  { a: 'K3', b: 'K4', via: [[110, 230]], label: "King's College Circle" },
  { a: 'K4', b: 'UC', via: [[120, 325]], label: "King's College Circle" },
  { a: 'E3', b: 'K4', via: [[70, 262]], label: 'Path to the Circle' },
  { a: 'E4', b: 'UC', via: [[60, 410], [100, 350]], label: 'Path behind UC' },
  // Doors
  { a: 'BA', b: 'W1', label: 'Bahen front doors' },
  { a: 'MP', b: 'W2', via: [[-40, 192]], label: 'Courtyard to McLennan' },
  { a: 'LM', b: 'W3', label: 'Lash Miller doors' },
  { a: 'SS', b: 'W4', label: 'Sid Smith doors' },
  { a: 'RL', b: 'W6', label: 'Robarts ramp' },
  { a: 'GB', b: 'E1', label: 'Galbraith doors' },
  { a: 'MY', b: 'E2', label: 'Myhal doors' },
  { a: 'SF', b: 'K1', label: 'Sandford Fleming doors' },
  // Indoor connections. Only GB to SF is confirmed so far; the rest wait on indoor-graph.json.
  { a: 'GB', b: 'SF', via: [[90, 60], [176, 70]], indoor: true, label: 'Galbraith to Sandford Fleming, inside', verified: true },
  { a: 'GB', b: 'MY', via: [[40, 100], [40, 170]], indoor: true, label: 'Galbraith to Myhal, inside' },
  { a: 'BA', b: 'MP', via: [[-60, 120], [-80, 170]], indoor: true, label: 'Bahen to McLennan, inside' },
  { a: 'MP', b: 'LM', via: [[-100, 250]], indoor: true, label: 'McLennan to Lash Miller, inside' },
]

export interface Footprint {
  name: string
  height: number
  /** Ring in [lng, lat]. */
  ring: [number, number][]
}

const rect = (name: string, u0: number, v0: number, u1: number, v1: number, height: number): Footprint => ({
  name,
  height,
  ring: [toLngLat(u0, v0), toLngLat(u1, v0), toLngLat(u1, v1), toLngLat(u0, v1), toLngLat(u0, v0)],
})

/** Buildings the LiDAR massing under-represents (Site Plan records with no height). Always added on top. */
export const massingOverrides: Footprint[] = [
  rect('Bahen Centre', -112, 26, -17, 138, 32),
  rect('Myhal Centre', 18, 154, 63, 199, 36),
]

/** Fallback massing when public/data/massing-stgeorge.geojson is missing. Outlines from OSM, heights estimated. */
export const fallbackFootprints: Footprint[] = [
  ...massingOverrides,
  rect('McLennan Physical Labs', -133, 168, -78, 276, 60),
  rect('Lash Miller', -132, 231, -17, 338, 24),
  rect('Sidney Smith', -125, 358, -18, 449, 24),
  rect('Ramsay Wright', -130, 466, -22, 538, 24),
  rect('Robarts Library', -130, 590, -15, 689, 50),
  rect('Galbraith', 18, 0, 150, 100, 25),
  rect('Wallberg', 18, -39, 163, 4, 18),
  rect('Sandford Fleming', 200, 10, 280, 140, 30),
  rect('University College', 99, 333, 226, 437, 25),
]

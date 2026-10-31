// Walking path shapes for the map. Bundled paths come from scripts/zombie-build-routes.js,
// pairs it doesn't know (buildings found through search) are fetched once from the same OSRM router.

import routesFile from '../data/routes.json';
import { pairKey } from './walking';

export type LatLng = [number, number];
interface Point { lat: number; lng: number }

const OSRM_URL = 'https://routing.openstreetmap.de/routed-foot/route/v1/foot';

const bundled = (routesFile as unknown as { pairs: Record<string, LatLng[]> }).pairs; // each path runs from the first id of the sorted key
const fetched = new Map<string, Promise<LatLng[] | null>>();

const orient = (aId: string, bId: string, path: LatLng[]) => (aId <= bId ? path : [...path].reverse());

/** Bundled walking path from a to b, or undefined if the pair isn't in routes.json. */
export function walkPath(aId: string, bId: string): LatLng[] | undefined {
  const path = bundled[pairKey(aId, bId)];
  return path && orient(aId, bId, path);
}

/** Live walking path for pairs that aren't bundled. Resolves null when offline so the map keeps its straight line. */
export function fetchWalkPath(a: Point & { id: string }, b: Point & { id: string }): Promise<LatLng[] | null> {
  const key = pairKey(a.id, b.id);
  let hit = fetched.get(key);
  if (!hit) {
    const [first, second] = a.id <= b.id ? [a, b] : [b, a];
    hit = fetch(`${OSRM_URL}/${first.lng},${first.lat};${second.lng},${second.lat}?overview=full&geometries=geojson`)
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { routes?: { geometry: { coordinates: [number, number][] } }[] } | null) => {
        const coords = body?.routes?.[0]?.geometry.coordinates;
        if (!coords) return null;
        return [[first.lat, first.lng] as LatLng, ...coords.map(([lng, lat]): LatLng => [lat, lng]), [second.lat, second.lng] as LatLng];
      })
      .catch(() => null);
    fetched.set(key, hit);
    hit.then((p) => p ?? fetched.delete(key)); // let a failed pair retry next time
  }
  return hit.then((p) => p && orient(a.id, b.id, p));
}

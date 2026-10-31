// Live building search via OpenStreetMap's Nominatim, plus instant matches from the bundled list.
// Nominatim rules: max 1 request per second and no search-as-you-type, so only call this on an explicit search.

import type { Building } from '../planner/types';

export interface Bounds { south: number; west: number; north: number; east: number }

interface NominatimHit {
  osm_type: 'node' | 'way' | 'relation';
  osm_id: number;
  lat: string;
  lon: string;
  name?: string;
  display_name: string;
  category?: string; // e.g. "building", "amenity", "highway"
}

const SKIP_CATEGORIES = new Set(['highway', 'railway', 'boundary', 'place']); // streets and neighbourhoods aren't places you have class in

const ENDPOINT = 'https://nominatim.openstreetmap.org/search';
const MIN_GAP_MS = 1100; // a little over 1 s so we never trip the rate limit
const cache = new Map<string, Building[]>(); // same query twice in a session shouldn't hit the network again
let lastCallAt = 0;

const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

// Instant, offline matches against buildings we already have.
export function matchKnown(query: string, known: Building[], limit = 6): Building[] {
  const q = normalize(query);
  if (!q) return [];
  return known.filter((b) => normalize(b.name).includes(q)).slice(0, limit);
}

export async function searchBuildings(query: string, bounds: Bounds, signal?: AbortSignal): Promise<Building[]> {
  const q = normalize(query);
  if (q.length < 2) return []; // one letter matches half of Toronto
  const hit = cache.get(q);
  if (hit) return hit;

  const wait = lastCallAt + MIN_GAP_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait)); // space out rapid clicks
  lastCallAt = Date.now();

  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    limit: '8',
    bounded: '1', // only return things inside the viewbox, so "Hart House" isn't a house in Ohio
    viewbox: `${bounds.west},${bounds.north},${bounds.east},${bounds.south}`, // Nominatim wants left,top,right,bottom
  });
  const res = await fetch(`${ENDPOINT}?${params}`, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(res.status === 429 ? 'Too many searches, wait a few seconds' : `Search failed (${res.status})`);
  const hits = (await res.json()) as NominatimHit[];

  const seen = new Set<string>();
  const results: Building[] = [];
  for (const h of hits) {
    const id = `osm-${h.osm_type[0]}${h.osm_id}`; // same id scheme as the bundled data, so duplicates line up
    if (seen.has(id) || SKIP_CATEGORIES.has(h.category ?? '')) continue;
    seen.add(id);
    results.push({ id, name: h.name || h.display_name.split(',')[0], lat: Number(h.lat), lng: Number(h.lon), source: 'search' }); // display_name starts with the place name
  }
  cache.set(q, results);
  return results;
}

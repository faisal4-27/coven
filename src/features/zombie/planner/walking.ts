// Walking distance lookup with a labelled straight-line fallback.

import type { DistanceEntry, Walker, ZombieData } from './types';

const DETOUR_FACTOR = 1.3; // same padding as scripts/zombie-build-distances.js so both agree
const WALK_METERS_PER_MIN = 80; // about 4.8 km/h, also matches the script

export const pairKey = (a: string, b: string): string => [a, b].sort().join('|'); // sorted so A|B and B|A hit the same entry

interface Point { lat: number; lng: number }

export function haversineMeters(a: Point, b: Point): number {
  const R = 6371000; // Earth radius in metres
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function makeWalker(data: ZombieData): Walker {
  const places = new Map<string, Point>([...data.buildings, ...data.coffeeShops].map((p) => [p.id, p])); // one lookup for buildings and shops
  return (aId, bId): DistanceEntry => {
    if (aId === bId) return { meters: 0, minutes: 0, source: 'ors' }; // same place, nothing to walk
    const known = data.distances.pairs[pairKey(aId, bId)];
    if (known) return known; // prefer the table, real or estimated
    const a = places.get(aId);
    const b = places.get(bId);
    if (!a || !b) throw new Error(`No place called "${!a ? aId : bId}" in the data`);
    const meters = Math.round(haversineMeters(a, b) * DETOUR_FACTOR);
    return { meters, minutes: Math.max(1, Math.round(meters / WALK_METERS_PER_MIN)), source: 'estimate' }; // at least 1 min so nothing looks instant
  };
}

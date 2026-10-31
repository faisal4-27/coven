// Maps UofT room codes ("BA", "SS") to buildings the planner can route between. Works offline.

import { buildings as vampireBuildings, nodes, toLngLat } from '../../vampire/campus';
import uoftFile from '../data/uoftBuildings.json';
import { haversineMeters } from '../planner/walking';
import type { Building } from '../planner/types';

export interface UoftBuilding {
  code: string;
  name: string;
  lat: number;
  lng: number;
}

// Every St. George building with the code ACORN prints on timetables, from scripts/zombie-uoft-buildings.js.
export const UOFT_BUILDINGS: UoftBuilding[] = uoftFile.items;
export const UOFT_CODES: Record<string, string> = Object.fromEntries(UOFT_BUILDINGS.map((b) => [b.code, b.name]));

// Buildings with lecture halls, labs or tutorial rooms. OCR'd rooms only snap to these, so a misread
// "an 200" stays unplaced for the student to fix instead of landing in a residence or a church.
export const TEACHING_CODES = [
  'AB', 'AH', 'AP', 'BA', 'BC', 'BF', 'BL', 'BN', 'BR', 'BT', 'CR', 'DN', 'EJ', 'EM', 'ES', 'GB', 'HA', 'HS', 'IN', 'JH',
  'KP', 'KX', 'LA', 'LI', 'LM', 'LW', 'MB', 'MC', 'MP', 'MS', 'MY', 'NF', 'NL', 'OI', 'PB', 'RS', 'RT', 'RW', 'SF', 'SK',
  'SS', 'TC', 'UC', 'VC', 'WB', 'WE', 'WI', 'WW', 'WY',
].filter((c) => c in UOFT_CODES);

const SAME_BUILDING_M = 80; // a bundled entry this close to the campus point is the same building
const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

/** A campus building as something the planner can route to. */
export function campusBuilding(b: UoftBuilding): Building {
  return { id: `uoft-${b.code}`, name: `${b.name} (${b.code})`, lat: b.lat, lng: b.lng };
}

/** Bundled buildings first (they have real walking distances), then Vampire's hand-placed entrances, then the campus list. */
export function resolveBuilding(code: string, known: Building[]): Building | null {
  const b = UOFT_BUILDINGS.find((u) => u.code === code);
  if (!b) return null;
  const bundled = known.find((k) => k.source === 'bundled' && haversineMeters(k, b) < SAME_BUILDING_M);
  if (bundled) return bundled;
  const campus = vampireBuildings.find((v) => v.code === code);
  if (campus) {
    const [lng, lat] = toLngLat(...nodes[campus.node]);
    return { ...campusBuilding(b), lat, lng };
  }
  return campusBuilding(b);
}

export function resolveAll(codes: string[], known: Building[]): Map<string, Building> {
  const out = new Map<string, Building>();
  for (const code of new Set(codes)) {
    const b = resolveBuilding(code, known);
    if (b) out.set(code, b);
  }
  return out;
}

/** Campus buildings matching a typed code ("NL") or part of a name ("naylor"), exact code first. */
export function matchCampus(query: string, known: Building[], limit = 8): Building[] {
  const q = normalize(query);
  if (!q) return [];
  const hits = UOFT_BUILDINGS.filter((b) => b.code.toLowerCase() === q || normalize(b.name).includes(q))
    .sort((a, b) => Number(b.code.toLowerCase() === q) - Number(a.code.toLowerCase() === q))
    .slice(0, limit);
  return hits.map((b) => resolveBuilding(b.code, known) ?? campusBuilding(b));
}

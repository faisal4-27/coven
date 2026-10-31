// Fetches real walking paths between every building and shop from the public OSRM foot router (no key needed).
// Writes src/features/zombie/data/routes.json (path shapes for the map) and distances.json (real metres for the planner).
// Usage: node scripts/zombie-build-routes.js

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..'); // repo root, one level up from scripts/
const dataDir = join(root, 'src', 'features', 'zombie', 'data');
const OSRM_URL = 'https://routing.openstreetmap.de/routed-foot/route/v1/foot'; // FOSSGIS public server, foot profile
const DETOUR_FACTOR = 1.3; // same fallback as walking.ts when a pair can't be routed
const WALK_METERS_PER_MIN = 80; // same pace as walking.ts
const DELAY_MS = 1100; // the public server asks for at most one request per second

const loadItems = (file) => JSON.parse(readFileSync(join(dataDir, file), 'utf8')).items;
const pairKey = (idA, idB) => [idA, idB].sort().join('|');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const round5 = (n) => Math.round(n * 1e5) / 1e5; // about 1 m, keeps the file small

function haversineMeters(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const minutesFor = (meters) => Math.max(1, Math.round(meters / WALK_METERS_PER_MIN));

async function fetchRoute(a, b) {
  const url = `${OSRM_URL}/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson`;
  const res = await fetch(url, { headers: { 'User-Agent': 'coven-uoft-hackathon/0.1' } });
  if (!res.ok) throw new Error(`OSRM returned ${res.status}`);
  const body = await res.json();
  const route = body.routes?.[0];
  if (body.code !== 'Ok' || !route) throw new Error(`OSRM could not route (${body.code})`);
  // OSRM starts and ends on the nearest path, so add the pins themselves to close the gap.
  const path = [[a.lat, a.lng], ...route.geometry.coordinates.map(([lng, lat]) => [lat, lng]), [b.lat, b.lng]].map(([lat, lng]) => [round5(lat), round5(lng)]);
  return { meters: Math.round(route.distance), path };
}

async function main() {
  const places = [...loadItems('buildings.json'), ...loadItems('coffeeShops.json')];
  if (places.some((p) => p.todo)) throw new Error('Some places are still TODO_REPLACE_WITH_REAL, fix their coordinates first.');
  const routes = {};
  const distances = {};
  let failed = 0;
  const total = (places.length * (places.length - 1)) / 2;
  let done = 0;

  for (let i = 0; i < places.length; i++) {
    for (let j = i + 1; j < places.length; j++) {
      const [a, b] = [places[i], places[j]].sort((x, y) => (x.id < y.id ? -1 : 1)); // path runs from the first id in the sorted key
      const key = pairKey(a.id, b.id);
      try {
        const { meters, path } = await fetchRoute(a, b);
        routes[key] = path;
        distances[key] = { meters, minutes: minutesFor(meters), source: 'osrm' };
      } catch (err) {
        failed++;
        const meters = Math.round(haversineMeters(a, b) * DETOUR_FACTOR);
        distances[key] = { meters, minutes: minutesFor(meters), source: 'estimate' };
        console.warn(`  ${a.name} to ${b.name}: ${err.message}, keeping an estimate`);
      }
      done++;
      if (done % 25 === 0) console.log(`${done}/${total} pairs`);
      await sleep(DELAY_MS);
    }
  }

  const generatedAt = new Date().toISOString();
  writeFileSync(join(dataDir, 'routes.json'), JSON.stringify({ generatedAt, source: 'osrm', pairs: routes }) + '\n');
  writeFileSync(join(dataDir, 'distances.json'), JSON.stringify({ generatedAt, source: failed ? 'mixed' : 'osrm', pairs: distances }, null, 2) + '\n');
  console.log(`Wrote ${Object.keys(routes).length} paths, ${failed} pairs fell back to estimates.`);
}

main().catch((err) => { console.error(err.message); process.exit(1); });

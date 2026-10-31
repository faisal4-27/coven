// Fills src/features/zombie/data/distances.json with walking distances between every building and shop.
// Usage: node scripts/zombie-build-distances.js            (uses ORS if ORS_KEY is set, else estimates)
//        node scripts/zombie-build-distances.js --estimate (skip the API on purpose)

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..'); // repo root, one level up from scripts/
const dataDir = join(root, 'src', 'features', 'zombie', 'data'); // where all zombie data lives
const outFile = join(dataDir, 'distances.json');

const DETOUR_FACTOR = 1.3; // streets aren't straight lines, so pad the crow-flies distance by 30%
const WALK_METERS_PER_MIN = 80; // about 4.8 km/h, a relaxed walking pace
const ORS_URL = 'https://api.openrouteservice.org/v2/matrix/foot-walking'; // one call returns the full matrix

// Read KEY=value lines from a dotenv-style file, since we can't add the dotenv package.
function readEnvFile(path) {
  if (!existsSync(path)) return {}; // missing file just means no keys from it
  const out = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); // skip comments and blank lines by only matching KEY=value
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, ''); // strip optional quotes around the value
  }
  return out;
}

// Real shell env wins, then .env.local (already gitignored by *.local), then .env.
function getOrsKey() {
  return process.env.ORS_KEY || readEnvFile(join(root, '.env.local')).ORS_KEY || readEnvFile(join(root, '.env')).ORS_KEY || '';
}

const loadItems = (file) => JSON.parse(readFileSync(join(dataDir, file), 'utf8')).items; // data files wrap entries in "items"

// Great-circle distance in metres, good enough at campus scale.
function haversineMeters(a, b) {
  const R = 6371000; // Earth radius in metres
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const pairKey = (idA, idB) => [idA, idB].sort().join('|'); // sorted so A|B and B|A are the same entry

// Straight line x 1.3, clearly labelled so the UI can say it's a guess.
function estimateEntry(a, b) {
  const meters = Math.round(haversineMeters(a, b) * DETOUR_FACTOR);
  return { meters, minutes: Math.max(1, Math.round(meters / WALK_METERS_PER_MIN)), source: 'estimate' }; // at least 1 min so nothing looks instant
}

// Ask ORS for the full walking matrix in one request.
async function fetchOrsMatrix(places, key) {
  const res = await fetch(ORS_URL, {
    method: 'POST',
    headers: { Authorization: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ locations: places.map((p) => [p.lng, p.lat]), metrics: ['distance', 'duration'] }), // ORS wants [lng, lat]
  });
  if (!res.ok) throw new Error(`ORS returned ${res.status}: ${await res.text()}`); // surface the API message so bad keys are obvious
  return res.json(); // { distances: metres[][], durations: seconds[][] }
}

async function main() {
  const places = [...loadItems('buildings.json'), ...loadItems('coffeeShops.json')]; // shops need distances too for the coffee detour math
  const key = getOrsKey();
  const forceEstimate = process.argv.includes('--estimate');
  const placeholders = places.filter((p) => p.todo); // fake coordinates would give ORS nonsense routes
  const pairs = {};
  let source = 'estimate';

  if (!forceEstimate && key && placeholders.length === 0) {
    console.log(`Calling ORS for ${places.length} places...`);
    const { distances, durations } = await fetchOrsMatrix(places, key);
    for (let i = 0; i < places.length; i++) {
      for (let j = i + 1; j < places.length; j++) { // j > i so each pair is stored once
        const meters = distances?.[i]?.[j];
        if (meters == null) { pairs[pairKey(places[i].id, places[j].id)] = estimateEntry(places[i], places[j]); source = 'mixed'; continue; } // ORS couldn't route it, keep a labelled guess
        pairs[pairKey(places[i].id, places[j].id)] = { meters: Math.round(meters), minutes: Math.max(1, Math.round(durations[i][j] / 60)), source: 'ors' };
      }
    }
    if (source !== 'mixed') source = 'ors';
  } else {
    if (!key && !forceEstimate) console.log('No ORS_KEY found, writing straight-line x 1.3 estimates.');
    if (placeholders.length) console.log(`${placeholders.length} places are still TODO_REPLACE_WITH_REAL, writing estimates only.`);
    for (let i = 0; i < places.length; i++) {
      for (let j = i + 1; j < places.length; j++) pairs[pairKey(places[i].id, places[j].id)] = estimateEntry(places[i], places[j]);
    }
  }

  const table = { generatedAt: new Date().toISOString(), source, pairs };
  writeFileSync(outFile, JSON.stringify(table, null, 2) + '\n'); // trailing newline keeps git diffs clean
  console.log(`Wrote ${Object.keys(pairs).length} pairs (${source}) to ${outFile}`);
}

main().catch((err) => { console.error(err.message); process.exit(1); }); // non-zero exit so a failed run is obvious

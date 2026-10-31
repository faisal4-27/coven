// Looks up real coordinates for the bundled demo buildings and campus cafes on OpenStreetMap (Nominatim),
// then writes src/features/zombie/data/buildings.json and coffeeShops.json.
// Usage: node scripts/zombie-build-places.js

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(root, 'src', 'features', 'zombie', 'data');

const CAMPUS = { south: 43.6585, west: -79.4020, north: 43.6680, east: -79.3890 }; // core St. George, Spadina to Queen's Park, College to Bloor
const DEMO_BUILDINGS = ['Bahen Centre', 'Robarts Library', 'Sidney Smith Hall', 'Myhal Centre', 'Gerstein', 'Medical Sciences Building', 'Hart House', 'Convocation Hall']; // search terms, edit freely
const CAFE_QUERIES = ['cafe', 'coffee', 'Starbucks', 'Tim Hortons', 'Second Cup']; // Nominatim caps results per query, so ask a few ways
const MAX_CAFES = 15; // enough choice for the planner without burying the map in orange squares
const ENDPOINT = 'https://nominatim.openstreetmap.org/search';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// One Nominatim call, paced at just over 1 per second as their usage policy asks.
async function search(q) {
  await sleep(1100);
  const params = new URLSearchParams({
    q,
    format: 'jsonv2',
    limit: '40', // Nominatim's maximum
    addressdetails: '1', // gives us the street, which tells apart the five Second Cups
    bounded: '1', // only inside the campus box
    viewbox: `${CAMPUS.west},${CAMPUS.north},${CAMPUS.east},${CAMPUS.south}`, // left,top,right,bottom
  });
  const res = await fetch(`${ENDPOINT}?${params}`, {
    headers: { 'User-Agent': 'coven-zombie-places/1.0 (hackathon project)' }, // Nominatim requires an identifying agent
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`Nominatim returned ${res.status} for "${q}"`);
  return res.json();
}

const osmId = (h) => `osm-${h.osm_type[0]}${h.osm_id}`; // e.g. osm-w12345, same scheme the app's live search uses
const round = (n) => Math.round(Number(n) * 1e6) / 1e6; // 6 decimals is ~10 cm, plenty
const distM = (a, b) => Math.hypot((b.lat - a.lat) * 111320, (b.lng - a.lng) * 111320 * Math.cos((a.lat * Math.PI) / 180)); // flat-earth metres, fine at campus scale

async function main() {
  const buildings = [];
  for (const q of DEMO_BUILDINGS) {
    const hits = await search(q);
    const hit = hits.find((h) => h.category === 'building' || h.type === 'university') ?? hits[0]; // prefer the actual building over a bus stop with the same name
    if (!hit) { console.warn(`  nothing found for "${q}", skipping`); continue; }
    buildings.push({ id: osmId(hit), name: hit.name || hit.display_name.split(',')[0], lat: round(hit.lat), lng: round(hit.lon) });
    console.log(`  ${q} -> ${hit.name} (${osmId(hit)})`);
  }

  const cafesById = new Map();
  for (const q of CAFE_QUERIES) {
    for (const h of await search(q)) {
      if (h.category === 'amenity' && h.type === 'cafe' && h.name) cafesById.set(osmId(h), h); // skip shops that just have "coffee" in the name
    }
  }
  const cafes = [...cafesById.values()]
    .map((h) => {
      const p = { lat: round(h.lat), lng: round(h.lon) };
      const near = buildings.reduce((best, b) => (!best || distM(p, b) < distM(p, best) ? b : best), null); // closest bundled building, for the "near X" label
      const street = h.address?.road ?? h.address?.pedestrian ?? h.address?.footway; // cafes inside buildings often only have a footway or pedestrian address
      return { id: osmId(h), name: h.name, ...(street ? { street } : {}), ...p, nearestBuildingId: near?.id ?? '', score: near ? distM(p, near) : Infinity };
    })
    .sort((a, b) => a.score - b.score || a.id.localeCompare(b.id)) // keep the cafes closest to the demo buildings
    .slice(0, MAX_CAFES)
    .map(({ score: _score, ...c }) => c); // drop the helper field before saving

  const note = 'Generated from OpenStreetMap (Nominatim) by scripts/zombie-build-places.js, © OpenStreetMap contributors. Re-run instead of hand-editing.';
  writeFileSync(join(dataDir, 'buildings.json'), JSON.stringify({ _note: note, items: buildings }, null, 2) + '\n');
  writeFileSync(join(dataDir, 'coffeeShops.json'), JSON.stringify({ _note: note, items: cafes }, null, 2) + '\n');
  console.log(`Wrote ${buildings.length} buildings and ${cafes.length} cafes.`);
  cafes.forEach((c) => console.log(`  cafe: ${c.name}${c.street ? `, ${c.street}` : ''}`));
}

main().catch((err) => { console.error(err.message); process.exit(1); });

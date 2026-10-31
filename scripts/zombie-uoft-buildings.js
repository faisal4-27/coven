// Writes every St. George building with its official UofT code (the "BA" in "BA 1160") to
// src/features/zombie/data/uoftBuildings.json, from the Cobalt UofT datasets.
// Usage: node scripts/zombie-uoft-buildings.js

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'src', 'features', 'zombie', 'data', 'uoftBuildings.json');
const SOURCE = 'https://raw.githubusercontent.com/cobalt-uoft/datasets/master/buildings.json';

// Cobalt was archived in 2020, so some codes have new names or moved on since.
const RENAMED = {
  CE: { code: 'MY', name: 'Myhal Centre' }, // listed as "under construction", ACORN uses MY
  RL: { name: 'Robarts Library' },
  SM: { name: 'Gerstein Science Information Centre' },
  AH: { name: 'Alumni Hall' },
  NL: { name: 'C. David Naylor Building' },
};
const res = await fetch(SOURCE);
if (!res.ok) throw new Error(`Cobalt download failed (${res.status})`);
const rows = (await res.text()).replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l)); // one JSON object per line

const byCode = new Map();
for (const b of rows) {
  if (b.campus !== 'UTSG' || !/^[A-Z0-9]{2}$/.test(b.code) || !b.lat || /demolished/i.test(b.name)) continue;
  const fix = RENAMED[b.code] ?? {};
  const code = fix.code ?? b.code;
  if (byCode.has(code)) continue; // a few codes repeat for annexes, the first is the main building
  const name = (fix.name ?? b.name).replace(/\s*\(Under Construction\)/i, '').trim();
  byCode.set(code, { code, name, lat: +b.lat.toFixed(6), lng: +b.lng.toFixed(6) });
}
const items = [...byCode.values()].sort((a, b) => a.name.localeCompare(b.name));
writeFileSync(out, `${JSON.stringify({ _note: `St. George buildings and their UofT codes, from ${SOURCE} plus fixes in scripts/zombie-uoft-buildings.js. Re-run instead of hand-editing.`, items }, null, 1)}\n`);
console.log(`wrote ${items.length} buildings to ${out}`);

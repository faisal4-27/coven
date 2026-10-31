// Downloads St. George streets, buildings and green space from OpenStreetMap once,
// then rasterizes them into a small pixel grid saved as src/features/zombie/data/basemap.json.
// Usage: node scripts/zombie-build-basemap.js [south west north east] [cols rows]

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outFile = join(root, 'src', 'features', 'zombie', 'data', 'basemap.json');

const args = process.argv.slice(2).map(Number);
const [south, west, north, east] = args.length >= 4 ? args : [43.6575, -79.4075, 43.6700, -79.3815]; // Bloor to College, Bathurst-ish to Bay, wide enough for a 3:2 projector map
const [cols, rows] = args.length >= 6 ? args.slice(4, 6) : [96, 64]; // 96x64 keeps the same 3:2 shape, about 22 m per cell
const OVERPASS_URLS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']; // public mirrors, tried in order when one is busy

const MAJOR = /^(motorway|trunk|primary|secondary|tertiary)(_link)?$/; // big streets like Bloor, College, St. George
const MINOR = /^(residential|unclassified|living_street|service)$/;
const PATH = /^(footway|pedestrian|path|steps)$/;
const PRIORITY = { '.': 0, g: 1, f: 2, b: 3, s: 4, r: 5 }; // later layers win, so a road crossing a park stays a road

const query = `[out:json][timeout:90];
(
  way["highway"](${south},${west},${north},${east});
  way["building"](${south},${west},${north},${east});
  relation["building"](${south},${west},${north},${east});
  way["leisure"~"^(park|garden|pitch)$"](${south},${west},${north},${east});
  way["landuse"~"^(grass|recreation_ground)$"](${south},${west},${north},${east});
);
out geom;`; // "out geom" returns coordinates inline so we don't need a second node lookup

const grid = Array.from({ length: rows }, () => Array(cols).fill('.'));
const toCell = ({ lat, lon }) => ({ x: ((lon - west) / (east - west)) * cols, y: ((north - lat) / (north - south)) * rows }); // fractional cell coords, north up

// Only overwrite a cell with something more important than what's there.
function paint(x, y, code) {
  if (x < 0 || y < 0 || x >= cols || y >= rows) return; // off the edge of the map
  if (PRIORITY[code] > PRIORITY[grid[y][x]]) grid[y][x] = code;
}

// Bresenham between two cells for streets and paths.
function paintLine(a, b, code) {
  let x0 = Math.floor(a.x), y0 = Math.floor(a.y);
  const x1 = Math.floor(b.x), y1 = Math.floor(b.y);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    paint(x0, y0, code);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

// Ray casting: is the point inside the polygon?
function inside(pt, poly) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > pt.y) !== (b.y > pt.y) && pt.x < ((b.x - a.x) * (pt.y - a.y)) / (b.y - a.y) + a.x) hit = !hit;
  }
  return hit;
}

// Fill every cell whose center is inside the polygon.
function paintPolygon(poly, code) {
  const xs = poly.map((p) => p.x), ys = poly.map((p) => p.y);
  const [minX, maxX, minY, maxY] = [Math.floor(Math.min(...xs)), Math.ceil(Math.max(...xs)), Math.floor(Math.min(...ys)), Math.ceil(Math.max(...ys))];
  let filled = 0;
  for (let y = Math.max(0, minY); y < Math.min(rows, maxY); y++) {
    for (let x = Math.max(0, minX); x < Math.min(cols, maxX); x++) {
      if (inside({ x: x + 0.5, y: y + 0.5 }, poly)) { paint(x, y, code); filled++; } // +0.5 tests the cell center, not its corner
    }
  }
  if (!filled) { // smaller than one cell, still give it a pixel so small buildings don't vanish
    const cx = xs.reduce((s, v) => s + v, 0) / xs.length, cy = ys.reduce((s, v) => s + v, 0) / ys.length;
    paint(Math.floor(cx), Math.floor(cy), code);
  }
}

const isClosed = (g) => g.length > 3 && g[0].lat === g.at(-1).lat && g[0].lon === g.at(-1).lon; // first node repeats at the end for areas

function classifyHighway(tags) {
  if (tags.indoor === 'yes' || (tags.tunnel && tags.tunnel !== 'no')) return null; // underground or indoor ways aren't on the street map
  if (tags.footway === 'sidewalk' || tags.footway === 'crossing') return null; // sidewalks would just make every road look double-wide
  if (tags.service && /parking_aisle|driveway/.test(tags.service)) return null; // parking lot clutter
  if (MAJOR.test(tags.highway)) return 'r';
  if (MINOR.test(tags.highway)) return 's';
  if (PATH.test(tags.highway)) return 'f';
  return null;
}

// Try each mirror a few times with growing waits, since public Overpass servers are often busy.
async function fetchOverpass() {
  let lastError = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    for (const url of OVERPASS_URLS) {
      console.log(`Asking ${new URL(url).host} for St. George...`);
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'coven-zombie-basemap/1.0' }, // Overpass asks for an identifying agent
          body: `data=${encodeURIComponent(query)}`,
          signal: AbortSignal.timeout(90000), // a mirror that never answers shouldn't hang the script forever
        });
        if (res.ok) return res.json();
        lastError = `${res.status} from ${url}`;
      } catch (err) {
        lastError = `${err.message} from ${url}`; // network hiccup, move on to the next mirror
      }
    }
    const waitMs = 5000 * 2 ** attempt; // 5 s, 10 s, 20 s
    console.log(`All mirrors busy (${lastError}), waiting ${waitMs / 1000}s...`);
    await new Promise((r) => setTimeout(r, waitMs));
  }
  throw new Error(`Overpass unavailable: ${lastError}`);
}

async function main() {
  const { elements } = await fetchOverpass();

  const areas = [];
  const lines = [];
  for (const el of elements) {
    const tags = el.tags ?? {};
    if (el.type === 'way' && el.geometry) {
      if (tags.highway) { const code = classifyHighway(tags); if (code) lines.push({ code, pts: el.geometry.map(toCell) }); continue; }
      if (!isClosed(el.geometry)) continue; // open ways can't be filled
      areas.push({ code: tags.building ? 'b' : 'g', pts: el.geometry.map(toCell) });
    } else if (el.type === 'relation' && el.members) {
      for (const m of el.members) {
        if (m.role === 'outer' && m.geometry && isClosed(m.geometry)) areas.push({ code: 'b', pts: m.geometry.map(toCell) }); // only whole outer rings, fragments are skipped
      }
    }
  }

  areas.forEach((a) => paintPolygon(a.pts, a.code));
  lines.forEach((l) => l.pts.slice(1).forEach((p, i) => paintLine(l.pts[i], p, l.code))); // pts[i] is the previous point since we sliced off the first

  const basemap = {
    _note: 'Generated by scripts/zombie-build-basemap.js. Do not hand-edit, re-run the script instead.',
    attribution: '© OpenStreetMap contributors', // ODbL requires this to be shown wherever the map is
    bbox: { south, west, north, east },
    cols,
    rows,
    legend: { '.': 'empty', g: 'green space', f: 'footpath', b: 'building', s: 'minor street', r: 'major street' },
    grid: grid.map((r) => r.join('')),
  };
  writeFileSync(outFile, JSON.stringify(basemap, null, 2) + '\n');
  console.log(`Wrote ${cols}x${rows} basemap from ${elements.length} OSM elements (${areas.length} areas, ${lines.length} lines) to ${outFile}`);
}

main().catch((err) => { console.error(err.message); process.exit(1); });

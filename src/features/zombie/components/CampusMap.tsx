// Night-mode campus map in the same style as Vampire's: inverted OSM tiles, LiDAR footprints, pixel pins.
// Walking legs follow real footpaths from planner/paths.ts. Rides and indoor links stay straight, we don't know their shape.

import L from 'leaflet';
import { memo, useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Pane, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { accents, colors } from '../../../shared/tokens';
import { CAMPUS, type Footprint } from '../../vampire/campus';
import { CanvasRings } from '../../vampire/CanvasRings';
import { loadMassing } from '../../vampire/shadows';
import { fetchWalkPath, walkPath } from '../planner/paths';
import { MODE_COLOR, MODE_DASHED } from './modes';
import type { IconMode } from './modes';

export interface MapPlace {
  id: string;
  name: string;
  lat: number;
  lng: number;
  kind: 'building' | 'shop';
  badge?: string; // stop number in the day, cafes included, e.g. "1" or "1+4"
  highlight?: boolean; // true for today's buildings and the cafes we actually stop at
}

export interface MapSegment {
  fromId: string;
  toId: string;
  mode: IconMode;
}

type LatLng = [number, number];
const flip = ([lng, lat]: [number, number]): LatLng => [lat, lng];

const SKIP_WORDS = new Set(['the', 'john', 'p.', 'centre', 'center', 'for', 'of', 'and', 'building', 'hall', 'library', 'university', 'information', 'science']);

// Short pin label from a long name, e.g. "Bahen Centre for Information Technology" becomes "Bahen".
function shortLabel(name: string): string {
  const word = name.split(/[\s,]+/).find((w) => w.length >= 3 && !SKIP_WORDS.has(w.toLowerCase())) ?? name;
  return word.slice(0, 10);
}

const iconCache = new Map<string, L.DivIcon>();

const pinSize = (text: string, small: boolean) => ({ w: small ? 14 : Math.max(36, text.length * 9 + 12), h: small ? 14 : 22 });

/** Cached so markers keep their DOM across renders instead of swapping icons every time. dx/dy move the pin's centre off its point, in pixels. */
function pinIcon(text: string, bg: string, fg: string, { small = false, dx = 0, dy = 0 } = {}) {
  const key = `${text}:${bg}:${small}:${dx}:${dy}`;
  const hit = iconCache.get(key);
  if (hit) return hit;
  const { w, h } = pinSize(text, small);
  const icon = L.divIcon({
    className: '',
    iconSize: [w, h],
    iconAnchor: [w / 2 - dx, h / 2 - dy],
    tooltipAnchor: [dx, dy - h / 2],
    html: `<div style="background:${bg};color:${fg};font:16px/${h}px VT323,monospace;text-align:center;white-space:nowrap;box-shadow:0 0 0 2px #000,3px 3px 0 2px #000">${small ? '' : text}</div>`,
  });
  iconCache.set(key, icon);
  return icon;
}

interface Pin {
  id: string;
  name: string;
  lat: number;
  lng: number;
  text: string;
  bg: string;
  fg: string;
  small: boolean;
  baseDy: number; // cafes sit above their point so they clear a class pin at the same spot
  rank: number; // lower claims space first
  z: number;
}

type Offset = [number, number];
const STEP = 32; // one label height plus its border, shadow and a gap
const PAD = 5; // the 2px border and 3px drop shadow drawn outside the pin box

type Rect = { x0: number; y0: number; x1: number; y1: number };
const overlap = (a: Rect, b: Rect) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));

/** Greedy label placement: each pin takes the closest spot that doesn't cover a pin placed before it, or the least covered one if the map is too crowded. */
function placePins(pins: Pin[], project: (p: Pin) => L.Point): Map<string, Offset> {
  const taken: Rect[] = [];
  const out = new Map<string, Offset>();
  for (const p of [...pins].sort((a, b) => a.rank - b.rank || a.id.localeCompare(b.id))) {
    const { x, y } = project(p);
    const { w, h } = pinSize(p.text, p.small);
    const side = w + 2 * PAD + 4;
    const tries: Offset[] = [];
    for (const i of [0, 1, -1, 2, -2]) for (const j of [0, -1, 1, -2, 2, -3, 3, -4, 4]) tries.push([i * side, p.baseDy + j * STEP]);
    tries.sort((a, b) => Math.hypot(a[0], a[1] - p.baseDy) - Math.hypot(b[0], b[1] - p.baseDy)); // closest to the real spot first
    const rectAt = ([dx, dy]: Offset): Rect => ({ x0: x + dx - w / 2 - PAD, y0: y + dy - h / 2 - PAD, x1: x + dx + w / 2 + PAD, y1: y + dy + h / 2 + PAD });
    let best = tries[0];
    let bestCover = Infinity;
    for (const t of tries) {
      const r = rectAt(t);
      const cover = taken.reduce((s, o) => s + overlap(r, o), 0);
      if (cover < bestCover) { best = t; bestCover = cover; }
      if (cover === 0) break;
    }
    taken.push(rectAt(best));
    out.set(p.id, best);
  }
  return out;
}

/** Draws the pins, re-placing labels whenever the zoom changes so none hide another. */
function Pins({ pins }: { pins: Pin[] }) {
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());
  useEffect(() => {
    const sync = () => setZoom(map.getZoom());
    sync(); // FitTo may already have zoomed before this listener existed
    map.on('zoomend viewreset', sync);
    return () => { map.off('zoomend viewreset', sync); };
  }, [map]);
  const offsets = useMemo(() => placePins(pins, (p) => map.project([p.lat, p.lng], zoom)), [pins, map, zoom]);

  return pins.map((p) => {
    const [dx, dy] = offsets.get(p.id) ?? [0, p.baseDy];
    const moved = dx !== 0 || dy !== 0;
    return [
      moved && !p.small && (
        <Marker key={`${p.id}-dot`} position={[p.lat, p.lng]} icon={pinIcon('', p.bg, p.fg, { small: true })} zIndexOffset={-5000} interactive={false} />
      ),
      <Marker key={p.id} position={[p.lat, p.lng]} icon={pinIcon(p.text, p.bg, p.fg, { small: p.small, dx, dy })} zIndexOffset={p.z}>
        <Tooltip className="coven-tip" direction="top" offset={[0, -4]}>
          {p.name}
        </Tooltip>
      </Marker>,
    ];
  });
}

function useFootprints() {
  const [fp, setFp] = useState<Footprint[] | null>(null);
  useEffect(() => {
    loadMassing().then(setFp);
  }, []);
  return fp;
}

/** Pans and zooms to today's buildings whenever the set of them changes. */
function FitTo({ points }: { points: LatLng[] }) {
  const map = useMap();
  const key = points.map((p) => p.join(',')).join('|'); // points is a fresh array every render, only refit when the places change
  useEffect(() => {
    if (!key) return;
    const pts = key.split('|').map((p) => p.split(',').map(Number) as LatLng);
    map.fitBounds(L.latLngBounds(pts), { padding: [60, 60], maxZoom: 17 });
  }, [map, key]);
  return null;
}

const followsPaths = (mode: IconMode) => mode === 'walk' || mode === 'coffee';

/** Live paths for walking segments that routes.json doesn't cover, keyed "from>to". */
function useLivePaths(segments: MapSegment[], byId: Map<string, MapPlace>) {
  const [live, setLive] = useState<Record<string, LatLng[]>>({});
  const missing = segments.filter((s) => followsPaths(s.mode) && !walkPath(s.fromId, s.toId) && byId.has(s.fromId) && byId.has(s.toId));
  const key = missing.map((s) => `${s.fromId}>${s.toId}`).join(',');
  useEffect(() => {
    let alive = true;
    for (const pair of key ? key.split(',') : []) {
      const [fromId, toId] = pair.split('>');
      const a = byId.get(fromId);
      const b = byId.get(toId);
      if (!a || !b) continue;
      fetchWalkPath(a, b).then((path) => {
        if (alive && path) setLive((m) => ({ ...m, [pair]: path }));
      });
    }
    return () => { alive = false; };
  }, [key, byId]);
  return live;
}

interface Props {
  places: MapPlace[];
  segments: MapSegment[];
}

export const CampusMap = memo(function CampusMap({ places, segments }: Props) {
  const footprints = useFootprints();
  const buildingRings = useMemo(() => footprints?.map((f) => f.ring.map(flip)) ?? [], [footprints]);
  const byId = useMemo(() => new Map(places.map((p) => [p.id, p])), [places]);
  const live = useLivePaths(segments, byId);
  const hasRoute = segments.length > 0;

  const routes = segments.flatMap((s, i) => {
    const a = byId.get(s.fromId);
    const b = byId.get(s.toId);
    if (!a || !b) return []; // unknown id, skip instead of crashing the whole map
    const path = followsPaths(s.mode) ? walkPath(s.fromId, s.toId) ?? live[`${s.fromId}>${s.toId}`] : undefined;
    return [{ key: `s${i}`, mode: s.mode, positions: path ?? ([[a.lat, a.lng], [b.lat, b.lng]] as LatLng[]) }];
  });
  const pins = useMemo(() => places.flatMap((p): Pin[] => {
    const stop = p.badge ? parseInt(p.badge, 10) : 1000; // today's stops claim space first, in order
    if (p.kind === 'building') {
      return [p.badge
        ? { ...p, text: `${p.badge} ${shortLabel(p.name)}`, bg: accents.zombie.main, fg: colors.night, small: false, baseDy: 0, rank: stop, z: 1000 }
        : { ...p, text: shortLabel(p.name), bg: colors.panel, fg: colors.bone, small: false, baseDy: 0, rank: 2000, z: 0 }];
    }
    if (!p.highlight && hasRoute) return []; // before planning every cafe shows, after only the chosen ones stand out
    return [p.highlight
      ? { ...p, text: `${p.badge ? `${p.badge} ` : ''}${p.name.split(/,| \(/)[0].slice(0, 14)}`, bg: accents.hob.main, fg: colors.night, small: false, baseDy: -25, rank: stop, z: 1500 }
      : { ...p, text: '', bg: accents.hob.main, fg: colors.night, small: true, baseDy: 0, rank: 3000, z: 0 }];
  }), [places, hasRoute]);
  const focus = places.filter((p) => p.kind === 'building' && p.badge).map((p): LatLng => [p.lat, p.lng]);

  return (
    <MapContainer
      center={[CAMPUS.lat, CAMPUS.lng]}
      zoom={16}
      minZoom={14}
      maxZoom={19}
      preferCanvas
      zoomControl
      className="coven-map h-full w-full"
      maxBounds={[
        [CAMPUS.lat - 0.02, CAMPUS.lng - 0.03],
        [CAMPUS.lat + 0.02, CAMPUS.lng + 0.03],
      ]}
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · Massing: City of Toronto Open Data'
        maxNativeZoom={19}
      />
      <FitTo points={focus} />
      <CanvasRings pane="buildings" zIndex={420} rings={buildingRings} fill="#2a2350" stroke="#6a5fa8" />
      <Pane name="route" style={{ zIndex: 430 }}>
        {routes.map((r) => (
          <Polyline key={`${r.key}u`} positions={r.positions} pathOptions={{ color: colors.night, weight: 9, lineCap: 'square', lineJoin: 'miter' }} />
        ))}
        {routes.map((r) => (
          <Polyline
            key={r.key}
            positions={r.positions}
            pathOptions={{ color: MODE_COLOR[r.mode], weight: 5, dashArray: MODE_DASHED[r.mode] ? '2 10' : undefined, lineCap: 'square', lineJoin: 'miter' }}
          />
        ))}
      </Pane>
      <Pins pins={pins} />
    </MapContainer>
  );
});

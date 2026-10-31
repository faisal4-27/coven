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

/** Cached so markers keep their DOM across renders instead of swapping icons every time. */
function pinIcon(text: string, bg: string, fg: string, { small = false, above = false } = {}) {
  const key = `${text}:${bg}:${small}:${above}`;
  const hit = iconCache.get(key);
  if (hit) return hit;
  const h = small ? 14 : 22;
  const w = small ? 14 : Math.max(36, text.length * 9 + 12);
  const icon = L.divIcon({
    className: '',
    iconSize: [w, h],
    iconAnchor: [w / 2, above ? h + 14 : h / 2], // "above" floats the pin clear of a class pin at the same spot
    html: `<div style="background:${bg};color:${fg};font:16px/${h}px VT323,monospace;text-align:center;white-space:nowrap;box-shadow:0 0 0 2px #000,3px 3px 0 2px #000">${small ? '' : text}</div>`,
  });
  iconCache.set(key, icon);
  return icon;
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
      {places.filter((p) => p.kind === 'shop').map((p) => {
        const on = p.highlight || !hasRoute; // before planning every cafe shows, after only the chosen ones stand out
        if (!on) return null;
        return (
          <Marker
            key={p.id}
            position={[p.lat, p.lng]}
            icon={p.highlight ? pinIcon(`${p.badge ? `${p.badge} ` : ''}${p.name.split(/,| \(/)[0].slice(0, 14)}`, accents.hob.main, colors.night, { above: true }) : pinIcon('', accents.hob.main, colors.night, { small: true })}
            zIndexOffset={p.highlight ? 1500 : 0}
          >
            <Tooltip className="coven-tip" direction="top" offset={[0, -10]}>
              {p.name}
            </Tooltip>
          </Marker>
        );
      })}
      {places.filter((p) => p.kind === 'building').map((p) => (
        <Marker
          key={p.id}
          position={[p.lat, p.lng]}
          icon={p.badge ? pinIcon(`${p.badge} ${shortLabel(p.name)}`, accents.zombie.main, colors.night) : pinIcon(shortLabel(p.name), colors.panel, colors.bone)}
          zIndexOffset={p.badge ? 1000 : 0}
        >
          <Tooltip className="coven-tip" direction="top" offset={[0, -12]}>
            {p.name}
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
});

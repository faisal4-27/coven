import L from 'leaflet'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, Marker, Pane, Polygon, Polyline, TileLayer, Tooltip } from 'react-leaflet'
import { useCoven } from '../../shared/store'
import { sun as sunSprite, vampire } from '../../shared/sprites'
import { colors } from '../../shared/tokens'
import { play } from '../../shared/sound'
import { Card, ErrorState, Loading, PageHeader, PixelButton, PixelSprite } from '../../shared/ui'
import { BurnMeter } from './BurnMeter'
import { CanvasRings } from './CanvasRings'
import { buildingByCode, buildings, CAMPUS, nodes, toLngLat, type Footprint } from './campus'
import { prefetchDay, sunTimes, type RouteMode, type RoutePlan } from './logic'
import { loadMassing } from './shadows'
import { demoTime, useRoutePlans } from './useRoutePlans'

type LatLng = [number, number]
const flip = ([lng, lat]: [number, number]): LatLng => [lat, lng]

const fmtTime = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

const pieceStyle = {
  shade: { color: colors.night, weight: 9, dash: undefined, top: '#d7263d', topWeight: 5 },
  indoor: { color: colors.night, weight: 9, dash: '2 10', top: '#ff8fa0', topWeight: 5 },
  sun: { color: '#7a3d00', weight: 11, dash: undefined, top: colors.sun, topWeight: 7 },
} as const

const iconCache = new Map<string, L.DivIcon>()

/** Cached so markers keep their DOM across renders instead of swapping icons every time. */
function pinIcon(code: string, kind: 'from' | 'to' | 'idle') {
  const key = `${code}:${kind}`
  const hit = iconCache.get(key)
  if (hit) return hit
  const bg = kind === 'from' ? '#d7263d' : kind === 'to' ? colors.moon : colors.panel
  const fg = kind === 'idle' ? colors.bone : colors.night
  const icon = L.divIcon({
    className: '',
    iconSize: [36, 22],
    iconAnchor: [18, 11],
    html: `<div style="background:${bg};color:${fg};font:16px/22px VT323,monospace;text-align:center;box-shadow:0 0 0 2px #000,3px 3px 0 2px #000">${code}</div>`,
  })
  iconCache.set(key, icon)
  return icon
}

function useFootprints() {
  const [fp, setFp] = useState<Footprint[] | null>(null)
  useEffect(() => {
    loadMassing().then(setFp)
  }, [])
  return fp
}

const CampusMap = memo(function CampusMap({ plan, from, to, onPick }: { plan: RoutePlan | null; from: string; to: string; onPick: (code: string) => void }) {
  const footprints = useFootprints()
  const buildingRings = useMemo(() => footprints?.map((f) => f.ring.map(flip)) ?? [], [footprints])
  const shadowRings = plan?.shadows ?? []
  const center = flip(toLngLat(0, 300))

  return (
    <MapContainer
      center={center}
      zoom={17}
      minZoom={15}
      maxZoom={19}
      preferCanvas
      zoomControl
      className="coven-map h-full w-full"
      maxBounds={[
        [CAMPUS.lat - 0.012, CAMPUS.lng - 0.016],
        [CAMPUS.lat + 0.012, CAMPUS.lng + 0.016],
      ]}
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · Massing: City of Toronto Open Data'
        maxNativeZoom={19}
      />
      {/* Daylight warms the ground, shadows cut it back to night. */}
      {plan && plan.sun.altitude > 0 && (
        <Pane name="sunlight" style={{ zIndex: 405 }}>
          <Polygon
            positions={[
              [CAMPUS.lat - 0.02, CAMPUS.lng - 0.03],
              [CAMPUS.lat - 0.02, CAMPUS.lng + 0.03],
              [CAMPUS.lat + 0.02, CAMPUS.lng + 0.03],
              [CAMPUS.lat + 0.02, CAMPUS.lng - 0.03],
            ]}
            pathOptions={{ stroke: false, fillColor: '#ffb347', fillOpacity: Math.min(0.32, 0.08 + plan.sun.altitude / 100), interactive: false }}
          />
        </Pane>
      )}
      <CanvasRings pane="shadows" zIndex={410} rings={shadowRings} fill="rgba(10, 7, 24, 0.8)" />
      <CanvasRings pane="buildings" zIndex={420} rings={buildingRings} fill="#2a2350" stroke="#6a5fa8" />
      <Pane name="route" style={{ zIndex: 430 }}>
        {plan?.pieces.map((p, i) => {
          const s = pieceStyle[p.kind]
          const pos = p.coords.map(flip)
          return (
            <Polyline key={`u${i}`} positions={pos} pathOptions={{ color: s.color, weight: s.weight, lineCap: 'square', lineJoin: 'miter' }} />
          )
        })}
        {plan?.pieces.map((p, i) => {
          const s = pieceStyle[p.kind]
          return (
            <Polyline
              key={`t${i}`}
              positions={p.coords.map(flip)}
              pathOptions={{ color: s.top, weight: s.topWeight, dashArray: s.dash, lineCap: 'square', lineJoin: 'miter' }}
            />
          )
        })}
      </Pane>
      {buildings.map((b) => (
        <Marker
          key={b.code}
          position={flip(toLngLat(...nodes[b.node]))}
          icon={pinIcon(b.code, b.code === from ? 'from' : b.code === to ? 'to' : 'idle')}
          eventHandlers={{ click: () => onPick(b.code) }}
          zIndexOffset={b.code === from || b.code === to ? 1000 : 0}
        >
          <Tooltip className="coven-tip" direction="top" offset={[0, -12]}>
            {b.name}
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  )
})

function Select({ label, value, onChange, exclude }: { label: string; value: string; onChange: (v: string) => void; exclude: string }) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="font-display text-sm uppercase tracking-widest text-ash">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full cursor-pointer appearance-none bg-dusk px-3 py-2 text-xl text-bone outline-none [box-shadow:inset_0_0_0_4px_var(--color-edge)] focus:[box-shadow:inset_0_0_0_4px_var(--color-vampire)]"
      >
        {buildings.map((b) => (
          <option key={b.code} value={b.code} disabled={b.code === exclude}>
            {b.code} · {b.name}
          </option>
        ))}
      </select>
    </label>
  )
}

function Vampire({ exposure, night }: { exposure: number; night: boolean }) {
  const burning = !night && exposure > 0.4
  return (
    <div className="relative flex w-28 shrink-0 flex-col items-center text-center">
      {burning && (
        <div aria-hidden className="absolute -top-3 flex gap-2">
          {[0, 0.4, 0.8].map((d) => (
            <span key={d} className="anim-smoke block h-2 w-2 bg-ash" style={{ animationDelay: `${d}s` }} />
          ))}
        </div>
      )}
      <div className={burning ? 'animate-pulse' : 'anim-bob'}>
        <PixelSprite sprite={vampire} scale={3} tint={burning ? { s: '#f0a58f', S: '#c96f5a' } : undefined} />
      </div>
      <p className="mt-1 font-display text-sm uppercase tracking-widest" style={{ color: burning ? colors.sun : colors.ash }}>
        {night ? 'Night. Free to roam.' : burning ? 'Hisssss!' : exposure > 0.15 ? 'Tolerable' : 'Comfy in the dark'}
      </p>
    </div>
  )
}

export function VampirePage() {
  const now = useCoven((s) => s.now)
  const { sunrise, sunset } = useMemo(() => sunTimes(now), [now])
  const [from, setFrom] = useState('GB')
  const [to, setTo] = useState('SS')
  const [mode, setMode] = useState<RouteMode>('shadiest')
  const [at, setAt] = useState(() => demoTime(now, sunrise, sunset))
  // The slider and clock move instantly; the map redraws at most every 120 ms while dragging.
  const routeAt = useThrottled(at, 120)
  const { plans, error } = useRoutePlans(from, to, routeAt)
  const day = at.toDateString()
  useEffect(() => prefetchDay(new Date(day)), [day])
  const plan = plans?.[mode] ?? null
  const night = plan ? plan.sun.altitude <= 0 : false

  const dayStart = useMemo(() => {
    const d = new Date(at)
    d.setHours(6, 0, 0, 0)
    return d
  }, [at])
  const minutes = Math.round((at.getTime() - dayStart.getTime()) / 60_000)
  const sunPct = Math.min(1, Math.max(0, (at.getTime() - sunrise.getTime()) / (sunset.getTime() - sunrise.getTime())))

  const pick = useCallback(
    (code: string) => {
      if (code !== from && code !== to) setTo(code)
    },
    [from, to],
  )

  return (
    <div className="flex min-h-dvh flex-col" style={{ ['--accent' as string]: '#d7263d' }}>
      <PageHeader monster="vampire" title="Sun-safe routes" subtitle="Shadows from real City of Toronto LiDAR massing" />

      <div
        className="border-b-4 border-edge px-4 py-2 text-center text-xl"
        style={{ background: night ? '#1d2a1a' : '#2a1220', color: night ? '#a8d84e' : colors.bone }}
      >
        {at > sunset || at < sunrise
          ? `The sun is down. Every route is safe, you were free after ${fmtTime(sunset)}.`
          : `Sun sets at ${fmtTime(sunset)}. You're free in ${Math.floor((sunset.getTime() - at.getTime()) / 3_600_000)}h ${Math.round(((sunset.getTime() - at.getTime()) % 3_600_000) / 60_000)}m.`}
      </div>

      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[400px_minmax(0,1fr)]">
        <aside className="order-2 flex min-w-0 flex-col gap-6 bg-dusk p-4 sm:p-6 lg:order-1 lg:max-h-[calc(100dvh-120px)] lg:overflow-y-auto">
          <div className="flex items-end gap-3">
            <Select label="From" value={from} onChange={setFrom} exclude={to} />
            <PixelButton
              variant="ghost"
              className="px-3!"
              aria-label="Swap start and destination"
              onClick={() => {
                setFrom(to)
                setTo(from)
              }}
            >
              ⇄
            </PixelButton>
            <Select label="To" value={to} onChange={setTo} exclude={from} />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-display text-sm uppercase tracking-widest text-ash">Leave at</span>
              <span className="text-2xl">{fmtTime(at)}</span>
            </div>
            <div className="relative h-8" aria-hidden>
              <div className="absolute top-0 -translate-x-1/2 transition-[left] duration-150" style={{ left: `${sunPct * 100}%` }}>
                <PixelSprite sprite={sunSprite} scale={2} />
              </div>
            </div>
            <input
              type="range"
              className="px-range w-full"
              min={0}
              max={14 * 60}
              step={15}
              value={minutes}
              aria-label="Departure time"
              onChange={(e) => setAt(new Date(dayStart.getTime() + Number(e.target.value) * 60_000))}
            />
            <div className="flex justify-between text-base text-ash">
              <span>6 am</span>
              <span>8 pm</span>
            </div>
            <div className="flex gap-3 pt-1">
              <PixelButton variant="ghost" onClick={() => setAt(new Date())}>
                Now
              </PixelButton>
              <PixelButton
                variant="ghost"
                onClick={() => {
                  const d = new Date(at)
                  d.setHours(12, 0, 0, 0)
                  setAt(d)
                }}
              >
                Midday
              </PixelButton>
            </div>
          </div>

          <div role="radiogroup" aria-label="Route preference" className="grid grid-cols-2 gap-4">
            {(['shadiest', 'fastest'] as const).map((m) => (
              <PixelButton key={m} role="radio" aria-checked={mode === m} variant={mode === m ? 'solid' : 'ghost'} onClick={() => {
                  if (m !== mode) play('success', { volume: 0.4 })
                  setMode(m)
                }}>
                {m === 'shadiest' ? 'Shadiest' : 'Fastest'}
              </PixelButton>
            ))}
          </div>

          {error ? (
            <ErrorState title="The bats lost the map">{error}</ErrorState>
          ) : !plan || !plans ? (
            <Loading label="Casting shadows…" />
          ) : (
            <>
              <Card accent="vampire" className="flex flex-col gap-4">
                <div className="flex flex-wrap-reverse items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-2">
                    <BurnMeter exposure={plan.result.sunExposure} />
                    <p className="text-xl">
                      {plan.result.distanceM} m · {plan.result.durationMin} min · {Math.round(plan.result.indoorFraction * 100)}% indoors
                    </p>
                  </div>
                  <Vampire exposure={plan.result.sunExposure} night={night} />
                </div>
                {!night && (
                  <p className="text-lg text-ash">
                    {mode === 'shadiest'
                      ? plans.fastest.result.sunExposure - plans.shadiest.result.sunExposure > 0.02
                        ? `${Math.round((plans.fastest.result.sunExposure - plans.shadiest.result.sunExposure) * 100)} points less sun than the fastest route, for ${plans.shadiest.result.distanceM - plans.fastest.result.distanceM} m extra.`
                        : 'The fastest route is already the shadiest. Lucky.'
                      : `The shadiest route would be ${Math.round(plans.shadiest.result.sunExposure * 100)}% sun.`}
                  </p>
                )}
                <p className="text-base text-ash">
                  Sun {Math.max(0, Math.round(plan.sun.altitude))}° up, from the {compass(plan.sun.bearing)}
                </p>
              </Card>

              <ol className="flex flex-col gap-2">
                {plan.result.steps.map((s, i) => (
                  <li key={i} className="flex gap-3 text-xl">
                    <span className="font-display text-vampire">{String(i + 1).padStart(2, '0')}</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>

              <Legend />
            </>
          )}
        </aside>

        <section className="relative order-1 h-[55dvh] lg:order-2 lg:h-auto" aria-label={`Map of the route from ${buildingByCode[from].name} to ${buildingByCode[to].name}`}>
          <CampusMap plan={plan} from={from} to={to} onPick={pick} />
        </section>
      </div>
    </div>
  )
}

/** Leading and trailing throttle: the first change applies at once, the last one always lands. */
function useThrottled<T>(value: T, ms: number): T {
  const [out, setOut] = useState(value)
  const last = useRef(0)
  useEffect(() => {
    const wait = Math.max(0, last.current + ms - Date.now())
    const id = setTimeout(() => {
      last.current = Date.now()
      setOut(value)
    }, wait)
    return () => clearTimeout(id)
  }, [value, ms])
  return out
}

function compass(bearing: number) {
  return ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'][Math.round(bearing / 45) % 8]
}

function Legend() {
  const items = [
    { label: 'Shade', color: '#d7263d', dash: false },
    { label: 'Indoors', color: '#ff8fa0', dash: true },
    { label: 'Direct sun', color: colors.sun, dash: false },
  ]
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2 text-lg text-ash">
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-8"
            style={{ background: it.dash ? `repeating-linear-gradient(90deg, ${it.color} 0 4px, transparent 4px 10px)` : it.color }}
          />
          {it.label}
        </span>
      ))}
      <span className="flex items-center gap-2">
        <span className="inline-block h-4 w-6 bg-[#030208] opacity-70 [box-shadow:0_0_0_2px_var(--color-edge)]" />
        Building shadow
      </span>
    </div>
  )
}

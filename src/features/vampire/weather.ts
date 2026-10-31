// Live cloud cover and UV for campus from Open-Meteo (free, no key). Display only: routing stays geometric,
// because shade is still the safer path, but heavy cloud means direct sun is mostly blocked anyway.
import { useEffect, useState } from 'react'
import { CAMPUS } from './campus'

export interface Weather {
  /** Total cloud cover, percent. */
  cloud: number
  uv: number
}

type Hourly = Record<string, Weather>

const KEY = 'coven.weather'
const TZ = 'America/Toronto'
const URL_ =
  `https://api.open-meteo.com/v1/forecast?latitude=${CAMPUS.lat}&longitude=${CAMPUS.lng}` +
  `&hourly=cloud_cover,uv_index&timezone=${encodeURIComponent(TZ)}&forecast_days=2`

/** "YYYY-MM-DDTHH:00" in Toronto time, matching Open-Meteo's hourly keys whatever the viewer's timezone. */
const hourKey = (at: Date) => {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' })
      .formatToParts(at)
      .map((x) => [x.type, x.value]),
  )
  return `${p.year}-${p.month}-${p.day}T${p.hour}:00`
}

let loading: Promise<Hourly | null> | null = null

function loadHourly(): Promise<Hourly | null> {
  loading ??= (async () => {
    const today = hourKey(new Date()).slice(0, 10)
    try {
      const saved = JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as { day: string; hourly: Hourly } | null
      if (saved?.day === today) return saved.hourly
    } catch {
      // Storage unavailable: fetch instead.
    }
    try {
      const res = await fetch(URL_, { signal: AbortSignal.timeout(8000) })
      if (!res.ok) return null
      const data = (await res.json()) as { hourly?: { time?: string[]; cloud_cover?: number[]; uv_index?: number[] } }
      const { time = [], cloud_cover = [], uv_index = [] } = data.hourly ?? {}
      const hourly: Hourly = {}
      time.forEach((t, i) => {
        if (typeof cloud_cover[i] === 'number' && typeof uv_index[i] === 'number') hourly[t] = { cloud: cloud_cover[i], uv: uv_index[i] }
      })
      try {
        sessionStorage.setItem(KEY, JSON.stringify({ day: today, hourly }))
      } catch {
        // Fine, it just won't survive a reload.
      }
      return hourly
    } catch {
      return null
    }
  })()
  return loading
}

/** Weather for the hour containing `at`, or null when offline or outside the 2-day forecast. */
export function useWeather(at: Date): Weather | null {
  const key = hourKey(at)
  const [state, setState] = useState<{ key: string; weather: Weather | null }>({ key: '', weather: null })
  useEffect(() => {
    let live = true
    loadHourly().then((hourly) => {
      if (live) setState({ key, weather: hourly?.[key] ?? null })
    })
    return () => {
      live = false
    }
  }, [key])
  return state.key === key ? state.weather : null
}

/** Heavy cloud blocks most direct sun; shade still helps with glare, so this only softens the number. */
export const OVERCAST = 70
export const effectiveExposure = (exposure: number, w: Weather | null) =>
  w && w.cloud >= OVERCAST ? exposure * (1 - (w.cloud / 100) * 0.85) : exposure

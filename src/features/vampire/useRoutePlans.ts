import { useEffect, useState } from 'react'
import { planRoute, type RoutePlan } from './logic'

export interface Plans {
  shadiest: RoutePlan
  fastest: RoutePlan
}

/** Plans both routes so the UI can show what the shade costs in metres. */
export function useRoutePlans(from: string, to: string, at: Date) {
  const [plans, setPlans] = useState<Plans | null>(null)
  const [error, setError] = useState<string | null>(null)
  const time = at.getTime()

  useEffect(() => {
    let live = true
    const when = new Date(time)
    Promise.all([planRoute(from, to, when), planRoute(from, to, when, { avoidSun: false })])
      .then(([shadiest, fastest]) => {
        if (!live) return
        setPlans({ shadiest, fastest })
        setError(null)
      })
      .catch((e: unknown) => live && setError(e instanceof Error ? e.message : String(e)))
    return () => {
      live = false
    }
  }, [from, to, time])

  return { plans, error }
}

/** Midday on the same day if the sun is already down, so the demo always has shadows to show. */
export function demoTime(now: Date, sunrise: Date, sunset: Date) {
  if (now > sunrise && now < sunset) return now
  const noon = new Date(now)
  noon.setHours(12, 0, 0, 0)
  return noon
}

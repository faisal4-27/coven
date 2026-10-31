import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useCoven } from '../../shared/store'
import { vampire } from '../../shared/sprites'
import { Card, Loading, PixelSprite } from '../../shared/ui'
import { BurnMeter } from './BurnMeter'
import { sunTimes } from './logic'
import { demoTime, useRoutePlans } from './useRoutePlans'

/** Compact card for the home screen: the shadiest walk from Bahen to Robarts right now. */
export function RoutePreview({ from = 'BA', to = 'RL' }: { from?: string; to?: string }) {
  const now = useCoven((s) => s.now)
  const at = useMemo(() => {
    const { sunrise, sunset } = sunTimes(now)
    return demoTime(now, sunrise, sunset)
  }, [now])
  const { plans } = useRoutePlans(from, to, at)

  return (
    <Link to="/vampire" className="group block outline-none">
      <Card accent="vampire" className="flex h-full items-center gap-4 transition-transform group-hover:-translate-y-1 group-focus-visible:-translate-y-1">
        <PixelSprite sprite={vampire} scale={2} />
        {plans ? (
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg">Sun-safe walk, Bahen to Robarts</p>
            <BurnMeter exposure={plans.shadiest.result.sunExposure} />
            <p className="text-lg text-ash">
              {plans.shadiest.result.durationMin} min · {Math.round(plans.shadiest.result.indoorFraction * 100)}% indoors · fastest route{' '}
              {Math.round(plans.fastest.result.sunExposure * 100)}% sun
            </p>
          </div>
        ) : (
          <Loading label="Measuring the shadows…" />
        )}
      </Card>
    </Link>
  )
}

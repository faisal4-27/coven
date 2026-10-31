import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMoonIllumination } from 'suncalc'
import { AccountButton } from '../../shared/auth'
import { monsterSprites } from '../../shared/sprites'
import { useCoven } from '../../shared/store'
import { accents, monsters } from '../../shared/tokens'
import type { CrunchWeek } from '../../shared/types'
import { Card, MoonIcon, PixelSprite, Starfield } from '../../shared/ui'
import { RoutePreview } from '../../features/vampire/RoutePreview'
import { sunTimes } from '../../features/vampire/logic'

function moonPhase(phase: number): CrunchWeek['phase'] {
  // suncalc phase: 0 new, 0.25 first quarter, 0.5 full, 0.75 last quarter. Waning maps onto the same shapes.
  const lit = 1 - Math.abs(phase - 0.5) * 2
  if (lit > 0.9) return 'full'
  if (lit > 0.6) return 'waxing-gibbous'
  if (lit > 0.4) return 'first-quarter'
  if (lit > 0.1) return 'waxing-crescent'
  return 'new'
}

const fmt = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

function greeting(d: Date) {
  const h = d.getHours()
  if (h < 5) return 'Still up'
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export function Picker() {
  const navigate = useNavigate()
  const { user, now, setMonster } = useCoven()
  const sky = useMemo(() => {
    const { sunrise, sunset } = sunTimes(now)
    const moon = getMoonIllumination(now)
    return { sunset, sunrise, moon: moonPhase(moon.phase), lit: Math.round(moon.fraction * 100) }
  }, [now])

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <Starfield count={60} seed={3} />
      <header className="relative z-10 flex items-center justify-between px-4 py-4 sm:px-8">
        <span className="font-display text-2xl tracking-widest">COVEN</span>
        <AccountButton />
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-16 sm:px-8">
        <p className="text-2xl text-ash">
          {greeting(now)}, {user?.firstName ?? 'creature'}.
        </p>
        <h1 className="font-display text-4xl sm:text-5xl" style={{ textShadow: '4px 4px 0 #000' }}>
          Choose your curse
        </h1>

        <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {monsters.map((m, i) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                setMonster(m.id)
                navigate(m.route)
              }}
              className="anim-rise group cursor-pointer text-left outline-none"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <Card
                accent={m.id}
                className="flex h-full flex-col items-center gap-3 transition-transform duration-100 group-hover:-translate-y-2 group-focus-visible:-translate-y-2"
              >
                <div
                  className="flex h-40 w-full items-end justify-center"
                  style={{ background: `linear-gradient(to top, ${accents[m.id].dark}55 0 25%, transparent 25%)` }}
                >
                  <div className="group-hover:anim-bob">
                    <PixelSprite sprite={monsterSprites[m.id]} scale={5} />
                  </div>
                </div>
                <h2 className="font-display text-2xl" style={{ color: accents[m.id].main }}>
                  {m.name}
                </h2>
                <p className="text-center text-xl">{m.curse}</p>
                <p className="text-center text-lg text-ash">{m.need}</p>
                <span
                  className="mt-auto font-display text-sm uppercase tracking-widest opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                  style={{ color: accents[m.id].main }}
                >
                  Enter ▸
                </span>
              </Card>
            </button>
          ))}
        </div>

        <h2 className="mt-16 font-display text-2xl">Tonight on campus</h2>
        <div className="mt-6 grid gap-8 md:grid-cols-[1fr_1fr_2fr]">
          <Card className="flex items-center gap-4">
            <MoonIcon phase={sky.moon} size={14} scale={4} glow="#f6e7a1" />
            <div>
              <p className="font-display text-lg">Moon</p>
              <p className="text-xl text-ash">{sky.lit}% lit</p>
            </div>
          </Card>
          <Card>
            <p className="font-display text-lg">Sunset</p>
            <p className="text-3xl text-vampire">{fmt(sky.sunset)}</p>
            <p className="text-lg text-ash">Sunrise {fmt(sky.sunrise)}</p>
          </Card>
          <RoutePreview />
        </div>
      </main>
    </div>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMoonIllumination } from 'suncalc'
import { AccountButton } from '../../shared/auth'
import { chosenLine, hoverLine, lineId } from '../../shared/dialogue'
import { play, voiceMs, type SoundName } from '../../shared/sound'
import { monsterSprites } from '../../shared/sprites'
import { useCoven } from '../../shared/store'
import { accents, monsters } from '../../shared/tokens'
import type { CrunchWeek, Monster } from '../../shared/types'
import { Card, MoonIcon, PixelSprite, SpeechBubble, Starfield } from '../../shared/ui'
import { RoutePreview } from '../../features/vampire/RoutePreview'
import { CrunchPreview } from '../../features/banshee/CrunchPreview'
import { prefetchDay, sunTimes } from '../../features/vampire/logic'

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

/** Each monster's own sound. The vampire stays silent. */
const MONSTER_SOUND: Record<Monster, SoundName | null> = { vampire: null, banshee: 'banshee', hob: 'hob', zombie: 'zombie' }

// Hover previews: at most one every 350 ms, and the same monster not again for 1.2 s.
let lastHover = 0
let previewing: HTMLAudioElement | null = null
function preview(id: Monster, line: string) {
  // A voiced line is the monster's sound; don't stack the hover sting on top of it.
  if (voiceMs(lineId(id, line))) return
  const now = performance.now()
  if (now - lastHover < 350) return
  lastHover = now
  const sound = MONSTER_SOUND[id]
  if (sound) previewing = play(sound, { volume: 0.35, cooldown: 1200 }) ?? previewing
}

export function Picker() {
  const navigate = useNavigate()
  const { user, now, setMonster } = useCoven()
  // Warm up the Vampire page while the user is choosing, so opening it is instant.
  useEffect(() => {
    const id = setTimeout(() => {
      void import('../../features/vampire/VampirePage')
      prefetchDay(new Date())
    }, 300)
    return () => clearTimeout(id)
  }, [])

  const [speech, setSpeech] = useState<{ monster: Monster; text: string } | null>(null)
  const [chosen, setChosen] = useState<Monster | null>(null)
  const leaving = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(leaving.current), [])

  const sky = useMemo(() => {
    const { sunrise, sunset } = sunTimes(now)
    const moon = getMoonIllumination(now)
    return { sunset, sunrise, moon: moonPhase(moon.phase), lit: Math.round(moon.fraction * 100) }
  }, [now])
  const isDaytime = now >= sky.sunrise && now < sky.sunset

  const hover = (id: Monster) => {
    if (chosen) return
    const text = hoverLine(id, isDaytime)
    preview(id, text)
    setSpeech({ monster: id, text })
  }
  const unhover = (id: Monster) => {
    if (!chosen) setSpeech((s) => (s?.monster === id ? null : s))
  }

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <Starfield count={60} seed={3} />
      <header className="relative z-10 flex items-center justify-between py-4 pl-4 pr-20 sm:pl-8">
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
              aria-label={`${m.name}, ${m.curse}`}
              onMouseEnter={() => hover(m.id)}
              onMouseLeave={() => unhover(m.id)}
              // Keyboard focus only; a mouse click focuses too, and the click plays the full sound itself.
              onFocus={(e) => e.currentTarget.matches(':focus-visible') && hover(m.id)}
              onBlur={() => unhover(m.id)}
              onClick={() => {
                if (chosen) return
                previewing?.pause()
                // Keep whatever this monster is already saying; only speak up if it was quiet (keyboard, touch).
                const text = speech?.monster === m.id ? speech.text : chosenLine(m.id)
                const sound = MONSTER_SOUND[m.id]
                if (sound && !voiceMs(lineId(m.id, text))) play(sound, { volume: 1, cooldown: 0 })
                setChosen(m.id)
                setSpeech({ monster: m.id, text })
                leaving.current = setTimeout(() => {
                  play('transition', { volume: 0.4 })
                  setMonster(m.id)
                  navigate(m.route)
                }, 900)
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
                  <div className={`relative ${chosen === m.id ? 'anim-bob' : 'group-hover:anim-bob'}`}>
                    {speech?.monster === m.id && <SpeechBubble monster={m.id} text={speech.text} keepVoice={chosen === m.id} />}
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
        <div className="mt-6 grid gap-8 md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.75fr)_minmax(0,1.75fr)]">
          <div className="grid gap-8 md:col-span-2 md:grid-cols-2 lg:col-span-1 lg:grid-cols-1">
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
          </div>
          <div className="grid md:col-span-2 lg:col-span-1">
            <RoutePreview />
          </div>
          <div className="grid md:col-span-2 lg:col-span-1">
            <CrunchPreview />
          </div>
        </div>
      </main>
    </div>
  )
}

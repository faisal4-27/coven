import { useState } from 'react'
import { AuthButtons } from '../../shared/auth'
import { clerkEnabled } from '../../shared/env'
import { bat, monsterSprites } from '../../shared/sprites'
import { accents, monsters, type MonsterInfo } from '../../shared/tokens'
import { Card, PixelSprite, Starfield } from '../../shared/ui'
import { BigMoon, Skyline } from '../scenery'

const sky =
  'linear-gradient(to bottom, #0b0a14 0%, #0b0a14 28%, #100e1d 28%, #100e1d 48%, #161329 48%, #161329 66%, #1e1836 66%, #1e1836 82%, #2a1f45 82%)'

const drips = [
  { left: '9%', h: 18, delay: '0.2s' },
  { left: '31%', h: 30, delay: '0.6s' },
  { left: '52%', h: 12, delay: '1s' },
  { left: '74%', h: 24, delay: '0.4s' },
  { left: '91%', h: 14, delay: '0.8s' },
]

function Logo() {
  return (
    <div className="relative inline-block">
      <h1
        className="font-display text-[clamp(3.5rem,14vw,8rem)] font-bold leading-none tracking-[0.12em] text-bone"
        style={{ textShadow: '6px 6px 0 #7a0f1f, 12px 12px 0 #000' }}
      >
        COVEN
      </h1>
      <div aria-hidden className="absolute inset-x-0 top-full -mt-[0.1em] text-[clamp(3.5rem,14vw,8rem)]">
        {drips.map((d) => (
          <span
            key={d.left}
            className="absolute w-2 origin-top bg-vampire"
            style={{ left: d.left, height: d.h, animation: `drip 2.4s steps(6) ${d.delay} both` }}
          >
            <span className="absolute -left-1 top-full h-2 w-4 bg-vampire" />
          </span>
        ))}
      </div>
    </div>
  )
}

function MonsterOnRoof({ info, active, onFocus }: { info: MonsterInfo; active: boolean; onFocus: () => void }) {
  // Moonlit rim so dark sprites stay readable against the black skyline.
  const rim = active ? accents[info.id].main : '#3a3360'
  return (
    <button
      type="button"
      onMouseEnter={onFocus}
      onFocus={onFocus}
      onClick={onFocus}
      aria-pressed={active}
      aria-label={`${info.name}: ${info.curse}. Real need: ${info.need}`}
      className="group flex cursor-pointer flex-col items-center gap-1 outline-none"
    >
      <div className={active ? 'anim-bob' : ''}>
        <PixelSprite
          sprite={monsterSprites[info.id]}
          scale={4}
          className="h-auto w-[clamp(56px,16vw,96px)]"
          style={{ filter: `drop-shadow(3px 0 0 ${rim}) drop-shadow(-3px 0 0 ${rim}) drop-shadow(0 -3px 0 ${rim})` }}
        />
      </div>
      <span
        className="font-display text-sm uppercase tracking-widest transition-colors group-focus-visible:underline"
        style={{ color: active ? accents[info.id].main : 'var(--color-ash)' }}
      >
        {info.name}
      </span>
    </button>
  )
}

export function Landing() {
  const [focus, setFocus] = useState<MonsterInfo>(monsters[0])

  return (
    <main className="min-h-dvh">
      <section className="relative isolate flex min-h-dvh flex-col overflow-hidden" style={{ background: sky }}>
        <Starfield />
        <div className="absolute -right-6 -top-6 w-28 opacity-80 sm:right-[6%] sm:top-[8%] sm:w-auto sm:opacity-100">
          <BigMoon />
        </div>
        {[
          { top: '14%', dur: '19s', delay: '0s', scale: 3 },
          { top: '26%', dur: '27s', delay: '-9s', scale: 2 },
          { top: '9%', dur: '33s', delay: '-20s', scale: 2 },
        ].map((b) => (
          <div
            key={b.top}
            aria-hidden
            className="pointer-events-none absolute left-0"
            style={{ top: b.top, animation: `drift ${b.dur} linear ${b.delay} infinite` }}
          >
            <PixelSprite sprite={bat} scale={b.scale} />
          </div>
        ))}

        <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-6 px-4 pt-10 text-center">
          <p className="anim-rise font-display text-sm uppercase tracking-[0.4em] text-ash">UofT · St. George · Halloween 2026</p>
          <Logo />
          <p className="anim-rise mt-4 max-w-xl text-2xl text-bone sm:text-3xl" style={{ animationDelay: '0.2s' }}>
            A survival planner for UofT's monsters.
          </p>
          <p className="anim-rise -mt-4 max-w-xl text-xl text-ash" style={{ animationDelay: '0.3s' }}>
            Pick your curse. Coven plans your day around it: your route, your deadlines, your food, your energy.
          </p>
          <div className="anim-rise" style={{ animationDelay: '0.45s' }}>
            <AuthButtons />
          </div>
          {!clerkEnabled && <p className="text-base text-ash/70">Demo mode: accounts stay in this browser.</p>}
        </div>

        <div className="relative z-10 mt-6">
          <Card
            accent={focus.id}
            className="mx-auto mb-2 w-[min(92vw,30rem)] p-2! text-center"
            aria-live="polite"
          >
            <p className="font-display text-lg" style={{ color: accents[focus.id].main }}>
              {focus.name} · {focus.curse}
            </p>
            <p className="text-lg text-ash">Really: {focus.need.toLowerCase()}</p>
          </Card>
          <div className="relative">
            <Skyline className="h-[clamp(170px,23vw,330px)]" />
            <div className="absolute inset-x-0 bottom-[6%] mx-auto grid max-w-3xl grid-cols-4 items-end gap-2 px-4">
              {monsters.map((m) => (
                <MonsterOnRoof key={m.id} info={m} active={focus.id === m.id} onFocus={() => setFocus(m)} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-night px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display text-3xl sm:text-4xl">Halloween on the outside.</h2>
          <p className="mt-2 text-2xl text-ash">Every monster maps to a real student need.</p>
          <div className="mt-10 grid gap-8 sm:grid-cols-2">
            {monsters.map((m) => (
              <Card key={m.id} accent={m.id} className="flex items-center gap-5">
                <PixelSprite sprite={monsterSprites[m.id]} scale={3} />
                <div>
                  <h3 className="font-display text-2xl" style={{ color: accents[m.id].main }}>
                    {m.name}
                  </h3>
                  <p className="text-xl">{m.curse}</p>
                  <p className="text-lg text-ash">{m.need}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t-4 border-edge bg-dusk px-4 py-6 text-center text-ash">
        Made at UofT with too much coffee. Nothing you upload is stored.
      </footer>
    </main>
  )
}

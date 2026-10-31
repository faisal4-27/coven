import { useMemo } from 'react'

function seeded(seed: number) {
  let s = seed
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
}

/** Deterministic twinkling pixel stars. Pure CSS, no canvas. */
export function Starfield({ count = 90, seed = 7 }: { count?: number; seed?: number }) {
  const stars = useMemo(() => {
    const rnd = seeded(seed)
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: rnd() * 100,
      top: rnd() * 70,
      size: rnd() > 0.85 ? 4 : 2,
      delay: rnd() * 3,
      dur: 1.6 + rnd() * 2.4,
    }))
  }, [count, seed])

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {stars.map((st) => (
        <span
          key={st.id}
          className="anim-twinkle absolute bg-bone"
          style={{
            left: `${st.left}%`,
            top: `${st.top}%`,
            width: st.size,
            height: st.size,
            animationDelay: `${st.delay}s`,
            animationDuration: `${st.dur}s`,
          }}
        />
      ))}
    </div>
  )
}

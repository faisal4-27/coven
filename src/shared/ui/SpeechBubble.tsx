import { useEffect, useRef, useState } from 'react'
import { lineId } from '../dialogue'
import { monsterBlip, playVoice, stopVoice, voiceMs } from '../sound'
import { accents, colors } from '../tokens'
import type { Monster } from '../types'

const CHAR_MS = 30
const BLIP_EVERY = 3

type Align = 'left' | 'center' | 'right'

const boxAlign: Record<Align, string> = {
  left: 'left-0',
  center: 'left-1/2 -translate-x-1/2',
  right: 'right-0',
}
const tailAlign: Record<Align, string> = {
  left: 'left-6',
  center: 'left-1/2 -translate-x-1/2',
  right: 'right-6',
}

interface Props {
  monster: Monster
  text: string
  /** Which edge of the anchor the bubble lines up with. Use 'left' / 'right' near screen edges on phones. */
  align?: Align
  /** Let the spoken line finish after the bubble unmounts, e.g. a picker choice that navigates away. */
  keepVoice?: boolean
}

/**
 * Pixel speech bubble that sits above its (position: relative) parent, tail pointing down at the monster.
 * Types out one character at a time; click to finish the line. A new `text` starts a new line.
 */
export function SpeechBubble(props: Props) {
  return <Bubble key={props.text} {...props} />
}

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function Bubble({ monster, text, align = 'center', keepVoice = false }: Props) {
  const [shown, setShown] = useState(() => (reducedMotion() ? text.length : 0))
  // A voiced line types in step with the voice and replaces the blips.
  const [voiced] = useState(() => voiceMs(lineId(monster, text)))
  const charMs = voiced ? Math.min(110, Math.max(CHAR_MS, (voiced * 0.85) / text.length)) : CHAR_MS
  // Screen readers get the whole line once, after the live region exists, instead of every typed letter.
  const [said, setSaid] = useState('')
  const accent = accents[monster].main

  useEffect(() => {
    const id = setTimeout(() => setSaid(text), 50)
    return () => clearTimeout(id)
  }, [text])

  // A ref, so flipping keepVoice (a picker card being chosen mid-line) doesn't restart the voice.
  const keep = useRef(keepVoice)
  useEffect(() => {
    keep.current = keepVoice
  }, [keepVoice])

  useEffect(() => {
    if (!voiced) return
    const el = playVoice(lineId(monster, text))
    return () => {
      if (!keep.current) stopVoice(el)
    }
  }, [voiced, monster, text])

  useEffect(() => {
    if (shown >= text.length) return
    const id = setTimeout(() => {
      // Unvoiced lines (sound locked, or a line without a recording yet) blip as they type.
      if (!voiced && shown % BLIP_EVERY === 0 && text[shown] !== ' ') monsterBlip(monster)
      setShown(shown + 1)
    }, charMs)
    return () => clearTimeout(id)
  }, [shown, text, monster, voiced, charMs])

  return (
    <div className={`pointer-events-auto absolute bottom-full z-30 mb-4 ${boxAlign[align]}`}>
      <div
        onClick={(e) => {
          // Finish the line, and don't let the click reach a card or button underneath.
          e.stopPropagation()
          setShown(text.length)
        }}
        className="relative w-max max-w-[min(78vw,16rem)] cursor-pointer bg-panel px-3 py-2 text-left text-lg leading-tight text-bone"
        style={{
          boxShadow: `0 -4px 0 0 ${accent}, 0 4px 0 0 ${accent}, -4px 0 0 0 ${accent}, 4px 0 0 0 ${accent}, 8px 8px 0 0 #000`,
        }}
      >
        <span aria-hidden>
          {text.slice(0, shown)}
          {/* The rest is laid out but invisible, so the bubble doesn't grow while it types. */}
          <span className="invisible">{text.slice(shown)}</span>
        </span>
        <span aria-live="polite" className="sr-only">
          {said}
        </span>
        <svg
          aria-hidden
          viewBox="0 0 5 3"
          width={20}
          height={12}
          shapeRendering="crispEdges"
          className={`absolute top-full ${tailAlign[align]}`}
        >
          <rect x={0} y={0} width={1} height={1} fill={accent} />
          <rect x={1} y={0} width={3} height={1} fill={colors.panel} />
          <rect x={4} y={0} width={1} height={1} fill={accent} />
          <rect x={1} y={1} width={1} height={1} fill={accent} />
          <rect x={2} y={1} width={1} height={1} fill={colors.panel} />
          <rect x={3} y={1} width={1} height={1} fill={accent} />
          <rect x={2} y={2} width={1} height={1} fill={accent} />
        </svg>
      </div>
    </div>
  )
}

// Tiny sound manager on plain HTMLAudioElement. See the Sound section in AGENTS.md.
// Nothing plays until the first pointerdown or keydown, a missing file is skipped silently,
// and every failure is swallowed: sound must never break the app.
import { useCoven } from './store'
// Written by scripts/make-voices.py: voiced line id -> duration in ms. A plain import, so it updates live.
import voiceLines from './voiceLines.json'
import type { Monster } from './types'

export const SOUND_NAMES = [
  'banshee',
  'hob',
  'zombie',
  'banshee-moon',
  'hob-meal',
  'zombie-reorganize',
  'seance-summon',
  'click',
  'transition',
  'success',
  'error',
  'blip',
  'ambient',
] as const

export type SoundName = (typeof SOUND_NAMES)[number]

export interface PlayOptions {
  /** 0 to 1, default 0.6. */
  volume?: number
  /** Default 1. Also shifts pitch, which is the point for chiptune blips. */
  playbackRate?: number
  /** Ignore repeats of the same sound within this many ms. Default 120, which also absorbs StrictMode double effects. */
  cooldown?: number
}

/** Injected by vite.config.ts: the mp3s present in public/sfx. Absent outside Vite, then every name is tried. */
declare const __SFX_FILES__: string[] | undefined
const available = typeof __SFX_FILES__ === 'undefined' ? null : new Set(__SFX_FILES__)
const exists = (name: SoundName) => !available || available.has(`${name}.mp3`)

const AMBIENT_VOLUME = 0.15
const AMBIENT_FADE_MS = 1500

const sources = new Map<SoundName, HTMLAudioElement>()
const missing = new Set<SoundName>()
const lastPlayed = new Map<SoundName, number>()
let unlocked = false
let ambient: HTMLAudioElement | null = null
let fade: ReturnType<typeof setInterval> | undefined

const isMuted = () => useCoven.getState().muted
const clamp = (v: number) => Math.min(1, Math.max(0, v))

function source(name: SoundName): HTMLAudioElement | null {
  if (missing.has(name) || !exists(name) || typeof Audio === 'undefined') return null
  let el = sources.get(name)
  if (!el) {
    el = new Audio(`/sfx/${name}.mp3`)
    el.preload = 'auto'
    el.addEventListener('error', () => missing.add(name), { once: true })
    sources.set(name, el)
  }
  return el
}

/** Plays a sound and returns its node (to stop it early), or null when it was skipped. */
export function play(
  name: SoundName,
  { volume = 0.6, playbackRate = 1, cooldown = 120 }: PlayOptions = {},
): HTMLAudioElement | null {
  if (!unlocked || isMuted()) return null
  const now = performance.now()
  if (now - (lastPlayed.get(name) ?? -Infinity) < cooldown) return null
  const base = source(name)
  if (!base) return null
  lastPlayed.set(name, now)
  try {
    // Clone per play so the same sound can overlap itself.
    const node = base.cloneNode() as HTMLAudioElement
    node.volume = clamp(volume)
    node.playbackRate = playbackRate
    node.preservesPitch = false
    node.addEventListener('error', () => missing.add(name), { once: true })
    node.play().catch(() => {})
    return node
  } catch {
    // Audio unsupported or blocked. Stay quiet.
    return null
  }
}

const BLIP_RATE: Record<Monster, number> = { vampire: 0.9, banshee: 1.35, hob: 1.1, zombie: 0.7 }

/** Dialogue text blip, pitched per monster. */
export function monsterBlip(monster: Monster, options?: Omit<PlayOptions, 'playbackRate'>) {
  return play('blip', { volume: 0.3, cooldown: 40, ...options, playbackRate: BLIP_RATE[monster] })
}

export function startAmbient() {
  if (!unlocked || isMuted() || missing.has('ambient') || !exists('ambient') || typeof Audio === 'undefined') return
  if (!ambient) {
    ambient = new Audio('/sfx/ambient.mp3')
    ambient.loop = true
    ambient.preload = 'auto'
    ambient.addEventListener('error', () => missing.add('ambient'), { once: true })
  }
  if (!ambient.paused) return
  const el = ambient
  el.volume = 0
  el.play()
    .then(() => {
      clearInterval(fade)
      const started = performance.now()
      fade = setInterval(() => {
        const t = Math.min(1, (performance.now() - started) / AMBIENT_FADE_MS)
        el.volume = AMBIENT_VOLUME * t
        if (t >= 1) clearInterval(fade)
      }, 50)
    })
    .catch(() => {})
}

export function stopAmbient() {
  clearInterval(fade)
  ambient?.pause()
}

/** Marks audio as allowed (browsers require a user gesture), preloads everything and starts the night loop. */
export function unlockAudio() {
  if (unlocked) return
  unlocked = true
  for (const name of SOUND_NAMES) if (name !== 'ambient') source(name)
  startAmbient()
}

let installed = false

let voice: HTMLAudioElement | null = null

/** True once sound can actually play: after the first interaction and while not muted. */
export const audioReady = () => unlocked && !isMuted()

/** Length of a voiced line in ms when it will actually be heard, otherwise null. */
export function voiceMs(id: string): number | null {
  const ms = (voiceLines as Record<string, number>)[id]
  return audioReady() && ms ? ms : null
}

/** Speak a dialogue line (see lineId in dialogue.ts). Stops any line already speaking, so only one voice plays. */
export function playVoice(id: string, volume = 0.6): HTMLAudioElement | null {
  stopVoice()
  if (!voiceMs(id) || typeof Audio === 'undefined') return null
  try {
    const el = new Audio(`/voice/${id}.mp3`)
    el.volume = clamp(volume)
    el.play().catch(() => {})
    voice = el
    return el
  } catch {
    return null
  }
}

export function stopVoice(el: HTMLAudioElement | null = voice) {
  el?.pause()
  if (el === voice) voice = null
}


/** Call once at startup. Unlocks on the first pointerdown or keydown anywhere in the document. */
export function installAudioUnlock() {
  if (installed || typeof document === 'undefined') return
  installed = true
  const onFirst = () => {
    document.removeEventListener('pointerdown', onFirst, true)
    document.removeEventListener('keydown', onFirst, true)
    unlockAudio()
  }
  // Capture phase, so the click that unlocks can already play its own sound.
  document.addEventListener('pointerdown', onFirst, true)
  document.addEventListener('keydown', onFirst, true)
  // Don't hum in a background tab.
  document.addEventListener('visibilitychange', () => (document.hidden ? stopAmbient() : startAmbient()))
  useCoven.subscribe((s, prev) => {
    if (s.muted === prev.muted) return
    if (s.muted) stopVoice()
    if (s.muted) stopAmbient()
    else startAmbient()
  })
}

/** For components: `const { play } = useSound()`. */
export function useSound() {
  const muted = useCoven((s) => s.muted)
  return { play, monsterBlip, muted }
}

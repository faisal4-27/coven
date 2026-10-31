import { create } from 'zustand'
import type { Assessment, CalendarEvent, CovenUser, Ingredient, Monster } from './types'

const MUTED_KEY = 'coven.muted'
const DATA_KEY = 'coven.data'

interface Saved {
  assessments: Assessment[]
  events: CalendarEvent[]
  pantry: Ingredient[]
}

/** Deadlines, calendar and pantry survive a reload. Anything unreadable falls back to empty. */
function readSaved(): Saved {
  const empty: Saved = { assessments: [], events: [], pantry: [] }
  try {
    const raw = localStorage.getItem(DATA_KEY)
    if (!raw) return empty
    const data = JSON.parse(raw) as Partial<Saved>
    return {
      assessments: Array.isArray(data.assessments) ? data.assessments : [],
      events: Array.isArray(data.events) ? data.events : [],
      pantry: Array.isArray(data.pantry) ? data.pantry : [],
    }
  } catch {
    return empty
  }
}

function writeSaved(data: Saved) {
  try {
    localStorage.setItem(DATA_KEY, JSON.stringify(data))
  } catch {
    // Storage blocked or full: the data still lives for this session.
  }
}

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTED_KEY) === '1'
  } catch {
    return false
  }
}

function writeMuted(muted: boolean) {
  try {
    localStorage.setItem(MUTED_KEY, muted ? '1' : '0')
  } catch {
    // Storage blocked, the choice still holds for this session.
  }
}

interface CovenState {
  /** False until the auth provider has told us whether someone is signed in. */
  authReady: boolean
  user: CovenUser | null
  monster: Monster | null
  assessments: Assessment[]
  events: CalendarEvent[]
  pantry: Ingredient[]
  /** Current time, overridable for the demo. */
  now: Date
  /** Sound off. Persisted in localStorage; src/shared/sound.ts reacts to changes. */
  muted: boolean
  setAuth: (user: CovenUser | null) => void
  setMonster: (monster: Monster | null) => void
  setAssessments: (assessments: Assessment[]) => void
  setEvents: (events: CalendarEvent[]) => void
  setPantry: (pantry: Ingredient[]) => void
  setNow: (now: Date) => void
  setMuted: (muted: boolean) => void
}

const saved = readSaved()

export const useCoven = create<CovenState>((set) => ({
  authReady: false,
  user: null,
  monster: null,
  ...saved,
  now: new Date(),
  muted: readMuted(),
  setAuth: (user) => set({ user, authReady: true }),
  setMonster: (monster) => set({ monster }),
  setAssessments: (assessments) => set({ assessments }),
  setEvents: (events) => set({ events }),
  setPantry: (pantry) => set({ pantry }),
  setNow: (now) => set({ now }),
  setMuted: (muted) => {
    writeMuted(muted)
    set({ muted })
  },
}))

useCoven.subscribe((s, prev) => {
  if (s.assessments !== prev.assessments || s.events !== prev.events || s.pantry !== prev.pantry)
    writeSaved({ assessments: s.assessments, events: s.events, pantry: s.pantry })
})

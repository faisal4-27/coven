import { create } from 'zustand'
import type { Assessment, CalendarEvent, CovenUser, Ingredient, Monster } from './types'

const MUTED_KEY = 'coven.muted'

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

export const useCoven = create<CovenState>((set) => ({
  authReady: false,
  user: null,
  monster: null,
  assessments: [],
  events: [],
  pantry: [],
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

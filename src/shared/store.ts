import { create } from 'zustand'
import type { Assessment, CalendarEvent, CovenUser, Ingredient, Monster } from './types'

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
  setAuth: (user: CovenUser | null) => void
  setMonster: (monster: Monster | null) => void
  setAssessments: (assessments: Assessment[]) => void
  setEvents: (events: CalendarEvent[]) => void
  setPantry: (pantry: Ingredient[]) => void
  setNow: (now: Date) => void
}

export const useCoven = create<CovenState>((set) => ({
  authReady: false,
  user: null,
  monster: null,
  assessments: [],
  events: [],
  pantry: [],
  now: new Date(),
  setAuth: (user) => set({ user, authReady: true }),
  setMonster: (monster) => set({ monster }),
  setAssessments: (assessments) => set({ assessments }),
  setEvents: (events) => set({ events }),
  setPantry: (pantry) => set({ pantry }),
  setNow: (now) => set({ now }),
}))

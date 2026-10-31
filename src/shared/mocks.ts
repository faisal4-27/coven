// Fake versions of every cross-feature contract (AGENTS.md section 5), so nobody is blocked.
import type {
  Assessment,
  CalendarEvent,
  CrunchWeek,
  Ingredient,
  MealSuggestion,
  RouteResult,
  StudyBlock,
} from './types'

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

export const mockAssessments: Assessment[] = [
  { id: 'a1', course: 'MAT224', title: 'Term Test 2', type: 'test', date: '2026-11-18', time: '18:00', weight: 25, location: 'EX', confidence: 0.95 },
  { id: 'a2', course: 'CSC263', title: 'Problem Set 3', type: 'assignment', date: '2026-11-20', weight: 10, confidence: 0.9 },
  { id: 'a3', course: 'STA247', title: 'Midterm', type: 'test', date: '2026-11-19', time: '10:00', weight: 30, location: 'MP', confidence: 0.85 },
  { id: 'a4', course: 'CSC209', title: 'Assignment 3', type: 'assignment', date: '2026-12-02', weight: 12, confidence: 0.6 },
  { id: 'a5', course: 'MAT224', title: 'Final Exam', type: 'exam', date: '2026-12-14', weight: 40, confidence: 0.9 },
]

export const mockEvents: CalendarEvent[] = [
  { id: 'e1', title: 'MAT224 Lecture', start: '2026-11-04T10:00', end: '2026-11-04T11:00', buildingCode: 'BA', kind: 'class' },
  { id: 'e2', title: 'CSC263 Tutorial', start: '2026-11-04T12:00', end: '2026-11-04T13:00', buildingCode: 'SS', kind: 'class' },
  { id: 'e3', title: 'Lunch', start: '2026-11-04T13:00', end: '2026-11-04T13:40', kind: 'meal' },
  { id: 'e4', title: 'STA247 Lecture', start: '2026-11-04T14:00', end: '2026-11-04T15:00', buildingCode: 'MP', kind: 'class' },
  { id: 'e5', title: 'Study at Robarts', start: '2026-11-04T15:30', end: '2026-11-04T17:30', buildingCode: 'RL', kind: 'study' },
]

export const mockPantry: Ingredient[] = [
  { name: 'instant ramen', quantity: '3 packs' },
  { name: 'eggs', quantity: '4' },
  { name: 'frozen peas' },
  { name: 'soy sauce' },
  { name: 'rice', quantity: '1 cup' },
]

export async function getRoute(
  from: string,
  to: string,
  _at: Date,
  opts?: { minimizeWalking?: boolean; avoidSun?: boolean },
): Promise<RouteResult> {
  await wait(300)
  return {
    path: [
      [-79.39695, 43.65968],
      [-79.39612, 43.65992],
      [-79.39745, 43.66288],
      [-79.39905, 43.66456],
    ],
    distanceM: 720,
    durationMin: 9,
    sunExposure: opts?.minimizeWalking ? 0.42 : 0.18,
    indoorFraction: 0.35,
    steps: [`Leave ${from} through the Galbraith tunnel`, 'Cross College St in the shade of Sandford Fleming', `Walk up St. George St to ${to}`],
  }
}

export async function extractAssessments(_file: File, _termStart: string): Promise<Assessment[]> {
  await wait(800)
  return mockAssessments
}

export function detectCrunchWeeks(items: Assessment[]): CrunchWeek[] {
  const weeks = new Map<string, Assessment[]>()
  for (const a of items) {
    const d = new Date(a.date + 'T12:00')
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
    const key = d.toISOString().slice(0, 10)
    weeks.set(key, [...(weeks.get(key) ?? []), a])
  }
  const phases: CrunchWeek['phase'][] = ['new', 'waxing-crescent', 'first-quarter', 'waxing-gibbous', 'full']
  return [...weeks.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, assessments]) => {
      const load = assessments.reduce((s, a) => s + a.weight, 0)
      return { weekStart, load, phase: phases[Math.min(4, Math.floor(load / 15))], assessments }
    })
}

export function planStudy(items: Assessment[], _weeks: CrunchWeek[], _busy: CalendarEvent[]): StudyBlock[] {
  return items.map((a) => {
    const start = new Date(a.date + 'T18:00')
    start.setDate(start.getDate() - 7)
    const end = new Date(start.getTime() + 2 * 3600_000)
    return { assessmentId: a.id, start: start.toISOString(), end: end.toISOString() }
  })
}

export async function scanPantry(_image: File): Promise<Ingredient[]> {
  await wait(800)
  return mockPantry
}

export async function suggestMeal(
  _pantry: Ingredient[],
  minutesFree: number,
  opts?: { lowEffort?: boolean },
): Promise<MealSuggestion[]> {
  await wait(400)
  const meals: MealSuggestion[] = [
    { name: 'Egg fried rice', minutes: 15, effort: 'low', uses: ['rice', 'eggs', 'frozen peas', 'soy sauce'], missing: ['green onion'], whereToGetMissing: 'Robarts Commons café' },
    { name: 'Upgraded ramen', minutes: 8, effort: 'low', uses: ['instant ramen', 'eggs'], missing: [] },
    { name: 'Chamomile wind-down tea', minutes: 4, effort: 'none', uses: [], missing: ['chamomile tea'], whereToGetMissing: 'Sid Smith Second Cup' },
  ]
  return meals.filter((m) => m.minutes <= minutesFree && (!opts?.lowEffort || m.effort !== 'medium'))
}

export async function planZombieDay(_date: Date): Promise<CalendarEvent[]> {
  await wait(500)
  return mockEvents.filter((e) => e.kind !== 'study' || e.id === 'e5')
}

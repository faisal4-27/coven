import type { Assessment, CalendarEvent, CrunchWeek, StudyBlock } from '../../shared/types'
import { addDays, atTime, dayKey, monday, parseDay } from './dates.ts'
export { extractAssessments, extractFromText } from './syllabus.ts'

const MINUTE = 60_000
const phases: CrunchWeek['phase'][] = ['new', 'waxing-crescent', 'first-quarter', 'waxing-gibbous', 'full']

export function validateAssessments(items: Assessment[]): void {
  if (items.length > 500) throw new Error('Please plan at most 500 assessments at a time.')
  const ids = new Set<string>()
  for (const item of items) {
    parseDay(item.date)
    if (!item.id || ids.has(item.id)) throw new Error('Assessment IDs must be unique.')
    ids.add(item.id)
    if (!item.course.trim() || !item.title.trim()) throw new Error('Every deadline needs a course and title.')
    if (!Number.isFinite(item.weight) || item.weight < 0 || item.weight > 100) throw new Error('Weights must be between 0 and 100%.')
    if (item.time) atTime(item.date, item.time)
  }
}

/** Workload moons, not astronomical phases. Includes quiet weeks between deadlines. */
export function detectCrunchWeeks(items: Assessment[]): CrunchWeek[] {
  validateAssessments(items)
  if (!items.length) return []
  const grouped = new Map<string, Assessment[]>()
  for (const item of items) {
    const key = monday(item.date)
    grouped.set(key, [...(grouped.get(key) ?? []), item])
  }
  const keys = [...grouped.keys()].sort()
  const start = parseDay(keys[0])
  const end = parseDay(keys[keys.length - 1])
  if (+end - +start > 730 * 86400_000) throw new Error('Keep deadlines within a two-year term window.')
  const weeks: CrunchWeek[] = []
  for (let date = start; date <= end; date = addDays(date, 7)) {
    const weekStart = dayKey(date)
    const assessments = grouped.get(weekStart) ?? []
    const load = assessments.reduce((sum, item) => sum + item.weight, 0)
    weeks.push({ weekStart, load, phase: phases[Math.min(4, Math.floor(load / 15))], assessments })
  }
  return weeks
}

export interface StudySettings {
  now: string
  startTime: string
  endTime: string
  dailyMinutes: number
  mode: 'pomodoro' | 'deep'
  lookbackDays: number
}

export interface StudyBreak { start: string; end: string; title: string }
export interface Unscheduled { assessmentId: string; minutes: number; reason: string }
export interface StudyPlan {
  blocks: StudyBlock[]
  breaks: StudyBreak[]
  unscheduled: Unscheduled[]
  requiredMinutes: number
}

export function defaultSettings(now = new Date()): StudySettings {
  return { now: now.toISOString(), startTime: '09:00', endTime: '20:00', dailyMinutes: 180, mode: 'pomodoro', lookbackDays: 21 }
}

interface Interval { start: number; end: number }
const overlaps = (a: Interval, b: Interval) => a.start < b.end && b.start < a.end

/** Give quiet weeks more room and protect heavy weeks from becoming heavier. */
function weekPriority(load: number): number {
  if (load >= 60) return 0.25
  if (load >= 45) return 0.5
  if (load >= 30) return 0.85
  if (load >= 15) return 1.35
  if (load > 0) return 1.75
  return 2.25
}

/** Adds explicit break reservations without changing the shared StudyBlock contract. */
export function createStudyPlan(items: Assessment[], weeks: CrunchWeek[], busy: CalendarEvent[], settings = defaultSettings()): StudyPlan {
  validateAssessments(items)
  const now = new Date(settings.now)
  if (!Number.isFinite(+now)) throw new Error('Choose a valid planning date.')
  if (!Number.isFinite(settings.dailyMinutes) || settings.dailyMinutes < 1 || settings.dailyMinutes > 720) throw new Error('Daily study limit must be 1–720 minutes.')
  if (!Number.isInteger(settings.lookbackDays) || settings.lookbackDays < 1 || settings.lookbackDays > 21) throw new Error('Plan 1–21 days before each deadline.')
  if (atTime(dayKey(now), settings.endTime) <= atTime(dayKey(now), settings.startTime)) throw new Error('Study hours must end after they start.')
  const occupied: Interval[] = busy.map(event => {
    const interval = { start: +new Date(event.start), end: +new Date(event.end) }
    if (!Number.isFinite(interval.start) || !Number.isFinite(interval.end) || interval.end <= interval.start) throw new Error(`Fix the calendar event “${event.title}” before planning.`)
    return interval
  })
  const blocks: StudyBlock[] = []
  const breaks: StudyBreak[] = []
  const totals = new Map<string, number>()
  const counts = new Map<string, number>()
  const loads = new Map(weeks.map(week => [week.weekStart, week.load]))
  const focus = settings.mode === 'deep' ? 50 : 25
  const rest = settings.mode === 'deep' ? 10 : 5
  const remaining = new Map(items.map(item => [item.id, Math.ceil(item.weight * 60)]))
  const requiredMinutes = [...remaining.values()].reduce((a, b) => a + b, 0)
  const sorted = [...items].sort((a, b) => `${a.date}T${a.time ?? '23:59'}`.localeCompare(`${b.date}T${b.time ?? '23:59'}`) || a.id.localeCompare(b.id))
  const candidates = new Map<string, string[]>()
  for (const item of sorted) {
    const due = atTime(item.date, item.time ?? '23:59')
    const days: string[] = []
    for (let date = addDays(parseDay(item.date), -settings.lookbackDays); dayKey(date) <= item.date; date = addDays(date, 1)) {
      const day = dayKey(date)
      if (day >= dayKey(now) && +atTime(day, settings.startTime) < +due) days.push(day)
    }
    candidates.set(item.id, days)
    // Existing study commitments consume the daily cap, including those crossing midnight.
    for (const day of days) {
      if (totals.has(day)) continue
      const dayStart = +atTime(day, '00:00')
      const dayEnd = +atTime(dayKey(addDays(parseDay(day), 1)), '00:00')
      totals.set(day, busy.filter(event => event.kind === 'study').reduce((sum, event) => sum + Math.max(0, Math.min(+new Date(event.end), dayEnd) - Math.max(+new Date(event.start), dayStart)) / MINUTE, 0))
    }
  }
  // Round robin avoids allocating every available day to the first course.
  let progress = true
  while (progress) {
    progress = false
    for (const item of sorted) {
      const left = remaining.get(item.id) ?? 0
      if (left <= 0) continue
      const due = +atTime(item.date, item.time ?? '23:59')
      const days = [...(candidates.get(item.id) ?? [])].sort((a, b) => {
        const score = (day: string) => {
          const load = loads.get(monday(day)) ?? 0
          // Lower scores win: quiet weeks absorb more preparation, while
          // full-moon weeks only receive work when it cannot be moved.
          return (totals.get(day) ?? 0) / weekPriority(load) + load * 0.25
        }
        return score(a) - score(b) || a.localeCompare(b)
      })
      for (const day of days) {
        const capacity = Math.floor(settings.dailyMinutes - (totals.get(day) ?? 0))
        const minutes = Math.min(focus, left, capacity)
        if (minutes <= 0) continue
        const breakMinutes = ((counts.get(day) ?? 0) + 1) % 4 === 0 ? (settings.mode === 'deep' ? 20 : 15) : rest
        const endLimit = Math.min(+atTime(day, settings.endTime), due)
        let cursor = Math.ceil(Math.max(+now, +atTime(day, settings.startTime)) / MINUTE) * MINUTE
        const intervals = occupied.filter(interval => interval.end > cursor && interval.start < endLimit).sort((a, b) => a.start - b.start)
        const reservationMs = (minutes + breakMinutes) * MINUTE
        for (const interval of intervals) {
          if (cursor + reservationMs <= interval.start) break
          if (overlaps({ start: cursor, end: cursor + reservationMs }, interval)) cursor = interval.end
        }
        if (cursor + reservationMs > endLimit) continue
        const end = cursor + minutes * MINUTE
        blocks.push({ assessmentId: item.id, start: new Date(cursor).toISOString(), end: new Date(end).toISOString() })
        breaks.push({ start: new Date(end).toISOString(), end: new Date(end + breakMinutes * MINUTE).toISOString(), title: breakMinutes >= 15 ? 'Long break · step away' : 'Break · stretch & hydrate' })
        occupied.push({ start: cursor, end: end + breakMinutes * MINUTE })
        totals.set(day, (totals.get(day) ?? 0) + minutes)
        counts.set(day, (counts.get(day) ?? 0) + 1)
        remaining.set(item.id, left - minutes)
        progress = true
        break
      }
    }
  }
  const unscheduled = sorted.filter(item => (remaining.get(item.id) ?? 0) > 0).map(item => ({ assessmentId: item.id, minutes: remaining.get(item.id) ?? 0, reason: +atTime(item.date, item.time ?? '23:59') <= +now ? 'Deadline has passed.' : 'No room before the deadline within your hours, breaks, commitments and daily cap.' }))
  return { blocks: blocks.sort((a, b) => a.start.localeCompare(b.start)), breaks: breaks.sort((a, b) => a.start.localeCompare(b.start)), unscheduled, requiredMinutes }
}

/** Fixed shared contract; consumers needing breaks/shortfalls use createStudyPlan. */
export function planStudy(items: Assessment[], weeks: CrunchWeek[], busy: CalendarEvent[]): StudyBlock[] {
  return createStudyPlan(items, weeks, busy).blocks
}

export const PLAN_PREFIX = 'banshee-plan:'
export function planEvents(plan: StudyPlan, items: Assessment[]): CalendarEvent[] {
  return [
    ...plan.blocks.map((block, index): CalendarEvent => ({ id: `${PLAN_PREFIX}study:${index}`, title: `${items.find(item => item.id === block.assessmentId)?.course ?? 'Course'} · ${items.find(item => item.id === block.assessmentId)?.title ?? 'Study'}`, start: block.start, end: block.end, kind: 'study' })),
    ...plan.breaks.map((pause, index): CalendarEvent => ({ id: `${PLAN_PREFIX}break:${index}`, title: pause.title, start: pause.start, end: pause.end, kind: 'other' })),
  ].sort((a, b) => a.start.localeCompare(b.start))
}

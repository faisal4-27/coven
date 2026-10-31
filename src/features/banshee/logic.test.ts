// @ts-nocheck
import test from 'node:test'
import assert from 'node:assert/strict'
import { createStudyPlan, defaultSettings, detectCrunchWeeks, planEvents, planStudy } from './logic.ts'
import { extractFromText, readAssessments } from './syllabus.ts'
import { dayKey, monday } from './dates.ts'
import type { Assessment, CalendarEvent } from '../../shared/types'

const item = (patch: Partial<Assessment> = {}): Assessment => ({ id: 'a', course: 'MAT224', title: 'Test', type: 'test', date: '2026-11-18', weight: 2, confidence: 1, ...patch })
const settings = { ...defaultSettings(new Date('2026-11-02T08:00:00')), dailyMinutes: 60 }
const busy: CalendarEvent[] = [{ id: 'lecture', title: 'Lecture', start: '2026-11-02T09:00:00', end: '2026-11-02T12:00:00', kind: 'class' }]
const overlap = (a: { start: string; end: string }, b: { start: string; end: string }) => +new Date(a.start) < +new Date(b.end) && +new Date(b.start) < +new Date(a.end)

test('Monday grouping, threshold phases, quiet weeks and year boundary', () => {
  assert.equal(monday('2027-01-03'), '2026-12-28')
  const weeks = detectCrunchWeeks([item({ weight: 30 }), item({ id: 'b', weight: 30, date: '2026-11-22' }), item({ id: 'c', date: '2026-12-01', weight: 15 })])
  assert.deepEqual(weeks.map(week => [week.weekStart, week.load, week.phase]), [['2026-11-16', 60, 'full'], ['2026-11-23', 0, 'new'], ['2026-11-30', 15, 'waxing-crescent']])
  for (const [weight, phase] of [[0, 'new'], [14.9, 'new'], [15, 'waxing-crescent'], [30, 'first-quarter'], [45, 'waxing-gibbous'], [60, 'full']] as const) assert.equal(detectCrunchWeeks([item({ weight })])[0].phase, phase)
})

test('all study and real breaks are nonoverlapping, future, within hours and before deadlines', () => {
  const items = [item(), item({ id: 'b', weight: 3, time: '10:00' })]
  const plan = createStudyPlan(items, detectCrunchWeeks(items), busy, settings)
  assert.equal(plan.unscheduled.length, 0)
  assert.equal(plan.blocks.length, plan.breaks.length)
  const reservations = [...plan.blocks, ...plan.breaks]
  for (let index = 0; index < reservations.length; index++) {
    const block = reservations[index]
    assert.ok(+new Date(block.start) >= +new Date(settings.now))
    assert.ok(new Date(block.start).getHours() >= 9)
    assert.ok(new Date(block.end).getHours() <= 20)
    for (const event of busy) assert.ok(!overlap(block, event))
    for (const other of reservations.slice(index + 1)) assert.ok(!overlap(block, other))
  }
  const daily = new Map<string, number>()
  for (const block of plan.blocks) {
    const due = items.find(row => row.id === block.assessmentId)!
    assert.ok(+new Date(block.end) < +new Date(`${due.date}T${due.time ?? '23:59'}`))
    const day = dayKey(new Date(block.start))
    daily.set(day, (daily.get(day) ?? 0) + (+new Date(block.end) - +new Date(block.start)) / 60000)
  }
  assert.ok([...daily.values()].every(minutes => minutes <= 60))
  assert.equal([...daily.values()].reduce((a, b) => a + b, 0), 300)
})

test('existing study consumes cap; a completely busy window yields exact shortfall', () => {
  const items = [item({ date: '2026-11-02', weight: 2 })]
  const events: CalendarEvent[] = [{ id: 'old-study', title: 'Old study', kind: 'study', start: '2026-11-02T09:00:00', end: '2026-11-02T10:00:00' }]
  const plan = createStudyPlan(items, detectCrunchWeeks(items), events, settings)
  assert.equal(plan.blocks.length, 0)
  assert.equal(plan.unscheduled[0].minutes, 120)
})

test('deep focus long breaks reserve twenty minutes after the fourth session', () => {
  const items = [item({ date: '2026-11-02', weight: 4 })]
  const plan = createStudyPlan(items, detectCrunchWeeks(items), [], { ...settings, dailyMinutes: 300, mode: 'deep' })
  assert.equal(plan.breaks.length, 5)
  assert.equal((+new Date(plan.breaks[3].end) - +new Date(plan.breaks[3].start)) / 60000, 20)
  assert.equal(plan.unscheduled.length, 0)
})

test('full moon allocations move to available quiet weeks', () => {
  const items = [item({ weight: 60 })]
  const plan = createStudyPlan(items, detectCrunchWeeks(items), [], { ...settings, dailyMinutes: 480 })
  assert.ok(plan.blocks.every(block => monday(dayKey(new Date(block.start))) !== '2026-11-16'))
  assert.equal(plan.unscheduled.length, 0)
})

test('lighter days are preferred before adding more work to a heavy week', () => {
  const items = [item({ weight: 12, date: '2026-11-18' })]
  const plan = createStudyPlan(items, detectCrunchWeeks(items), [], { ...settings, dailyMinutes: 60 })
  const byDay = new Map<string, number>()
  for (const block of plan.blocks) {
    const day = dayKey(new Date(block.start))
    byDay.set(day, (byDay.get(day) ?? 0) + (+new Date(block.end) - +new Date(block.start)) / 60000)
  }
  assert.ok((byDay.get('2026-11-02') ?? 0) > 0)
  assert.equal(byDay.get('2026-11-16') ?? 0, 0)
})

test('past deadlines report unscheduled work and invalid inputs fail clearly', () => {
  const items = [item({ date: '2026-11-01' })]
  const plan = createStudyPlan(items, detectCrunchWeeks(items), [], settings)
  assert.equal(plan.blocks.length, 0)
  assert.equal(plan.unscheduled[0].reason, 'Deadline has passed.')
  assert.throws(() => detectCrunchWeeks([item({ date: '2026-02-30' })]))
  assert.throws(() => detectCrunchWeeks([item({ weight: -1 })]))
  assert.throws(() => detectCrunchWeeks([item(), item()]))
  assert.throws(() => createStudyPlan([item()], [], [], { ...settings, endTime: '08:00' }))
  assert.throws(() => createStudyPlan([item()], [], [{ ...busy[0], end: 'garbage' }], settings))
})

test('breaks fit before class and exact time deadline; touching intervals are legal', () => {
  const items = [item({ date: '2026-11-02', time: '10:00', weight: 0.5 })]
  const events: CalendarEvent[] = [{ ...busy[0], start: '2026-11-02T09:30:00', end: '2026-11-02T10:00:00' }]
  const plan = createStudyPlan(items, [], events, settings)
  assert.equal(plan.blocks.length, 1)
  assert.equal(plan.unscheduled[0].minutes, 5)
  assert.equal(+new Date(plan.breaks[0].end), +new Date(events[0].start))
})

test('local calendar grouping survives DST; shared wrapper and event shapes stay compatible', () => {
  assert.equal(monday('2026-11-01'), '2026-10-26')
  assert.deepEqual(planStudy([], [], []), [])
  const items = [item()]
  const plan = createStudyPlan(items, [], [], settings)
  const events = planEvents(plan, items)
  assert.equal(events.length, plan.blocks.length * 2)
  assert.ok(events.every(event => event.id.startsWith('banshee-plan:')))
  assert.ok(events.some(event => event.kind === 'other'))
})

test('text/JSON extraction is conservative and relative dates require tutorial day', () => {
  const rows = extractFromText('MAT224 | Term Test | 2026-11-18 | 25%', '2026-09-07')
  assert.equal(rows[0].weight, 25)
  assert.ok(rows[0].confidence < 0.8)
  assert.throws(() => extractFromText('MAT224 Quiz Week 7 5%', '2026-09-07'))
  assert.equal(extractFromText('MAT224 Quiz Week 7 5%', '2026-09-07', 3)[0].date, '2026-10-21')
  assert.throws(() => readAssessments([{ course: 'X', title: 'Test', date: '2026-02-30', weight: 10 }]))
  assert.throws(() => readAssessments([{ course: 'X', title: 'Test', date: '2026-11-18', weight: 101 }]))
})

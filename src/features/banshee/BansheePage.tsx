import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import { useCoven } from '../../shared/store'
import type { Assessment, CalendarEvent, CrunchWeek } from '../../shared/types'
import { banshee, bat, tombstone } from '../../shared/sprites'
import { Card, EmptyState, Loading, MoonIcon, PageHeader, PixelButton, PixelSprite, Starfield } from '../../shared/ui'
import { PLAN_PREFIX, defaultSettings, detectCrunchWeeks, planEvents } from './logic'
import type { StudyPlan, StudySettings } from './logic'
import { addDays, atTime, dayKey, monday, parseDay, shortDate } from './dates'
import { DeadlineForm } from './DeadlineForm'
import { SyllabusImport } from './SyllabusImport'
import './banshee.css'

const hours = (minutes: number) => `${Math.round(minutes / 6) / 10}h`
const clock = (value: string) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

export function BansheePage() {
  const assessments = useCoven(state => state.assessments)
  const events = useCoven(state => state.events)
  const now = useCoven(state => state.now)
  const today = dayKey(now)
  const [settings, setSettings] = useState<StudySettings>(() => defaultSettings(now))
  const [editing, setEditing] = useState<Assessment | 'new'>()
  const [selectedWeek, setSelectedWeek] = useState('')
  const [scheduleWeek, setScheduleWeek] = useState(monday(today))
  const [day, setDay] = useState(today)
  const [view, setView] = useState<'week' | 'day'>('week')
  const [plan, setPlan] = useState<StudyPlan>()
  const [planSignature, setPlanSignature] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [pendingDelete, setPendingDelete] = useState<string>()
  const worker = useRef<Worker | null>(null)
  useEffect(() => () => worker.current?.terminate(), [])
  const busy = useMemo(() => events.filter(event => !event.id.startsWith(PLAN_PREFIX)), [events])
  const effectiveSettings = useMemo(() => ({ ...settings, now: now.toISOString() }), [settings, now])
  const signature = JSON.stringify({ assessments, busy, settings: effectiveSettings })
  const fresh = !!plan && signature === planSignature
  const analysis = useMemo(() => {
    try { return { weeks: detectCrunchWeeks(assessments), error: '' } }
    catch (reason) { return { weeks: [] as CrunchWeek[], error: reason instanceof Error ? reason.message : 'Check your deadlines.' } }
  }, [assessments])
  const weeks = analysis.weeks
  const activeWeek = weeks.find(week => week.weekStart === selectedWeek) ?? weeks.find(week => week.assessments.some(item => item.date >= today)) ?? weeks[0]
  const nextFull = weeks.find(week => week.phase === 'full' && week.assessments.some(item => item.date >= today))
  const countdown = nextFull ? Math.max(0, Math.round((Date.UTC(parseDay(nextFull.weekStart).getFullYear(), parseDay(nextFull.weekStart).getMonth(), parseDay(nextFull.weekStart).getDate()) - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / 86400_000)) : 0
  const displayedEvents = fresh && plan ? [...busy, ...planEvents(plan, assessments)] : events
  const scheduleDays = view === 'day' ? [day] : Array.from({ length: 7 }, (_, index) => dayKey(addDays(parseDay(scheduleWeek), index)))
  function saveItems(items: Assessment[]) {
    const state = useCoven.getState()
    state.setAssessments(items)
    state.setEvents(state.events.filter(event => !event.id.startsWith(PLAN_PREFIX)))
    setNotice('Deadlines updated. Generate a fresh study plan when ready.')
  }
  function generate() {
    worker.current?.terminate()
    setLoading(true); setError(''); setNotice('')
    try {
      const instance = new Worker(new URL('./planner.worker.ts', import.meta.url), { type: 'module' })
      worker.current = instance
      instance.onmessage = (event: MessageEvent<{ plan?: StudyPlan; error?: string }>) => {
        setLoading(false)
        if (event.data.error) setError(event.data.error)
        if (event.data.plan) { setPlan(event.data.plan); setPlanSignature(signature); setScheduleWeek(monday(today)); setDay(today); setNotice('Preview ready. Add to calendar to share sessions and breaks with Coven.') }
        instance.terminate()
      }
      instance.onerror = () => { setError('The planner could not start. Please try again.'); setLoading(false); instance.terminate() }
      instance.postMessage({ items: assessments, weeks, busy, settings: effectiveSettings })
    } catch (reason) { setLoading(false); setError(reason instanceof Error ? reason.message : 'Unable to start the planner.') }
  }
  function applyPlan() {
    if (!plan || !fresh) return
    const state = useCoven.getState()
    state.setEvents([...state.events.filter(event => !event.id.startsWith(PLAN_PREFIX)), ...planEvents(plan, assessments)])
    setNotice('Study sessions and breaks added to the shared Coven calendar. Your existing commitments are preserved.')
  }
  function demo() {
    if (assessments.length) return
    saveItems([
      { id: crypto.randomUUID(), course: 'MAT224', title: 'Problem Set 3', type: 'assignment', date: dayKey(addDays(now, 10)), weight: 5, confidence: 1 },
      { id: crypto.randomUUID(), course: 'CSC263', title: 'Reading quiz', type: 'quiz', date: dayKey(addDays(now, 14)), weight: 4, confidence: 1 },
      { id: crypto.randomUUID(), course: 'STA247', title: 'Midterm', type: 'test', date: dayKey(addDays(now, 21)), time: '10:00', weight: 15, confidence: 1 },
      { id: crypto.randomUUID(), course: 'CSC209', title: 'Lab report', type: 'lab', date: dayKey(addDays(now, 30)), weight: 8, confidence: 1 },
    ])
    setNotice('Sample deadlines added relative to Coven’s current date. Your calendar has not been changed.')
  }
  return <div className="bn-page" style={{ '--accent': 'var(--color-banshee)' } as CSSProperties}>
    <PageHeader monster="banshee" title="Banshee · crunch moons" subtitle="See the storm. Study before it arrives." />
    <main className="bn-main">
      <section className="bn-hero" aria-labelledby="bn-title">
        <Starfield count={24} />
        <div className="bn-hero-copy"><p className="bn-eyebrow">THE DEADLINE ORACLE / COVEN</p><h2 id="bn-title">Doom is coming.<br /><span>You have a plan.</span></h2><p>Read your crunch moons, protect your breaks, and get ahead of the week that howls.</p><div className="bn-actions"><PixelButton accent="banshee" onClick={() => setEditing('new')}>+ Add deadline</PixelButton>{!assessments.length && <PixelButton accent="banshee" variant="ghost" onClick={demo}>Try sample term</PixelButton>}</div></div>
        <div className="bn-graveyard" aria-hidden="true"><div className="bn-big-moon"><MoonIcon phase={nextFull ? 'full' : 'waxing-crescent'} scale={8} /></div><PixelSprite sprite={bat} scale={3} className="bn-bat anim-flap" /><PixelSprite sprite={banshee} scale={5} className="bn-ghost anim-bob" /><PixelSprite sprite={tombstone} scale={3} className="bn-stone" /><div className="bn-trees" /><div className="bn-ground" /></div>
      </section>
      <div className="bn-stats"><div><strong>{assessments.filter(item => item.date >= today).length}</strong><span>deadlines ahead</span></div><div><strong>{nextFull ? countdown === 0 ? 'This week' : `${countdown} days` : 'Clear skies'}</strong><span>until the next full crunch moon</span></div><div><strong>{fresh && plan ? hours(plan.blocks.reduce((sum, block) => sum + (+new Date(block.end) - +new Date(block.start)) / 60000, 0)) : 'Make room'}</strong><span>{fresh ? 'study time in your preview' : 'for focus, rest & real life'}</span></div></div>
      {(error || analysis.error) && <p role="alert" className="bn-warning">{error || analysis.error}</p>}
      <div role="status" aria-live="polite" className={notice ? 'bn-notice' : ''}>{notice}</div>
      <Card className="bn-section" aria-labelledby="bn-moons"><div className="bn-section-heading"><div><p className="bn-eyebrow">01 / READ THE SKY</p><h2 id="bn-moons">Your term, in moons</h2></div><p className="bn-muted">Moons show workload, not the night sky.</p></div>
        {!weeks.length ? <EmptyState title="The sky is waiting">Add deadlines or try a sample term to reveal your crunch moons.</EmptyState> : <><div className="bn-moons" aria-label="Select a deadline week">{weeks.map(week => <button type="button" key={week.weekStart} aria-pressed={activeWeek?.weekStart === week.weekStart} className={`bn-moon ${week.phase === 'full' ? 'bn-full' : ''}`} onClick={() => setSelectedWeek(week.weekStart)}><span>{shortDate(week.weekStart)}</span><MoonIcon phase={week.phase} scale={4} /><strong>{week.load}%</strong><small>{week.phase === 'full' ? 'CRUNCH' : week.load ? 'grade weight' : 'quiet week'}</small></button>)}</div><p className="bn-legend">New: &lt;15% · Crescent: 15–29% · Quarter: 30–44% · Gibbous: 45–59% · Full: 60%+ combined grade weight</p>{activeWeek && <div className="bn-week-detail"><h3>Week of {shortDate(activeWeek.weekStart)} <span> / {activeWeek.assessments.length} deadlines · {activeWeek.load}%</span></h3>{activeWeek.assessments.length ? activeWeek.assessments.map(item => <p key={item.id}><strong>{item.course}</strong> {item.title} <span>{shortDate(item.date)} · {item.weight}%</span></p>) : <p className="bn-muted">No deadlines. A good week to prepare for what comes next.</p>}</div>}</>}
      </Card>
      <div className="bn-columns"><Card className="bn-section" aria-labelledby="bn-deadlines"><div className="bn-section-heading"><div><p className="bn-eyebrow">02 / NAME YOUR DOOM</p><h2 id="bn-deadlines">Deadline grimoire</h2></div><PixelButton accent="banshee" variant="ghost" onClick={() => setEditing('new')}>+ Add</PixelButton></div>
        {editing && <DeadlineForm key={typeof editing === 'string' ? 'new' : editing.id} initial={typeof editing === 'string' ? undefined : editing} today={today} onCancel={() => setEditing(undefined)} onSave={item => { const current = useCoven.getState().assessments; saveItems(current.some(row => row.id === item.id) ? current.map(row => row.id === item.id ? item : row) : [...current, item]); setEditing(undefined) }} />}
        {!assessments.length && !editing ? <EmptyState title="No doom on the books">Add a deadline manually or import syllabus text below.</EmptyState> : <ul className="bn-deadlines">{[...assessments].sort((a, b) => a.date.localeCompare(b.date)).map(item => <li key={item.id}><div className="bn-deadline-date"><strong>{shortDate(item.date)}</strong><span>{item.time ?? 'End of day'}</span></div><div className="bn-deadline-info"><small>{item.course} / {item.type}</small><h3>{item.title}</h3><p>{item.weight}% of grade{item.location ? ` · ${item.location}` : ''}{item.date < today ? ' · Past deadline' : ''}</p>{item.confidence < 0.8 && <span className="bn-review-tag">Review extracted details</span>}</div><div className="bn-row-actions"><button type="button" aria-label={`Edit ${item.title}`} onClick={() => setEditing(item)}>Edit</button>{pendingDelete === item.id ? <><button type="button" onClick={() => { saveItems(useCoven.getState().assessments.filter(row => row.id !== item.id)); setPendingDelete(undefined) }}>Confirm removal</button><button type="button" onClick={() => setPendingDelete(undefined)}>Keep</button></> : <button type="button" aria-label={`Remove ${item.title}`} onClick={() => setPendingDelete(item.id)}>Remove</button>}</div></li>)}</ul>}
        <SyllabusImport today={today} onConfirm={items => saveItems([...useCoven.getState().assessments, ...items])} />
      </Card>
      <Card className="bn-section" aria-labelledby="bn-study"><p className="bn-eyebrow">03 / PROTECT YOUR ENERGY</p><h2 id="bn-study">A kinder study spell</h2><p className="bn-muted">About one study hour per 1% grade weight, spread over the previous three weeks. Quiet weeks get priority. All times use this device’s timezone.</p>
        <div className="bn-fields"><label>Focus rhythm<select value={settings.mode} onChange={event => setSettings({ ...settings, mode: event.target.value as StudySettings['mode'] })}><option value="pomodoro">Pomodoro · 25 focus / 5 rest</option><option value="deep">Deep focus · 50 focus / 10 rest</option></select></label><label>Daily study cap (hours)<input type="number" min="0.5" max="12" step="0.5" value={settings.dailyMinutes / 60} onChange={event => setSettings({ ...settings, dailyMinutes: event.target.valueAsNumber * 60 })} /></label><label>Start studying<input type="time" required value={settings.startTime} onChange={event => setSettings({ ...settings, startTime: event.target.value })} /></label><label>Finish studying<input type="time" required value={settings.endTime} onChange={event => setSettings({ ...settings, endTime: event.target.value })} /></label></div>
        <p className="bn-muted">Every fourth session gets a longer break. Existing study counts toward the daily cap; breaks reserve calendar time.</p>
        <div className="bn-actions"><PixelButton accent="banshee" disabled={loading || !assessments.length || !!analysis.error} onClick={generate}>Generate study plan</PixelButton>{plan && <PixelButton accent="banshee" variant="ghost" disabled={!fresh || loading} onClick={applyPlan}>Add to calendar</PixelButton>}</div>
        {loading && <Loading label="Finding quiet hours…" />}
        {plan && !fresh && <p className="bn-warning">Your deadlines, settings or calendar changed. Generate again before adding this plan.</p>}
        {fresh && plan && <div className="bn-plan-summary"><h3>{plan.blocks.length} focus sessions · {plan.breaks.length} real breaks</h3><p>{hours(plan.requiredMinutes)} requested · {hours(plan.unscheduled.reduce((sum, row) => sum + row.minutes, 0))} still needs room</p>{!!plan.unscheduled.length && <div className="bn-warning"><h3>Some workload won’t fit</h3>{plan.unscheduled.map(row => <p key={row.assessmentId}><strong>{assessments.find(item => item.id === row.assessmentId)?.title}: {hours(row.minutes)} remaining.</strong> {row.reason}</p>)}<p>Consider changing your hours, reducing the study estimate by adjusting deadlines only if accurate, or discussing workload with your instructor.</p></div>}</div>}
        <BusyForm today={today} onError={setError} />
      </Card></div>
      <Card className="bn-section" aria-labelledby="bn-calendar"><div className="bn-section-heading"><div><p className="bn-eyebrow">04 / WALK THE PATH</p><h2 id="bn-calendar">{fresh ? 'Study plan preview' : 'Your shared calendar'}</h2></div><div className="bn-actions"><button type="button" aria-pressed={view === 'week'} onClick={() => setView('week')}>Week</button><button type="button" aria-pressed={view === 'day'} onClick={() => setView('day')}>Day</button></div></div>
        <div className="bn-calendar-controls">{view === 'week' ? <><button type="button" aria-label="Previous week" onClick={() => setScheduleWeek(dayKey(addDays(parseDay(scheduleWeek), -7)))}>←</button><span>{shortDate(scheduleWeek)} – {shortDate(dayKey(addDays(parseDay(scheduleWeek), 6)))}</span><button type="button" aria-label="Next week" onClick={() => setScheduleWeek(dayKey(addDays(parseDay(scheduleWeek), 7)))}>→</button><button type="button" onClick={() => setScheduleWeek(monday(today))}>Today</button></> : <label>Day<input type="date" required value={day} onChange={event => { if (event.target.value) setDay(event.target.value) }} /></label>}</div>
        <p className="bn-legend">Blue: study · Gold: break · Purple: existing commitments{fresh ? ' · Preview until added to calendar' : ''}</p>
        <div className={`bn-agenda ${view === 'day' ? 'bn-day-view' : ''}`}>{scheduleDays.map(date => {
          const start = +atTime(date, '00:00'); const end = +atTime(dayKey(addDays(parseDay(date), 1)), '00:00')
          const daily = displayedEvents.filter(event => +new Date(event.start) < end && +new Date(event.end) > start).sort((a, b) => a.start.localeCompare(b.start))
          return <section className="bn-agenda-day" key={date}><h3>{parseDay(date).toLocaleDateString(undefined, { weekday: 'short' })}<span>{shortDate(date)}</span></h3>{!daily.length && <p className="bn-muted">Unclaimed hours</p>}{daily.map(event => <div key={event.id} className={`bn-event ${event.id.startsWith(`${PLAN_PREFIX}break`) ? 'bn-break' : event.kind === 'study' ? 'bn-focus' : ''}`}><small>{+new Date(event.start) < start ? 'Continues' : clock(event.start)} – {+new Date(event.end) > end ? 'next day' : clock(event.end)}</small><p>{event.title}</p></div>)}</section>
        })}</div>
      </Card>
      <p className="bn-footer">A little less doom. A little more room to breathe. / BANSHEE, BY COVEN<br />Shared data lasts for this app session. Re-add or re-import deadlines after a reload.</p>
    </main>
  </div>
}

function BusyForm({ today, onError }: { today: string; onError: (error: string) => void }) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(today)
  const [start, setStart] = useState('12:00')
  const [end, setEnd] = useState('13:00')
  function submit(event: FormEvent) {
    event.preventDefault()
    try {
      const from = atTime(date, start); const to = atTime(date, end)
      if (to <= from) throw new Error('A commitment must end after it starts.')
      const state = useCoven.getState()
      const item: CalendarEvent = { id: `banshee-busy:${crypto.randomUUID()}`, title: title.trim(), start: from.toISOString(), end: to.toISOString(), kind: 'other' }
      state.setEvents([...state.events, item]); setTitle(''); onError('')
    } catch (reason) { onError(reason instanceof Error ? reason.message : 'Check your commitment.') }
  }
  return <details className="bn-import"><summary>Protect a class, shift or other commitment</summary><p className="bn-muted">Existing Coven events are already avoided. Add individual occurrences here; repeat classes must each be included.</p><form onSubmit={submit}><div className="bn-fields"><label>Commitment<input required maxLength={100} value={title} onChange={event => setTitle(event.target.value)} /></label><label>Date<input required type="date" value={date} onChange={event => setDate(event.target.value)} /></label><label>Starts<input required type="time" value={start} onChange={event => setStart(event.target.value)} /></label><label>Ends<input required type="time" value={end} onChange={event => setEnd(event.target.value)} /></label></div><PixelButton type="submit" accent="banshee" variant="ghost">Add commitment</PixelButton></form></details>
}

export default BansheePage

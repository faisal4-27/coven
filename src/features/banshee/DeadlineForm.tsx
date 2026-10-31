import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Assessment } from '../../shared/types'
import { PixelButton } from '../../shared/ui'
import { validateAssessments } from './logic'

export function DeadlineForm({ initial, today, onSave, onCancel }: { initial?: Assessment; today: string; onSave: (item: Assessment) => void; onCancel: () => void }) {
  const [value, setValue] = useState<Assessment>(initial ?? { id: crypto.randomUUID(), course: '', title: '', type: 'assignment', date: today, weight: 10, confidence: 1 })
  const [error, setError] = useState('')
  function submit(event: FormEvent) {
    event.preventDefault()
    try { validateAssessments([value]); onSave({ ...value, course: value.course.trim().toUpperCase(), title: value.title.trim(), confidence: 1 }) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Check this deadline.') }
  }
  return <form onSubmit={submit} className="bn-form">
    <h3>{initial ? 'Edit deadline' : 'Summon a deadline'}</h3>
    <div className="bn-fields">
      <label>Course<input required maxLength={30} placeholder="MAT224" value={value.course} onChange={event => setValue({ ...value, course: event.target.value })} /></label>
      <label>Assessment title<input required maxLength={160} placeholder="Term Test 2" value={value.title} onChange={event => setValue({ ...value, title: event.target.value })} /></label>
      <label>Type<select value={value.type} onChange={event => setValue({ ...value, type: event.target.value as Assessment['type'] })}>{['assignment', 'test', 'exam', 'lab', 'quiz', 'project', 'other'].map(type => <option key={type}>{type}</option>)}</select></label>
      <label>Due date<input required type="date" value={value.date} onChange={event => setValue({ ...value, date: event.target.value })} /></label>
      <label>Due time (optional)<input type="time" value={value.time ?? ''} onChange={event => setValue({ ...value, time: event.target.value || undefined })} /></label>
      <label>Grade weight (%)<input required type="number" min="0" max="100" step="0.1" value={value.weight} onChange={event => setValue({ ...value, weight: event.target.valueAsNumber })} /></label>
      <label>Location (optional)<input maxLength={60} value={value.location ?? ''} onChange={event => setValue({ ...value, location: event.target.value })} /></label>
    </div>
    {error && <p role="alert">{error}</p>}
    <div className="bn-actions"><PixelButton accent="banshee" type="submit">Save deadline</PixelButton><PixelButton accent="banshee" variant="ghost" onClick={onCancel}>Cancel</PixelButton></div>
  </form>
}

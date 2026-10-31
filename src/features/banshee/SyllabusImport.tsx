import { useState } from 'react'
import type { Assessment } from '../../shared/types'
import { Loading, PixelButton } from '../../shared/ui'
import { extractAssessments, extractFromText } from './syllabus'
import { DeadlineForm } from './DeadlineForm'

export function SyllabusImport({ today, onConfirm }: { today: string; onConfirm: (items: Assessment[]) => void }) {
  const [termStart, setTermStart] = useState(today)
  const [tutorialDay, setTutorialDay] = useState(1)
  const [text, setText] = useState('')
  const [rows, setRows] = useState<Assessment[]>([])
  const [editing, setEditing] = useState<Assessment>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  async function upload(file: File) {
    setLoading(true); setError('')
    try { setRows(await extractAssessments(file, termStart, tutorialDay)) }
    catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Could not read the syllabus.'
      setError(message === 'Failed to fetch' ? 'Cannot reach /api/extract-syllabus. Start Coven with `vercel dev` instead of only `npm run dev`, then try the PDF again.' : message)
    }
    finally { setLoading(false) }
  }
  return <details className="bn-import"><summary>Import a syllabus <span>PDF · TXT · JSON · pasted text</span></summary>
    <p className="bn-muted">Review every date and grade weight before adding. Scanned PDFs are not supported. Best-of rules must be adjusted manually.</p>
    <div className="bn-fields">
      <label>Term start<input type="date" required value={termStart} onChange={event => setTermStart(event.target.value)} /></label>
      <label>Tutorial day (for Week N text)<select value={tutorialDay} onChange={event => setTutorialDay(Number(event.target.value))}>{['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, index) => <option value={index} key={day}>{day}</option>)}</select></label>
      <label>Syllabus file<input type="file" accept=".pdf,.txt,.json" disabled={loading} onChange={event => { const file = event.target.files?.[0]; if (file) void upload(file); event.target.value = '' }} /></label>
    </div>
    <label>Or paste deadline text<textarea rows={4} maxLength={1000000} placeholder="MAT224 | Term Test 2 | 2026-11-18 | 25%" value={text} onChange={event => setText(event.target.value)} /></label>
    <PixelButton accent="banshee" variant="ghost" disabled={loading || !text.trim()} onClick={() => { try { setRows(extractFromText(text, termStart, tutorialDay)); setError('') } catch (reason) { setError(reason instanceof Error ? reason.message : 'Check the text.') } }}>Find deadlines</PixelButton>
    {loading && <Loading label="Reading your syllabus…" />}
    {error && <p role="alert" className="bn-warning">{error}</p>}
    {!!rows.length && <div className="bn-review"><h3>Confirm {rows.length} extracted deadlines</h3><p>These have not been added to your calendar. Select Edit to verify a row.</p>
      {rows.map(row => <div className="bn-review-row" key={row.id}><span>{row.course} · {row.title}<small>{row.date} · {row.weight}% · {row.confidence < 0.8 ? 'Needs review' : 'Verify details'}</small></span><button type="button" onClick={() => setEditing(row)}>Edit</button><button type="button" onClick={() => setRows(rows.filter(item => item.id !== row.id))}>Discard</button></div>)}
      {editing && <DeadlineForm key={editing.id} initial={editing} today={today} onCancel={() => setEditing(undefined)} onSave={item => { setRows(rows.map(row => row.id === item.id ? item : row)); setEditing(undefined) }} />}
      <div className="bn-actions"><PixelButton accent="banshee" disabled={!!editing} onClick={() => { onConfirm(rows); setRows([]); setText('') }}>Confirm & add all</PixelButton><PixelButton accent="banshee" variant="ghost" onClick={() => { setRows([]); setEditing(undefined) }}>Discard import</PixelButton></div>
    </div>}
  </details>
}

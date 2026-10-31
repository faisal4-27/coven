import { useState } from 'react'
import type { Assessment } from '../../shared/types'
import { Loading, PixelButton } from '../../shared/ui'
import { draftExtension, isSitting, type Draft, type DraftReason } from './draft'

/** Drafts an extension-request email for one deadline. Editable, copyable, never stored or sent. */
export function ExtensionDraft({ item, clashWith }: { item: Assessment; clashWith?: string }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<DraftReason>(clashWith ? 'clash' : 'other')
  const [draft, setDraft] = useState<Draft>()
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState('')
  const kind = isSitting(item) ? 'reschedule request' : 'extension request'

  async function make() {
    setLoading(true)
    setCopied('')
    setDraft(await draftExtension(item, reason, reason === 'clash' ? clashWith : undefined))
    setLoading(false)
  }

  async function copy() {
    if (!draft) return
    try {
      await navigator.clipboard.writeText(`Subject: ${draft.subject}\n\n${draft.body}`)
      setCopied('Copied. Paste it into your email.')
    } catch {
      setCopied('Copy was blocked. Select the text and copy it yourself.')
    }
  }

  if (!open)
    return (
      <button type="button" className="bn-draft-open" onClick={() => setOpen(true)}>
        Draft {kind}
      </button>
    )

  return (
    <div className="bn-form bn-draft">
      <h3 className="first-letter:uppercase">{kind} · {item.course} {item.title}</h3>
      <div className="bn-fields">
        <label>
          Reason
          <select value={reason} onChange={(event) => setReason(event.target.value as DraftReason)}>
            <option value="clash">Too many deadlines that week</option>
            <option value="illness">Illness</option>
            <option value="other">Personal circumstances</option>
          </select>
        </label>
      </div>
      <div className="bn-actions">
        <PixelButton accent="banshee" disabled={loading} onClick={() => void make()}>
          {draft ? 'Draft again' : 'Write draft'}
        </PixelButton>
        <PixelButton accent="banshee" variant="ghost" onClick={() => setOpen(false)}>
          Close
        </PixelButton>
      </div>
      {loading && <Loading label="The banshee is choosing her words…" />}
      {draft && !loading && (
        <>
          {draft.template && <p className="bn-muted">Built-in template. Edit the placeholders in [brackets] before sending.</p>}
          <label>
            Subject
            <input value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} />
          </label>
          <label>
            Email
            <textarea rows={11} value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} />
          </label>
          <div className="bn-actions">
            <PixelButton accent="banshee" onClick={() => void copy()}>
              Copy email
            </PixelButton>
            <span role="status" aria-live="polite" className="bn-muted">
              {copied}
            </span>
          </div>
        </>
      )}
      <p className="bn-muted">
        Missing class or an assessment? Declare it on ACORN under Profile &amp; Settings → Absence Declaration
        (acorn.utoronto.ca). Coven never stores or sends this email.
      </p>
    </div>
  )
}

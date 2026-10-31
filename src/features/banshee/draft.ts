import type { Assessment } from '../../shared/types'
import { shortDate } from './dates'

export type DraftReason = 'clash' | 'illness' | 'other'

export interface Draft {
  subject: string
  body: string
  /** True when the server couldn't be reached and this is the built-in template. */
  template: boolean
}

/** Tests, exams and quizzes are sittings: you ask to write them at another time, not for an extension. */
export const isSitting = (item: Assessment) => item.type === 'test' || item.type === 'exam' || item.type === 'quiz'

function due(item: Assessment) {
  const [h, m] = (item.time ?? '').split(':').map(Number)
  if (!item.time) return shortDate(item.date)
  const clock = `${h % 12 || 12}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h < 12 ? 'am' : 'pm'}`
  return `${shortDate(item.date)} at ${clock}`
}

/** "a, b, c" -> "a, b and c" */
function listing(text: string) {
  const parts = text.split(/,\s*/).filter(Boolean)
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : text
}

/** Local fallback, so drafting works offline, without an API key and in `npm run dev`. */
export function templateDraft(item: Assessment, reason: DraftReason, clashWith?: string): Draft {
  const sitting = isSitting(item)
  const what = `${item.title} for ${item.course} (${sitting ? 'scheduled for' : 'due'} ${due(item)}, ${item.weight}% of the final grade)`
  const why =
    reason === 'clash'
      ? `That week I also have ${clashWith ? listing(clashWith) : 'several other major deadlines'}, and I am worried I will not be able to ${sitting ? 'prepare properly' : 'do my best work'} for all of them.`
      : reason === 'illness'
        ? `I have been unwell and have not been able to ${sitting ? 'prepare' : 'work on it'} as planned.`
        : 'Personal circumstances have made this difficult, and I am happy to explain further if helpful.'
  const ask = sitting
    ? 'Would it be possible to write it at a different time, or is there a make-up option I could use?'
    : 'Would a short extension of [number] days be possible?'
  // The ACORN Absence Declaration and documentation are for illness or absence, not a busy week.
  const support =
    reason === 'illness'
      ? 'I have submitted an Absence Declaration on ACORN and can provide further documentation if needed.'
      : reason === 'other'
        ? 'If it applies, I will submit an Absence Declaration on ACORN.'
        : ''
  return {
    template: true,
    subject: `${item.course}: ${sitting ? 'request to reschedule' : 'extension request for'} ${item.title}`,
    body: [
      'Dear [Instructor name],',
      '',
      `I am writing about ${what}. ${why}`,
      '',
      [ask, support].filter(Boolean).join(' '),
      '',
      'Thank you for considering this.',
      '',
      'Best regards,',
      '[Your name]',
      '[Student number]',
    ].join('\n'),
  }
}

/** Asks /api/draft-message for a tailored email; any failure falls back to the template. Nothing is stored. */
export async function draftExtension(item: Assessment, reason: DraftReason, clashWith?: string): Promise<Draft> {
  try {
    const response = await fetch('/api/draft-message', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ course: item.course, title: item.title, type: item.type, date: item.date, time: item.time, weight: item.weight, reason, clashWith }),
      signal: AbortSignal.timeout(20_000),
    })
    if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('unavailable')
    const result = (await response.json()) as { subject?: unknown; body?: unknown }
    if (typeof result.subject !== 'string' || typeof result.body !== 'string') throw new Error('invalid')
    return { subject: result.subject, body: result.body, template: false }
  } catch {
    return templateDraft(item, reason, clashWith)
  }
}

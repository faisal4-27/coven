// Drafts a short extension-request email for a deadline that can't be met. Same shape as extract-syllabus.ts.
const reasons = ['clash', 'illness', 'other'] as const
const sittings = ['test', 'exam', 'quiz']

const responseSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    subject: { type: 'string' },
    body: { type: 'string' },
  },
  required: ['subject', 'body'],
} as const

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8' },
})

const text = (value: unknown, max: number) => typeof value === 'string' && value.trim().length > 0 && value.length <= max

export async function POST(request: Request): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return json({ error: 'OPENAI_API_KEY is not configured.' }, 503)

  let body: { course?: unknown; title?: unknown; type?: unknown; date?: unknown; time?: unknown; weight?: unknown; reason?: unknown; clashWith?: unknown }
  try {
    body = await request.json() as typeof body
  } catch {
    return json({ error: 'Expected a JSON request body.' }, 400)
  }
  if (!text(body.course, 30) || !text(body.title, 160)) return json({ error: 'course and title are required.' }, 400)
  if (typeof body.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) return json({ error: 'date must be YYYY-MM-DD.' }, 400)
  if (typeof body.weight !== 'number' || !Number.isFinite(body.weight) || body.weight < 0 || body.weight > 100) return json({ error: 'weight must be 0 to 100.' }, 400)
  if (!reasons.includes(body.reason as typeof reasons[number])) return json({ error: 'reason must be clash, illness or other.' }, 400)
  if (body.clashWith !== undefined && !text(body.clashWith, 300)) return json({ error: 'clashWith must be short text.' }, 400)
  if (body.time !== undefined && (typeof body.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(body.time))) return json({ error: 'time must be HH:MM.' }, 400)
  const sitting = sittings.includes(body.type as string)

  const prompt = [
    'Write a short, polite email from a University of Toronto student to their instructor.',
    `Course: ${body.course}. Assessment: ${body.title} (${sitting ? 'a timed sitting such as a test or exam' : 'submitted work'}), ${sitting ? 'scheduled for' : 'due'} ${body.date}${body.time ? ` at ${body.time}` : ''}, worth ${body.weight}% of the grade.`,
    sitting
      ? 'Ask whether it can be written at a different time or whether a make-up option exists. Do not ask for an "extension".'
      : 'Ask for a specific short extension, using the placeholder [number] days.',
    body.reason === 'clash'
      ? `Reason: it falls in a week with several other major deadlines${body.clashWith ? ` (${body.clashWith})` : ''}. Do not mention documentation or the ACORN Absence Declaration for this reason.`
      : body.reason === 'illness'
        ? 'Reason: the student is unwell. Mention that they have submitted an Absence Declaration on ACORN and can provide further documentation if needed.'
        : 'Reason: personal circumstances the student will explain if needed. Mention they will submit an Absence Declaration on ACORN if it applies.',
    'Keep it under 150 words. Do not invent facts, dates, names or diagnoses. Use placeholders: [Instructor name], [Your name], [Student number].',
  ].join('\n')

  const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      temperature: 0.3,
      response_format: { type: 'json_schema', json_schema: { name: 'extension_email', strict: true, schema: responseSchema } },
      messages: [
        { role: 'system', content: 'You draft concise, respectful academic emails. Reply only with the requested JSON.' },
        { role: 'user', content: prompt },
      ],
    }),
  })
  if (!upstream.ok) return json({ error: 'The drafting model returned an error.' }, 502)

  try {
    const result = await upstream.json() as { choices?: Array<{ message?: { content?: string } }> }
    const content = result.choices?.[0]?.message?.content
    if (!content) throw new Error('The model returned no draft.')
    const parsed = JSON.parse(content) as { subject?: unknown; body?: unknown }
    if (typeof parsed.subject !== 'string' || typeof parsed.body !== 'string') throw new Error('The model returned an invalid draft.')
    return json({ subject: parsed.subject, body: parsed.body })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'The model returned an invalid draft.' }, 502)
  }
}

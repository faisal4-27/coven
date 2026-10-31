const assessmentTypes = ['test', 'exam', 'assignment', 'lab', 'quiz', 'project', 'other'] as const

const responseSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    assessments: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          course: { type: 'string' },
          title: { type: 'string' },
          type: { type: 'string', enum: assessmentTypes },
          date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          time: { type: ['string', 'null'] },
          weight: { type: 'number', minimum: 0, maximum: 100 },
          location: { type: ['string', 'null'] },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
        },
        required: ['course', 'title', 'type', 'date', 'time', 'weight', 'location', 'confidence'],
      },
    },
  },
  required: ['assessments'],
} as const

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8' },
})

function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T12:00:00Z`)
  return date.toISOString().slice(0, 10) === value
}

function validateAssessments(value: unknown): unknown[] {
  if (!Array.isArray(value) || value.length > 500) throw new Error('The extractor returned an invalid assessment list.')
  for (const row of value) {
    if (typeof row !== 'object' || row === null) throw new Error('The extractor returned an invalid assessment.')
    const item = row as Record<string, unknown>
    if (typeof item.course !== 'string' || !item.course.trim() || typeof item.title !== 'string' || !item.title.trim()) throw new Error('The extractor returned an assessment without course or title.')
    if (!validDate(item.date)) throw new Error(`The extractor returned an invalid date: ${String(item.date)}`)
    if (!assessmentTypes.includes(item.type as typeof assessmentTypes[number])) throw new Error('The extractor returned an invalid assessment type.')
    if (typeof item.weight !== 'number' || !Number.isFinite(item.weight) || item.weight < 0 || item.weight > 100) throw new Error('The extractor returned an invalid grade weight.')
    if (typeof item.confidence !== 'number' || item.confidence < 0 || item.confidence > 1) throw new Error('The extractor returned an invalid confidence score.')
    if (item.time !== null && (typeof item.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(item.time))) throw new Error('The extractor returned an invalid time.')
    if (item.location !== null && typeof item.location !== 'string') throw new Error('The extractor returned an invalid location.')
  }
  return value
}

export async function POST(request: Request): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return json({ error: 'OPENAI_API_KEY is not configured.' }, 503)

  let body: { text?: unknown; termStart?: unknown; tutorialDay?: unknown }
  try {
    body = await request.json() as typeof body
  } catch {
    return json({ error: 'Expected a JSON request body.' }, 400)
  }
  if (typeof body.text !== 'string' || body.text.trim().length < 20 || body.text.length > 1_000_000) return json({ error: 'Syllabus text must be between 20 bytes and 1 MB.' }, 400)
  if (typeof body.termStart !== 'string' || !validDate(body.termStart)) return json({ error: 'termStart must be an ISO date.' }, 400)
  if (body.tutorialDay !== undefined && (typeof body.tutorialDay !== 'number' || !Number.isInteger(body.tutorialDay) || body.tutorialDay < 0 || body.tutorialDay > 6)) return json({ error: 'tutorialDay must be between 0 and 6.' }, 400)

  const tutorial = body.tutorialDay === undefined ? 'not provided' : String(body.tutorialDay)
  const prompt = [
    'Extract only academic assessments that are explicitly present in this syllabus.',
    `The term starts on ${body.termStart}. Tutorial weekday is ${tutorial} (0 Sunday through 6 Saturday).`,
    'Convert relative dates such as Week 7 using the term start and tutorial weekday when possible.',
    'Do not invent missing dates or weights. Use confidence below 0.8 when the source is ambiguous.',
    'For best-of rules, return the adjusted weight only when the syllabus states enough information to calculate it; otherwise use the stated weight and lower confidence.',
    'Return dates in local calendar form as YYYY-MM-DD and times as HH:MM, or null when absent.',
    '',
    body.text,
  ].join('\n')

  const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      temperature: 0,
      response_format: { type: 'json_schema', json_schema: { name: 'syllabus_assessments', strict: true, schema: responseSchema } },
      messages: [
        { role: 'system', content: 'You extract structured academic deadlines. Never add commentary outside the requested JSON.' },
        { role: 'user', content: prompt },
      ],
    }),
  })
  if (!upstream.ok) return json({ error: 'The syllabus extraction model returned an error.' }, 502)

  try {
    const result = await upstream.json() as { choices?: Array<{ message?: { content?: string } }> }
    const content = result.choices?.[0]?.message?.content
    if (!content) throw new Error('The model returned no assessment data.')
    const parsed: unknown = JSON.parse(content)
    const rows = typeof parsed === 'object' && parsed !== null && 'assessments' in parsed ? parsed.assessments : parsed
    return json({ assessments: validateAssessments(rows) })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'The model returned invalid assessment data.' }, 502)
  }
}

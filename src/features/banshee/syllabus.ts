import type { Assessment } from '../../shared/types'
import { addDays, dayKey, parseDay } from './dates.ts'

/**
 * The PDF reader (~1.3 MB with its worker) loads only when a PDF is actually chosen, so opening Banshee stays
 * fast and TXT/JSON/pasted imports never download it.
 */
async function loadPdfjs() {
  const [pdfjsLib, worker] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')])
  pdfjsLib.GlobalWorkerOptions.workerSrc = worker.default
  return pdfjsLib
}

const types = ['test', 'exam', 'assignment', 'lab', 'quiz', 'project', 'other'] as const
export function readAssessments(value: unknown): Assessment[] {
  if (!Array.isArray(value) || value.length > 500) throw new Error('Expected an array of at most 500 assessments.')
  return value.map((row: unknown, index) => {
    if (typeof row !== 'object' || row === null) throw new Error(`Assessment ${index + 1} is invalid.`)
    const item = row as Record<string, unknown>
    if (typeof item.course !== 'string' || !item.course.trim() || typeof item.title !== 'string' || !item.title.trim() || typeof item.date !== 'string' || typeof item.weight !== 'number' || !Number.isFinite(item.weight) || item.weight < 0 || item.weight > 100) throw new Error(`Check course, title, date and weight in assessment ${index + 1}.`)
    parseDay(item.date)
    if (item.time !== undefined && (typeof item.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(item.time))) throw new Error(`Invalid time in assessment ${index + 1}.`)
    return {
      id: crypto.randomUUID(), course: item.course.trim(), title: item.title.trim(), date: item.date,
      weight: item.weight, time: item.time as string | undefined,
      type: types.includes(item.type as Assessment['type']) ? item.type as Assessment['type'] : 'other',
      location: typeof item.location === 'string' ? item.location : undefined,
      confidence: typeof item.confidence === 'number' && Number.isFinite(item.confidence) ? Math.max(0, Math.min(1, item.confidence)) : 0.5,
    }
  })
}

/** Conservative fallback: explicit ISO dates or “Week N” with a selected tutorial day. */
export function extractFromText(text: string, termStart: string, tutorialDay?: number): Assessment[] {
  const start = parseDay(termStart)
  if (text.length > 1_000_000) throw new Error('Please import less than 1 MB of text.')
  if (text.trim().startsWith('[')) return readAssessments(JSON.parse(text))
  const rows: Assessment[] = []
  for (const line of text.split(/\r?\n/)) {
    const course = line.match(/\b[A-Z]{3}\s?\d{3}[A-Z]?\d?\b/i)?.[0].replace(/\s/g, '').toUpperCase()
    const weight = line.match(/\b(\d+(?:\.\d+)?)\s*%/)
    const explicit = line.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0]
    const relative = line.match(/\bweek\s+(\d{1,2})\b/i)
    let date = explicit
    if (!date && relative && tutorialDay !== undefined) {
      const week = Number(relative[1])
      if (week >= 1 && week <= 52) date = dayKey(addDays(start, (week - 1) * 7 + (tutorialDay - start.getDay() + 7) % 7))
    }
    if (!course || !weight || !date) continue
    const type = types.find(candidate => candidate !== 'other' && new RegExp(`\\b${candidate}\\b`, 'i').test(line)) ?? 'other'
    const title = line.replace(course, '').replace(/\b\d{4}-\d{2}-\d{2}\b/, '').replace(weight[0], '').replace(/\bweek\s+\d{1,2}\b/i, '').replace(/^[\s|,:;–-]+|[\s|,:;–-]+$/g, '').trim() || 'Review assessment title'
    rows.push({ id: crypto.randomUUID(), course, title, type, date, weight: Number(weight[1]), confidence: explicit ? 0.7 : 0.4 })
  }
  if (!rows.length) throw new Error('No explicit deadlines found. Use one line per deadline: MAT224 | Term Test | 2026-11-18 | 25%. For Week N dates, select your tutorial day. Best-of grading rules need manual review.')
  return readAssessments(rows)
}

async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = await loadPdfjs()
  const document = await pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  if (document.numPages > 100) throw new Error('Please import a syllabus with 100 pages or fewer.')
  const pages: string[] = []
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber)
    const content = await page.getTextContent()
    pages.push(content.items.map(item => 'str' in item ? item.str : '').join(' '))
  }
  const text = pages.join('\n').replace(/[ \t]+/g, ' ').trim()
  if (!text) throw new Error('This PDF has no selectable text. Scanned PDFs and image-only syllabi are not supported yet.')
  if (text.length > 1_000_000) throw new Error('Please import a PDF with less than 1 MB of extracted text.')
  return text
}

export async function extractAssessments(file: File, termStart: string, tutorialDay?: number): Promise<Assessment[]> {
  parseDay(termStart)
  if (file.size > 10 * 1024 * 1024) throw new Error('Choose a file smaller than 10 MB.')
  if (/\.(txt|json)$/i.test(file.name)) return extractFromText(await file.text(), termStart)
  if (!/\.pdf$/i.test(file.name)) throw new Error('Choose a PDF, text or JSON file.')
  const text = await extractPdfText(file)
  let response: Response
  try {
    response = await fetch('/api/extract-syllabus', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text, termStart, tutorialDay }),
      signal: AbortSignal.timeout(45_000),
    })
  } catch {
    try {
      return extractFromText(text, termStart, tutorialDay)
    } catch {
      throw new Error('PDF text was read, but the extraction service is offline. Start with `vercel dev` for full syllabus parsing, or use explicit deadline lines in the PDF.')
    }
  }
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
    try {
      return extractFromText(text, termStart, tutorialDay)
    } catch {
      if (response.status === 503) throw new Error('PDF text was read, but syllabus extraction is not configured. Set OPENAI_API_KEY for the serverless function.')
      throw new Error('The syllabus extraction service is unavailable. Use explicit deadline lines or TXT/JSON import while the backend is being configured.')
    }
  }
  const result: unknown = await response.json()
  return readAssessments(Array.isArray(result) ? result : typeof result === 'object' && result !== null && 'assessments' in result ? result.assessments : result)
}

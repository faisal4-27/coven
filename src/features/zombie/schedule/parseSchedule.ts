// Turns positioned PDF text into weekly class meetings. Pure, so it can be tested without a PDF.
// Handles two layouts: list rows ("MAT224H1 LEC0101 Monday 10:00-11:00 BA 1130") and weekly grids
// with day names as column headers. Anything it gets wrong is fixed by the student in the review step.

export type Weekday = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
export const WEEKDAYS: Weekday[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const DAY_NAMES: Record<Weekday, string> = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' };
export const todayWeekday = (): Weekday => WEEKDAYS[(new Date().getDay() + 6) % 7]; // JS weeks start on Sunday

export interface TextItem {
  str: string;
  x: number; // left edge, PDF units
  y: number; // top-down, so bigger is lower on the page
  w: number;
  page: number;
}

export interface ParsedClass {
  id: string;
  day: Weekday;
  title: string; // "MAT224H1 LEC" or whatever label we found
  start: string; // "HH:MM", 24h
  end: string;
  room?: string; // "BA 1130"
  buildingCode?: string; // "BA"
}

const DAY_RE = /\b(mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:r(?:s(?:day)?)?)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b/gi;
const TIME_RANGE_RE = /\b(\d{1,2})(?::(\d{2}))?\s*([ap]\.?m\.?)?\s*(?:-|–|—|to)\s*(\d{1,2})(?::(\d{2}))?(?!\d)\s*([ap]\.?m\.?)?/i;
const DATE_RE = /\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}\/\d{1,2}\/\d{2,4}/g;
const COURSE_RE = /\b([A-Z]{3}\d{3}[HY]\d?)\b/;
const SECTION_RE = /\b(LEC|TUT|PRA)\s?\d{4}\b/;
const ROOM_RE = /\b(?!AM\b|PM\b)([A-Z]{2})\s?(\d{1,4}[A-Z]?)\b/; // ACORN has one-digit rooms like "NL 6"
const HOUR_LABEL_RE = /^(\d{1,2})(?::(\d{2}))?\s*([ap]\.?m\.?)?$/i;

const LINE_TOLERANCE = 3; // items within this many units vertically are on the same line
const DEFAULT_LENGTH_MIN = 50; // grid cells without a printed time get a standard UofT slot
const MAX_CELL_HEIGHT = 90; // ACORN wraps a cell over about five lines, stop before reaching unrelated text

function toWeekday(token: string): Weekday {
  const t = token.slice(0, 3).toLowerCase();
  return WEEKDAYS.find((d) => d.toLowerCase() === t)!;
}

const pad = (n: number) => String(n).padStart(2, '0');
const hhmm = (min: number) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;

function to24(h: number, m: number, mer?: string): number {
  const ap = mer?.toLowerCase().replace(/\./g, '');
  if (ap === 'pm' && h < 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  if (!ap && h >= 1 && h <= 7) h += 12; // no class at 3 am, a bare "3" on a timetable means 3 pm
  return h * 60 + m;
}

/** Start and end in minutes, or null. A lone meridiem ("10-11am") applies to both ends. */
export function parseTimeRange(text: string): [number, number] | null {
  const m = TIME_RANGE_RE.exec(text.replace(DATE_RE, ' '));
  if (!m) return null;
  const endMer = m[6];
  let startMer = m[3];
  if (!startMer && endMer) {
    const sh = Number(m[1]);
    const eh = Number(m[4]);
    startMer = endMer.toLowerCase().startsWith('p') && sh > eh && sh !== 12 ? 'am' : endMer; // "11-1pm" starts in the morning
  }
  const start = to24(Number(m[1]), Number(m[2] ?? 0), startMer);
  const end = to24(Number(m[4]), Number(m[5] ?? 0), endMer ?? startMer);
  if (end <= start || start < 6 * 60 || end > 23 * 60) return null; // not a plausible class
  return [start, end];
}

function findRoom(text: string): { room: string; buildingCode: string } | undefined {
  const m = ROOM_RE.exec(text.replace(/\b(LEC|TUT|PRA)\s?\d{4}\b/g, '')); // section numbers look like rooms otherwise
  return m ? { room: `${m[1]} ${m[2]}`, buildingCode: m[1] } : undefined;
}

interface Line {
  page: number;
  y: number;
  items: TextItem[];
  text: string;
}

function toLines(items: TextItem[]): Line[] {
  const sorted = [...items].filter((i) => i.str.trim()).sort((a, b) => a.page - b.page || a.y - b.y || a.x - b.x);
  const lines: Line[] = [];
  for (const it of sorted) {
    const last = lines[lines.length - 1];
    if (last && last.page === it.page && Math.abs(last.y - it.y) <= LINE_TOLERANCE) last.items.push(it);
    else lines.push({ page: it.page, y: it.y, items: [it], text: '' });
  }
  for (const l of lines) {
    l.items.sort((a, b) => a.x - b.x);
    l.text = l.items.map((i) => i.str.trim()).join(' ');
  }
  return lines;
}

const daysIn = (text: string): Weekday[] => [...new Set([...text.matchAll(DAY_RE)].map((m) => toWeekday(m[1])))];

function titleFrom(course?: string, section?: string): string {
  if (course && section) return `${course} ${section.slice(0, 3)}`;
  return course ?? section ?? 'Class';
}

/** List layout: each line with a time range is a meeting, day and course can come from earlier heading lines. */
function parseList(lines: Line[]): ParsedClass[] {
  const out: ParsedClass[] = [];
  let day: Weekday | undefined;
  let course: string | undefined;
  let section: string | undefined;
  for (const l of lines) {
    const days = daysIn(l.text);
    const c = COURSE_RE.exec(l.text)?.[1];
    if (c && c !== course) { course = c; section = undefined; }
    const s = SECTION_RE.exec(l.text)?.[0];
    if (s) section = s;
    const range = parseTimeRange(l.text);
    if (!range) {
      if (days.length === 1) day = days[0]; // a "Monday" heading applies to the rows below it
      continue;
    }
    const lineDays = days.length ? days : day ? [day] : [];
    const clean = l.text.replace(DATE_RE, ' ');
    const afterTime = clean.slice(clean.search(TIME_RANGE_RE)); // rooms come after the time, so "MAT 224" in a title isn't one
    const room = findRoom(afterTime) ?? findRoom(clean);
    for (const d of lineDays) {
      out.push({ id: '', day: d, title: titleFrom(c ?? course, s ?? section), start: hhmm(range[0]), end: hhmm(range[1]), ...room });
    }
  }
  return out;
}

/** Grid layout: day headers give columns, each course code is a class, time comes from the cell or the hour axis. */
function parseGrid(header: Line, items: TextItem[]): ParsedClass[] {
  const cols = header.items
    .map((i) => ({ day: daysIn(i.str)[0], x: i.x + i.w / 2 }))
    .filter((c): c is { day: Weekday; x: number } => Boolean(c.day))
    .sort((a, b) => a.x - b.x);
  const colWidth = cols.length > 1 ? (cols[cols.length - 1].x - cols[0].x) / (cols.length - 1) : 100;
  const below = items.filter((i) => i.page === header.page && i.y > header.y + LINE_TOLERANCE && i.str.trim());
  const colOf = (i: TextItem) => {
    const cx = i.x + i.w / 2;
    const best = cols.reduce((a, b) => (Math.abs(b.x - cx) < Math.abs(a.x - cx) ? b : a));
    return Math.abs(best.x - cx) <= colWidth * 0.6 ? best : undefined;
  };
  const hours = below
    .filter((i) => i.x + i.w < cols[0].x - colWidth / 2 && HOUR_LABEL_RE.test(i.str.trim()))
    .map((i) => {
      const m = HOUR_LABEL_RE.exec(i.str.trim())!;
      return { y: i.y, min: to24(Number(m[1]), Number(m[2] ?? 0), m[3]) };
    })
    .sort((a, b) => a.y - b.y);

  const codes = below.filter((i) => COURSE_RE.test(i.str) && colOf(i));
  const out: ParsedClass[] = [];
  for (const it of codes) {
    const course = COURSE_RE.exec(it.str)![1];
    const col = colOf(it)!;
    const nextY = Math.min(it.y + MAX_CELL_HEIGHT, ...codes.filter((o) => o !== it && colOf(o)?.day === col.day && o.y > it.y).map((o) => o.y));
    const cell = below.filter((o) => colOf(o)?.day === col.day && o.y >= it.y - 4 && o.y < nextY - 1); // everything down to the next class in this column
    const cellText = toLines(cell).map((l) => l.text).join(' '); // line by line, left to right, so "12:00 - 1:00" stays in order
    let range = parseTimeRange(cellText);
    if (!range && hours.length) {
      const above = hours.filter((h) => h.y <= it.y + LINE_TOLERANCE).pop() ?? hours[0];
      range = [above.min, above.min + DEFAULT_LENGTH_MIN];
    }
    if (!range) continue;
    const room = findRoom(cellText.replace(course, ''));
    out.push({ id: '', day: col.day, title: titleFrom(course, SECTION_RE.exec(cellText)?.[0]), start: hhmm(range[0]), end: hhmm(range[1]), ...room });
  }
  return out;
}

export function parseSchedule(items: TextItem[]): ParsedClass[] {
  const lines = toLines(items);
  const header = lines.find((l) => daysIn(l.text).length >= 3 && !parseTimeRange(l.text) && l.items.length >= 3);
  let found = header ? parseGrid(header, items) : [];
  if (!found.length) found = parseList(lines);

  const seen = new Set<string>();
  return found
    .filter((c) => {
      const key = `${c.day}|${c.start}|${c.title}`;
      if (seen.has(key)) return false; // grids and multi-page exports repeat meetings
      seen.add(key);
      return true;
    })
    .sort((a, b) => WEEKDAYS.indexOf(a.day) - WEEKDAYS.indexOf(b.day) || a.start.localeCompare(b.start))
    .map((c, i) => ({ ...c, id: `pdf-${i + 1}` }));
}

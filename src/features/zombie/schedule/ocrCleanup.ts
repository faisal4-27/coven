// Pure helpers for turning a timetable photo or screenshot into something OCR reads well, plus fixes
// for the mistakes OCR makes on course codes and times. No DOM here, so it's testable.

/**
 * ACORN prints pale text on coloured cells and black text on white paper. OCR wants one ink colour, so both
 * become black on white. Inside coloured areas a saturated background always has one dark channel while the
 * pale text is bright in all three, so the darkest channel separates them even when JPEG blur tints the text.
 */
// Inside a coloured cell, the darkest channel runs from about this (background, mapped to white paper)...
const CELL_BG_LOW = 90;
// ...to about this (pale text, mapped to black ink).
const LIGHT_TEXT_LOW = 190;

export function toInk(rgba: Uint8ClampedArray, w: number, h: number, radius: number): Uint8ClampedArray {
  const n = w * h;
  const lum = new Float32Array(n);
  const low = new Uint8Array(n); // darkest channel
  const colored = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const r = rgba[i * 4];
    const g = rgba[i * 4 + 1];
    const b = rgba[i * 4 + 2];
    const max = Math.max(r, g, b);
    low[i] = Math.min(r, g, b);
    lum[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    colored[i] = max && (max - low[i]) / max > 0.4 && lum[i] < 235 ? 1 : 0;
  }

  // Summed-area table, so "is there colour within radius" is four lookups per pixel.
  const sum = new Uint32Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) {
      row += colored[y * w + x];
      sum[(y + 1) * (w + 1) + x + 1] = sum[y * (w + 1) + x + 1] + row;
    }
  }
  // Mostly surrounded by colour, so text inside a cell counts but the white page right next to a cell doesn't.
  const nearColor = (x: number, y: number) => {
    const x0 = Math.max(0, x - radius);
    const y0 = Math.max(0, y - radius);
    const x1 = Math.min(w, x + radius + 1);
    const y1 = Math.min(h, y + radius + 1);
    const count = sum[y1 * (w + 1) + x1] - sum[y0 * (w + 1) + x1] - sum[y1 * (w + 1) + x0] + sum[y0 * (w + 1) + x0];
    return count > 0.35 * (x1 - x0) * (y1 - y0);
  };

  // Greyscale rather than pure black and white: OCR thresholds blurry letters better than we can.
  const out = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) {
    const inCell = nearColor(i % w, Math.floor(i / w));
    const v = inCell ? 255 - ((low[i] - CELL_BG_LOW) * 255) / (LIGHT_TEXT_LOW - CELL_BG_LOW) : lum[i];
    out[i * 4] = out[i * 4 + 1] = out[i * 4 + 2] = v;
    out[i * 4 + 3] = 255;
  }
  return out;
}

export interface Cell {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  bg: [number, number, number];
}

/**
 * Finds the coloured class blocks in a timetable image: connected runs of similar saturated colour.
 * Pale text inside a block just leaves holes, the bounding box still covers the whole block.
 */
export function findCells(rgba: Uint8ClampedArray, w: number, h: number): Cell[] {
  const n = w * h;
  const isColored = (i: number) => {
    const r = rgba[i * 4];
    const g = rgba[i * 4 + 1];
    const b = rgba[i * 4 + 2];
    const max = Math.max(r, g, b);
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    return max > 0 && (max - Math.min(r, g, b)) / max > 0.4 && lum < 235;
  };
  const seen = new Uint8Array(n);
  const queue = new Int32Array(n);
  const cells: Cell[] = [];
  for (let start = 0; start < n; start++) {
    if (seen[start] || !isColored(start)) continue;
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    seen[start] = 1;
    let [x0, y0, x1, y1] = [w, h, 0, 0];
    let [tr, tg, tb, count] = [0, 0, 0, 0];
    while (head < tail) {
      const i = queue[head++];
      const x = i % w;
      const y = (i - x) / w;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      tr += rgba[i * 4];
      tg += rgba[i * 4 + 1];
      tb += rgba[i * 4 + 2];
      count++;
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) {
        if (j < 0 || seen[j] || !isColored(j)) continue;
        // Against the block's average so far, not the first pixel: that one sits on the anti-aliased edge,
        // and compression noise in the middle of the block can drift further than 90 from it.
        const d = Math.abs(rgba[j * 4] - tr / count) + Math.abs(rgba[j * 4 + 1] - tg / count) + Math.abs(rgba[j * 4 + 2] - tb / count);
        if (d > 90) continue; // a different colour means a different class block
        seen[j] = 1;
        queue[tail++] = j;
      }
    }
    if (x1 - x0 > w * 0.05 && y1 - y0 > h * 0.015 && count > 0.4 * (x1 - x0) * (y1 - y0)) {
      cells.push({ x0, y0, x1, y1, bg: [tr / count, tg / count, tb / count] });
    }
  }
  return cells.sort((a, b) => a.x0 - b.x0 || a.y0 - b.y0);
}

/** One cell's crop, background to white and pale text to black, for OCR. */
export function cellToInk(rgba: Uint8ClampedArray, bg: [number, number, number]): Uint8ClampedArray {
  const bgLow = Math.min(...bg);
  const textLow = Math.min(255, bgLow + 120);
  const out = new Uint8ClampedArray(rgba.length);
  for (let i = 0; i < rgba.length; i += 4) {
    const low = Math.min(rgba[i], rgba[i + 1], rgba[i + 2]);
    const v = 255 - ((low - bgLow) * 255) / (textLow - bgLow);
    out[i] = out[i + 1] = out[i + 2] = v;
    out[i + 3] = 255;
  }
  return out;
}

/** Day from a possibly misread header word: "Fnday" -> Fri, "Tuosday" -> Tue, "Thurscay" -> Thu. */
export function fuzzyDay(word: string): 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun' | undefined {
  const s = word.toLowerCase().replace(/[^a-z]/g, '');
  if (s.length < 5 || s === 'today' || !/day$|dav$|cay$|oay$|ay$/.test(s)) return undefined;
  if (s.startsWith('m')) return 'Mon';
  if (s.startsWith('w')) return 'Wed';
  if (s.startsWith('f')) return 'Fri';
  if (s.startsWith('th')) return 'Thu';
  if (s.startsWith('t')) return 'Tue';
  if (s.startsWith('sa')) return 'Sat';
  if (s.startsWith('su')) return 'Sun';
  return undefined;
}

const LETTERISH: Record<string, string> = { '0': 'O', '1': 'I', '5': 'S', '8': 'B', '2': 'Z', '6': 'G' };

/** Pulls course code, section and room out of one cell's OCR text, forgiving common misreads. */
export function parseCellText(text: string): { course?: string; section?: string; room?: string; buildingCode?: string } {
  const tokens = text.split(/\s+/).map(cleanOcrWord).filter(Boolean);
  const joined = tokens.join(' ');
  let course = /\b([A-Z]{3}\d{3}[HY]\d)/.exec(joined)?.[1];
  if (!course) {
    const loose = /\b([A-Z0-9]{3})([0-9OIlSB]{3})([HN0]?)([1Il])?\b/.exec(joined); // bold codes often lose or garble the H
    if (loose && /[A-Z]/.test(loose[1])) course = `${[...loose[1]].map((c) => LETTERISH[c] ?? c).join('')}${toDigits(loose[2])}H1`;
  }
  const sec = /\b(LEC|TUT|PRA|[LT][EU][CT]|UT|EC)\b/i.exec(joined)?.[1]?.toUpperCase();
  const section = sec ? (sec.includes('U') ? 'TUT' : sec.startsWith('P') ? 'PRA' : 'LEC') : undefined;
  // The room is the last "XX 123" on the cell; OCR may read B as 8 or O as 0 in the building letters.
  let room: string | undefined;
  for (let i = tokens.length - 1; i >= 0 && !room; i--) {
    const m = /^([A-Z0-9]{2})(\d{1,4}[A-Z]?)?$/.exec(tokens[i]);
    if (!m || !/[A-Z]/.test(m[1])) continue; // all digits is a room number, not a building code
    const num = m[2] ?? (/^\d{1,4}[A-Z]?$/.test(tokens[i + 1] ?? '') ? tokens[i + 1] : undefined);
    if (!num) continue;
    const code = [...m[1]].map((c) => LETTERISH[c] ?? c).join('');
    if (/^[A-Z]{2}$/.test(code) && code !== 'AM' && code !== 'PM') room = `${code} ${num}`;
  }
  return { course, section, room, buildingCode: room?.slice(0, 2) };
}

/** Best "MAT244" out of a cell's garbled first line ("MAT244M1 F", "MATZ3541"): the reading that needs the fewest letter-to-digit fixes. */
export function courseGuess(text: string): string | undefined {
  const line = text.split('\n').find((l) => l.trim())?.replace(/\s/g, '').toUpperCase() ?? '';
  let best: { code: string; real: number } | undefined;
  for (let i = 0; i + 6 <= line.length; i++) {
    const m = /^([A-Z]{3})([0-9OISBZ]{3})/.exec(line.slice(i));
    if (!m) continue;
    const real = m[2].replace(/\D/g, '').length - m[1].replace(/[^Z]/g, '').length; // a "Z" in the letters is probably a 2
    if (!best || real > best.real) best = { code: `${m[1]}${toDigits(m[2])}`, real };
  }
  return best?.code;
}

const LOOKALIKE: Record<string, string[]> = { '8': ['B', 'S'], '0': ['O', 'D'], '5': ['S'], '1': ['I', 'L'], '§': ['S'], $: ['S'], Q: ['O'], A: ['R'], L: ['I'], I: ['L'] };

/** Room from a cell's last line, with the building letters snapped to a known code: "8F 30" -> BF 30, "Ql 5200" -> OI 5200. */
export function snapRoom(text: string, known: string[]): { room?: string; buildingCode?: string } {
  const line = text.split('\n').map((l) => l.trim()).filter(Boolean).pop() ?? '';
  const m = /^([^\s\d]|\d)([^\s\d]|\d)\s?([0-9OIlSBZ%]{1,4}[A-Z]?)?/.exec(line.replace(/^[^A-Za-z0-9§$]+/, ''));
  if (!m) return {};
  const options = (c: string) => [c.toUpperCase(), ...(LOOKALIKE[c.toUpperCase()] ?? [])];
  for (const a of options(m[1])) {
    for (const b of options(m[2])) {
      if (!known.includes(a + b)) continue;
      const num = m[3] ? toDigits(m[3].replace('%', '')) : '';
      return { room: num ? `${a}${b} ${num}` : `${a}${b}`, buildingCode: a + b };
    }
  }
  return {};
}

interface RoomRow {
  bg: [number, number, number];
  section?: string;
  room?: string;
  buildingCode?: string;
}

/** Could OCR have read room number `b` as `a`? It drops digits ("117" -> "17") and swaps one ("1160" -> "1100"). */
function sameRoomNumber(a: string, b?: string): boolean {
  if (!b) return false;
  if (a.includes(b) || b.includes(a)) return true;
  return a.length === b.length && [...a].filter((c, i) => c !== b[i]).length <= 1;
}

/**
 * Fills in rooms OCR couldn't read from other blocks of the same course and section type, since a lecture
 * section meets in the same room all week. Rows that already have a known building are left alone.
 */
export function borrowRooms<T extends RoomRow>(rows: T[], known: string[]): T[] {
  const sameColour = (a: RoomRow, b: RoomRow) => a.bg.reduce((d, v, i) => d + Math.abs(v - b.bg[i]), 0) < 40;
  const placed = (r: RoomRow) => !!r.buildingCode && known.includes(r.buildingCode);
  const roomNumber = (room?: string) => /\d{2,}/.exec(room ?? '')?.[0];
  return rows.map((r) => {
    if (placed(r)) return r;
    const num = roomNumber(r.room); // a readable number that differs means a different room, not a misread
    const votes = new Map<string, { n: number; from: RoomRow }>();
    for (const o of rows) {
      if (o === r || !placed(o) || !sameColour(o, r) || (r.section && o.section !== r.section)) continue; // an unread section can borrow from any
      if (num && !sameRoomNumber(num, roomNumber(o.room))) continue;
      const v = votes.get(o.room!) ?? { n: 0, from: o };
      v.n++;
      votes.set(o.room!, v);
    }
    const best = [...votes.values()].sort((a, b) => b.n - a.n)[0]?.from;
    return best ? { ...r, room: best.room, buildingCode: best.buildingCode } : r;
  });
}

const DIGITISH: Record<string, string> = { O: '0', o: '0', D: '0', I: '1', l: '1', '|': '1', i: '1', S: '5', s: '5', B: '8', Z: '2', z: '2' };
const toDigits = (s: string) => [...s].map((c) => DIGITISH[c] ?? c).join('');

/** Fixes one OCR'd word: "MAT244HI" -> "MAT244H1", "1O:0O" -> "10:00", "12.00" -> "12:00", "SS2l05" -> "SS2105". */
export function cleanOcrWord(word: string): string {
  let s = word.replace(/^[|'"`.,;:_]+|[|'"`,;_]+$/g, ''); // stray marks from cell borders
  const course = /^([A-Z]{3})([0-9OoDIl|SsBZz]{3})([HY])([0-9Il|i])?(.*)$/.exec(s);
  if (course) return `${course[1]}${toDigits(course[2])}${course[3]}${course[4] ? toDigits(course[4]) : ''}${course[5]}`;
  if (/^[0-9OoDIl|SsB]{1,2}[:.;,][0-9OoDIl|SsB]{2}$/.test(s)) s = toDigits(s.replace(/[.;,]/, ':')); // times
  else if (/^[A-Z]{2}[0-9OoDIl|SsB]{1,4}[A-Z]?$/.test(s) && /\d/.test(s)) s = s.slice(0, 2) + toDigits(s.slice(2)); // rooms written without a space
  else if (/^[0-9OoDIl|SsB]{1,4}$/.test(s) && /\d/.test(s)) s = toDigits(s); // room numbers on their own
  return s;
}

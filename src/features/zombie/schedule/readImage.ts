// Reads a timetable photo or screenshot in the browser with tesseract.js. Nothing is uploaded; the first run
// downloads the English language data (a few MB) from a CDN and the browser caches it after that.
//
// ACORN grids are read cell by cell: each coloured block's column gives the day and its top and bottom edges
// give the times (from the hour labels), so OCR only has to read the course code and room. Anything else
// falls back to whole-page OCR and the same parser the PDF path uses.

import { createWorker, PSM } from 'tesseract.js';
import type { Worker } from 'tesseract.js';
import { borrowRooms, cellToInk, cleanOcrWord, courseGuess, findCells, fuzzyDay, parseCellText, snapRoom, toInk } from './ocrCleanup';
import type { Cell } from './ocrCleanup';
import { parseSchedule, parseTimeRange } from './parseSchedule';
import type { ParsedClass, TextItem, Weekday } from './parseSchedule';
import { TEACHING_CODES, UOFT_CODES } from './resolveBuildings';

const TARGET_WIDTH = 2000; // small screenshots get upscaled so tiny text becomes OCR-sized
const CELL_SCALE = 6; // per-cell crops get blown up further, ACORN cell text is a few pixels tall
const HOUR_LABEL_RE = /^(\d{1,2}):([03]0)$/; // timetable rows start on the hour or half hour, so a print timestamp like "10:02" isn't one
const PAGE_WIDTH = 612;

function canvasOf(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { canvas: c, ctx: c.getContext('2d', { willReadFrequently: true })! };
}

async function pageWords(worker: Worker, source: ImageBitmap): Promise<TextItem[]> {
  const scale = Math.min(5, Math.max(1, TARGET_WIDTH / source.width));
  const { canvas, ctx } = canvasOf(Math.round(source.width * scale), Math.round(source.height * scale));
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  img.data.set(toInk(img.data, canvas.width, canvas.height, Math.round(4 * scale)));
  ctx.putImageData(img, 0, 0);
  await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT, user_defined_dpi: '300' }); // timetables are scattered words
  const { data } = await worker.recognize(canvas, {}, { blocks: true });
  const items: TextItem[] = [];
  for (const block of data.blocks ?? []) {
    for (const para of block.paragraphs) {
      for (const line of para.lines) {
        for (const word of line.words) {
          const str = cleanOcrWord(word.text);
          if (!str || word.confidence < 20) continue; // speckle and border noise
          const { x0, y0, x1, y1 } = word.bbox;
          items.push({ str, x: x0 / scale, y: (y0 + y1) / 2 / scale, w: (x1 - x0) / scale, page: 1 }); // back in source pixels
        }
      }
    }
  }
  return items;
}

async function cellText(worker: Worker, source: ImageBitmap, cell: Cell): Promise<string> {
  const pad = 12;
  const cw = cell.x1 - cell.x0 - 1;
  const ch = cell.y1 - cell.y0 - 1;
  const { canvas, ctx } = canvasOf(cw * CELL_SCALE + pad * 2, ch * CELL_SCALE + pad * 2);
  ctx.fillStyle = `rgb(${cell.bg.join(',')})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height); // padding in the cell's own colour so it turns white too
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, cell.x0 + 1, cell.y0 + 1, cw, ch, pad, pad, cw * CELL_SCALE, ch * CELL_SCALE);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  img.data.set(cellToInk(img.data, cell.bg));
  ctx.putImageData(img, 0, 0);
  const { data } = await worker.recognize(canvas);
  return data.text;
}

const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

/** Hour rows from the labels down the left edge; a y position maps to minutes, half hours included. */
function hourScale(items: TextItem[], leftOf: number) {
  const labels = items
    .filter((i) => i.x < leftOf && HOUR_LABEL_RE.test(i.str))
    .map((i) => {
      const [, h, m] = HOUR_LABEL_RE.exec(i.str)!;
      const hour = Number(h);
      return { y: i.y, min: (hour >= 1 && hour <= 7 ? hour + 12 : hour) * 60 + Number(m) }; // "1:00" on a timetable is 1 pm
    })
    .sort((a, b) => a.y - b.y)
    .filter((l, i, all) => i === 0 || l.min > all[i - 1].min); // drop misreads that break the order
  if (labels.length < 2) return null;
  const gaps = labels.slice(1).map((l, i) => l.y - labels[i].y);
  const last = labels[labels.length - 1];
  labels.push({ y: last.y + Math.max(...gaps), min: last.min + 60 }); // the bottom edge of the last row
  return (y: number, offset: number) => {
    const ys = labels.map((l) => l.y - offset);
    let i = ys.findIndex((_, j) => j === ys.length - 1 || y < ys[j + 1]);
    if (i < 0) i = 0;
    const span = (ys[i + 1] ?? ys[i] + Math.max(...gaps)) - ys[i];
    const min = labels[i].min + ((y - ys[i]) / span) * ((labels[i + 1]?.min ?? labels[i].min + 60) - labels[i].min);
    return Math.round(min / 10) * 10; // classes start on the 10-minute grid
  };
}

export async function readImageSchedule(file: Blob, onProgress?: (label: string) => void): Promise<ParsedClass[]> {
  const bitmap = await createImageBitmap(file);
  const worker = await createWorker('eng');
  try {
    onProgress?.('Reading the page...');
    const items = await pageWords(worker, bitmap);

    const { canvas, ctx } = canvasOf(bitmap.width, bitmap.height);
    ctx.drawImage(bitmap, 0, 0);
    const cells = findCells(ctx.getImageData(0, 0, bitmap.width, bitmap.height).data, bitmap.width, bitmap.height);
    canvas.width = 0;

    const headers = items.flatMap((i) => {
      const day = fuzzyDay(i.str);
      return day ? [{ day, x: i.x + i.w / 2, y: i.y }] : [];
    });
    if (cells.length < 2 || headers.length < 3) {
      const k = PAGE_WIDTH / bitmap.width; // the parser's spacing rules are in letter-size PDF units
      return parseSchedule(items.map((i) => ({ ...i, x: i.x * k, y: i.y * k, w: i.w * k }))); // not a coloured grid
    }

    const leftOf = Math.min(...headers.map((h) => h.x)) - (cells[0].x1 - cells[0].x0) / 2;
    const scale = hourScale(items, leftOf);
    // Labels sit a little below the top of their row; estimate that from how far cell tops sit above their nearest label.
    const labelYs = items.filter((i) => i.x < leftOf && HOUR_LABEL_RE.test(i.str)).map((i) => i.y);
    const offsets = cells.map((c) => labelYs.reduce((best, y) => (Math.abs(y - c.y0) < Math.abs(best) ? y - c.y0 : best), Infinity)).filter(Number.isFinite).sort((a, b) => a - b);
    const offset = offsets.length ? offsets[Math.floor(offsets.length / 2)] : 0;

    const blocks = cells.filter((c) => !cells.some((o) => o !== c && o.x0 <= c.x0 && o.y0 <= c.y0 && o.x1 >= c.x1 && o.y1 >= c.y1)); // text holes can leave fragments inside a block
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });
    const read: { cell: Cell; text: string }[] = [];
    for (const [n, cell] of blocks.entries()) {
      onProgress?.(`Reading class ${n + 1} of ${blocks.length}...`);
      read.push({ cell, text: await cellText(worker, bitmap, cell) });
    }

    // ACORN colours every block of a course the same, so blocks of one colour vote on the course code.
    const sameColour = (a: Cell, b: Cell) => a.bg.reduce((d, v, i) => d + Math.abs(v - b.bg[i]), 0) < 40;
    const courseOf = (cell: Cell) => {
      const votes = new Map<string, number>();
      for (const r of read) {
        const guess = sameColour(r.cell, cell) ? courseGuess(r.text) : undefined;
        if (guess) votes.set(guess, (votes.get(guess) ?? 0) + 1);
      }
      const best = [...votes].sort((a, b) => b[1] - a[1])[0]?.[0];
      return best && `${best}H1`;
    };

    const known = TEACHING_CODES;
    const out: (ParsedClass & { bg: Cell['bg']; section?: string })[] = [];
    for (const { cell, text } of read) {
      const cx = (cell.x0 + cell.x1) / 2;
      const day = headers.reduce((a, b) => (Math.abs(b.x - cx) < Math.abs(a.x - cx) ? b : a)).day as Weekday;
      const parsed = parseCellText(text);
      const course = courseOf(cell) ?? parsed.course;
      // A teaching building first, then a misread snapped to one, then any campus code read exactly ("EX 100" for exams).
      let snapped = parsed.buildingCode && known.includes(parsed.buildingCode) ? parsed : snapRoom(text, known);
      if (!snapped.buildingCode && parsed.buildingCode && parsed.buildingCode in UOFT_CODES) snapped = parsed;
      const lastLine = text.split('\n').map((l) => l.trim()).filter(Boolean).pop();
      const room = snapped.room ?? parsed.room ?? (lastLine && /\d/.test(lastLine) ? lastLine : undefined); // keep what we saw so the student can tell which room it was
      if (!course && !room) continue; // a coloured legend or logo, not a class
      const ocrTime = parseTimeRange(text.replace(/\n/g, ' '));
      const geo = scale ? [scale(cell.y0, offset), scale(cell.y1 + 1, offset)] : null;
      // The printed "3:00 - 5:00" is exact when OCR gets it, the block's edges only estimate it, so trust the text
      // unless it's far from where the block sits (a misread digit).
      const agrees = geo && ocrTime && Math.abs(ocrTime[0] - geo[0]) <= 45 && Math.abs(ocrTime[1] - geo[1]) <= 45;
      const [start, end] = agrees ? ocrTime : geo && geo[1] > geo[0] ? geo : ocrTime ?? [0, 0];
      if (end <= start) continue;
      const title = course ? `${course}${parsed.section ? ` ${parsed.section}` : ''}` : 'Class';
      out.push({ id: '', day, title, start: hhmm(start), end: hhmm(end), room, buildingCode: snapped.buildingCode, bg: cell.bg, section: parsed.section });
    }
    const order = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return borrowRooms(out, Object.keys(UOFT_CODES))
      .sort((a, b) => order.indexOf(a.day) - order.indexOf(b.day) || a.start.localeCompare(b.start))
      .map(({ bg: _bg, section: _section, ...c }, i) => ({ ...c, id: `img-${i + 1}` }));
  } finally {
    bitmap.close();
    await worker.terminate();
  }
}

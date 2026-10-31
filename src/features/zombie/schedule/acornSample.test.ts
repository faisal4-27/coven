/// <reference types="node" />
// End to end on a real PDF file: the ACORN-style sample from scripts/zombie-sample-timetable.js.

import { readFileSync } from 'node:fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { describe, expect, it } from 'vitest';
import { parseSchedule } from './parseSchedule';
import type { TextItem } from './parseSchedule';

async function itemsFrom(path: string): Promise<TextItem[]> {
  const task = getDocument({ data: new Uint8Array(readFileSync(path)) });
  const pdf = await task.promise;
  const items: TextItem[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const { height } = page.getViewport({ scale: 1 });
    for (const it of (await page.getTextContent()).items) {
      if ('str' in it && it.str.trim()) items.push({ str: it.str, x: it.transform[4], y: height - it.transform[5], w: it.width, page: p });
    }
  }
  await task.destroy();
  return items;
}

describe('ACORN timetable PDF', () => {
  it('reads every class with its day, time and room', async () => {
    const classes = parseSchedule(await itemsFrom('public/data/zombie-sample-timetable.pdf'));
    expect(classes.map((c) => `${c.day} ${c.start}-${c.end} ${c.title} ${c.room}`)).toEqual([
      'Mon 12:00-13:00 MAT244H1 TUT SS 2105',
      'Mon 13:00-15:00 STA220H1 LEC BR 200',
      'Mon 15:00-16:00 MAT235H1 LEC RW 117',
      'Tue 11:00-13:00 HPS100H1 LEC NF 003',
      'Tue 13:00-15:00 MAT246H1 LEC SS 2118',
      'Tue 15:00-17:00 MAT224H1 LEC NL 6',
      'Wed 11:00-13:00 MAT244H1 LEC BA 1160',
      'Wed 13:00-14:00 STA220H1 LEC MS 3154',
      'Wed 15:00-16:00 MAT235H1 LEC RW 117',
      'Thu 11:00-12:00 HPS100H1 TUT OI 5260',
      'Thu 12:00-13:00 MAT235H1 TUT MY 330',
      'Thu 13:00-14:00 MAT246H1 LEC SS 2135',
      'Thu 15:00-16:00 MAT224H1 LEC SS 2102',
      'Thu 16:00-17:00 MAT224H1 TUT BF 323',
      'Fri 11:00-12:00 MAT244H1 LEC MB 128',
      'Fri 15:00-16:00 MAT235H1 LEC RW 117',
    ]);
  });
});

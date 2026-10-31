// Writes public/data/zombie-sample-timetable.pdf, a copy of a real ACORN "Fall Timetable" print, for demoing
// the PDF upload. Same grid layout as ACORN: day columns, hour rows, cells wrapped over five lines.
// Run: node scripts/zombie-sample-timetable.js

import { writeFileSync } from 'node:fs';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const HOURS = ['9:00', '10:00', '11:00', '12:00', '1:00', '2:00', '3:00', '4:00'];

// [day index, hour row, rows tall, code, section, time, room]
const CLASSES = [
  [0, 3, 1, 'MAT244H1 F', 'TUT 0401', '12:00 - 1:00', 'SS 2105'],
  [0, 4, 2, 'STA220H1 F', 'LEC 0201', '1:00 - 3:00', 'BR 200'],
  [0, 6, 1, 'MAT235H1 F', 'LEC 0601', '3:00 - 4:00', 'RW 117'],
  [1, 2, 2, 'HPS100H1 F', 'LEC 0101', '11:00 - 1:00', 'NF 003'],
  [1, 4, 2, 'MAT246H1 F', 'LEC 0201', '1:00 - 3:00', 'SS 2118'],
  [1, 6, 2, 'MAT224H1 F', 'LEC 0201', '3:00 - 5:00', 'NL 6'],
  [2, 2, 2, 'MAT244H1 F', 'LEC 0201', '11:00 - 1:00', 'BA 1160'],
  [2, 4, 1, 'STA220H1 F', 'LEC 0201', '1:00 - 2:00', 'MS 3154'],
  [2, 6, 1, 'MAT235H1 F', 'LEC 0601', '3:00 - 4:00', 'RW 117'],
  [3, 2, 1, 'HPS100H1 F', 'TUT 0301', '11:00 - 12:00', 'OI 5260'],
  [3, 3, 1, 'MAT235H1 F', 'TUT 0402', '12:00 - 1:00', 'MY 330'],
  [3, 4, 1, 'MAT246H1 F', 'LEC 0201', '1:00 - 2:00', 'SS 2135'],
  [3, 6, 1, 'MAT224H1 F', 'LEC 0201', '3:00 - 4:00', 'SS 2102'],
  [3, 7, 1, 'MAT224H1 F', 'TUT 0204', '4:00 - 5:00', 'BF 323'],
  [4, 2, 1, 'MAT244H1 F', 'LEC 0201', '11:00 - 12:00', 'MB 128'],
  [4, 6, 1, 'MAT235H1 F', 'LEC 0601', '3:00 - 4:00', 'RW 117'],
];

const LEFT = 65;
const TIME_W = 50;
const COL_W = 90;
const TOP = 690; // PDF y grows upward, so rows go down from here
const ROW_H = 52;
const colX = (d) => LEFT + TIME_W + d * COL_W;
const rowY = (r) => TOP - r * ROW_H;

const esc = (s) => s.replace(/[()\\]/g, (c) => `\\${c}`);
const text = (x, y, s, size = 7) => `BT /F1 ${size} Tf ${x} ${y} Td (${esc(s)}) Tj ET`;
const rect = (x, y, w, h, rgb) => `${rgb} rg ${x} ${y} ${w} ${h} re f`;

const ops = [
  text(50, 770, '8/27/26, 10:02 PM                                   Timetable & Exams - ACORN', 7),
  text(110, 740, '2026 Fall Timetable', 14),
  ...DAYS.map((d, i) => text(colX(i) + 25, TOP + 10, d, 8)),
  ...HOURS.map((h, r) => text(LEFT + 6, rowY(r) - 12, h, 8)),
  ...CLASSES.flatMap(([d, r, span, code, section, time, room]) => {
    const x = colX(d) + 1;
    const y = rowY(r);
    return [
      rect(x, y - span * ROW_H + 1, COL_W - 2, span * ROW_H - 2, '0.75 0.3 0.25'),
      '1 1 1 rg',
      text(x + 3, y - 9, code, 7),
      text(x + 3, y - 18, `${section} (In`),
      text(x + 3, y - 27, 'Person)'),
      text(x + 3, y - 36, time),
      text(x + 3, y - 45, room),
      '0 0 0 rg',
    ];
  }),
  text(LEFT, rowY(HOURS.length) - 20, 'Student: Sample Student', 8),
  text(LEFT + 260, rowY(HOURS.length) - 20, 'Accurate as of: August 27, 2026', 8),
];
const stream = ops.join('\n');

const objects = [
  '<< /Type /Catalog /Pages 2 0 R >>',
  '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
  '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
];

let pdf = '%PDF-1.4\n';
const offsets = objects.map((body, i) => {
  const at = Buffer.byteLength(pdf);
  pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  return at;
});
const xref = Buffer.byteLength(pdf);
pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;

writeFileSync(new URL('../public/data/zombie-sample-timetable.pdf', import.meta.url), pdf);
console.log('wrote public/data/zombie-sample-timetable.pdf');

import { describe, expect, it } from 'vitest';
import { parseSchedule, parseTimeRange } from './parseSchedule';
import type { TextItem } from './parseSchedule';

// Builds items one line at a time, each string placed left to right like a PDF text run.
function lines(rows: string[][], page = 1): TextItem[] {
  return rows.flatMap((cells, r) => cells.map((str, c) => ({ str, x: 40 + c * 120, y: 50 + r * 20, w: str.length * 5, page })));
}

const at = (str: string, x: number, y: number): TextItem => ({ str, x, y, w: str.length * 5, page: 1 });

describe('parseTimeRange', () => {
  const hm = (r: [number, number] | null) => r && r.map((m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`);

  it('reads 24h ranges', () => expect(hm(parseTimeRange('13:00 - 14:30'))).toEqual(['13:00', '14:30']));
  it('shares a trailing meridiem', () => expect(hm(parseTimeRange('10-11am'))).toEqual(['10:00', '11:00']));
  it('handles ranges that cross noon', () => expect(hm(parseTimeRange('11 - 1pm'))).toEqual(['11:00', '13:00']));
  it('treats bare afternoon hours as pm', () => expect(hm(parseTimeRange('2:00-3:00'))).toEqual(['14:00', '15:00']));
  it('ignores dates', () => expect(parseTimeRange('2026-09-10')).toBeNull());
});

describe('parseSchedule, list layout', () => {
  it('reads one meeting per row with day, time and room', () => {
    const items = lines([
      ['MAT224H1', 'LEC0101', 'Monday', '10:00 - 11:00', 'BA 1130'],
      ['CSC148H1', 'TUT0203', 'Wed', '2:00 PM - 3:00 PM', 'SS2117'],
    ]);
    expect(parseSchedule(items)).toEqual([
      { id: 'pdf-1', day: 'Mon', title: 'MAT224H1 LEC', start: '10:00', end: '11:00', room: 'BA 1130', buildingCode: 'BA' },
      { id: 'pdf-2', day: 'Wed', title: 'CSC148H1 TUT', start: '14:00', end: '15:00', room: 'SS 2117', buildingCode: 'SS' },
    ]);
  });

  it('carries the course and day down from heading rows', () => {
    const items = lines([
      ['CSC148H1: Introduction to Computer Science'],
      ['LEC0101', 'Mon, Wed', '11:00-12:00', 'MP 202'],
      ['Thursday'],
      ['TUT0101', '3:00-4:00', 'GB 120'],
    ]);
    const got = parseSchedule(items).map((c) => `${c.day} ${c.start} ${c.title} ${c.room}`);
    expect(got).toEqual(['Mon 11:00 CSC148H1 LEC MP 202', 'Wed 11:00 CSC148H1 LEC MP 202', 'Thu 15:00 CSC148H1 TUT GB 120']);
  });
});

describe('parseSchedule, grid layout', () => {
  const header = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((d, i) => at(d, 100 + i * 100, 40));

  it('assigns cells to the column under each day header', () => {
    const items = [
      ...header,
      at('MAT224H1', 100, 80), at('LEC0101', 100, 92), at('10:00-11:00', 100, 104), at('BA 1130', 100, 116),
      at('PHY131H1', 300, 140), at('13:00-14:00', 300, 152), at('MP 102', 300, 164),
    ];
    expect(parseSchedule(items).map((c) => `${c.day} ${c.start}-${c.end} ${c.title} ${c.buildingCode}`)).toEqual([
      'Mon 10:00-11:00 MAT224H1 LEC BA',
      'Wed 13:00-14:00 PHY131H1 MP',
    ]);
  });

  it('falls back to the hour axis when a cell has no time', () => {
    const items = [...header, at('9 AM', 20, 60), at('10 AM', 20, 100), at('11 AM', 20, 140), at('STA247H1', 200, 104), at('SS 2102', 200, 116)];
    expect(parseSchedule(items)).toMatchObject([{ day: 'Tue', start: '10:00', end: '10:50', buildingCode: 'SS' }]);
  });
});

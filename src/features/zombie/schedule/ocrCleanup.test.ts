import { describe, expect, it } from 'vitest';
import { borrowRooms, cleanOcrWord, courseGuess, findCells, fuzzyDay, parseCellText, snapRoom, toInk } from './ocrCleanup';

describe('cleanOcrWord', () => {
  it.each([
    ['MAT244HI', 'MAT244H1'],
    ['MAT2O4H1', 'MAT204H1'],
    ['STA22OH1', 'STA220H1'],
    ['1O:0O', '10:00'],
    ['12.00', '12:00'],
    ['SS2l05', 'SS2105'],
    ['O03', '003'],
    ['|Monday', 'Monday'],
    ['Person)', 'Person)'],
    ['LEC', 'LEC'],
  ])('%s -> %s', (raw, fixed) => expect(cleanOcrWord(raw)).toBe(fixed));
});

describe('toInk', () => {
  const px = (rgb: number[][]) => new Uint8ClampedArray(rgb.flatMap((c) => [...c, 255]));
  const inkOf = (out: Uint8ClampedArray) => Array.from({ length: out.length / 4 }, (_, i) => (out[i * 4] < 128 ? 1 : 0));

  it('keeps black text on white paper', () => {
    expect(inkOf(toInk(px([[255, 255, 255], [20, 20, 20], [255, 255, 255]]), 3, 1, 1))).toEqual([0, 1, 0]);
  });

  it('turns white text on a coloured cell into ink, and the cell into paper', () => {
    const red = [200, 70, 60];
    expect(inkOf(toInk(px([red, [250, 250, 250], red]), 3, 1, 1))).toEqual([0, 1, 0]);
  });
});

describe('fuzzyDay', () => {
  it.each([
    ['Monday', 'Mon'],
    ['Tuosday', 'Tue'],
    ['Thurscay', 'Thu'],
    ['Fnday', 'Fri'],
    ['Wednesday', 'Wed'],
    ['Today', undefined],
    ['LEC', undefined],
  ])('%s -> %s', (raw, day) => expect(fuzzyDay(raw)).toBe(day));
});

describe('parseCellText', () => {
  it('reads a clean cell', () => {
    expect(parseCellText('MAT244H1\nLEC 0101\nIn Person\nBA 1130')).toEqual({ course: 'MAT244H1', section: 'LEC', room: 'BA 1130', buildingCode: 'BA' });
  });

  it('forgives misreads in the code and building letters', () => {
    expect(parseCellText('STA22OHI\nTUT 0201\n8A 1130')).toMatchObject({ course: 'STA220H1', section: 'TUT', room: 'BA 1130' });
  });

  it('finds a room split over two tokens and ignores bare numbers', () => {
    expect(parseCellText('CSC209H1 LEC0101 SS\n2102')).toMatchObject({ room: 'SS 2102', buildingCode: 'SS' });
  });
});

describe('courseGuess', () => {
  it.each([
    ['MAT244M1 F\nLEC 0201', 'MAT244'],
    ['MATZ3541 F', 'MAT235'],
    ['STA22OM1 F', 'STA220'],
    ['In Person', undefined],
  ])('%s -> %s', (text, code) => expect(courseGuess(text)).toBe(code));
});

describe('snapRoom', () => {
  const known = ['BA', 'BF', 'OI', 'RW', 'SS'];
  it.each([
    ['LEC 0201\n8F 30', 'BF'],
    ['TUT 0301\nQl 5200', 'OI'],
    ['Person)\n§S2we', 'SS'],
    ['Aw 117', 'RW'],
    ['BA 1160', 'BA'],
    ['LUBA', undefined],
  ])('%s -> %s', (text, code) => expect(snapRoom(text, known).buildingCode).toBe(code));
});

describe('borrowRooms', () => {
  const orange: [number, number, number] = [200, 96, 76];
  const teal: [number, number, number] = [64, 171, 179];
  const known = ['RW', 'BR', 'SS'];

  it('gives an unreadable lecture the room its section meets in all week', () => {
    const rows = [
      { bg: orange, section: 'LEC', room: 'RW 117', buildingCode: 'RW' },
      { bg: [204, 90, 68] as [number, number, number], section: 'LEC', room: 'CL RAN' },
      { bg: orange, section: 'LEC', room: 'RW 117', buildingCode: 'RW' },
    ];
    expect(borrowRooms(rows, known)[1]).toMatchObject({ room: 'RW 117', buildingCode: 'RW' });
  });

  it('borrows when OCR only caught part of the room number', () => {
    const rows = [
      { bg: orange, section: 'LEC', room: 'RW 117', buildingCode: 'RW' },
      { bg: orange, section: 'LEC', room: '17' },
    ];
    expect(borrowRooms(rows, known)[1]).toMatchObject({ room: 'RW 117', buildingCode: 'RW' });
  });

  it("doesn't borrow when the readable room number says it's a different room", () => {
    const rows = [
      { bg: teal, section: 'LEC', room: 'MS 3154', buildingCode: 'MS' },
      { bg: teal, section: 'LEC', room: 'AN 200' },
    ];
    expect(borrowRooms(rows, known)[1].buildingCode).toBeUndefined();
  });

  it("doesn't borrow across courses or from a tutorial", () => {
    const rows = [
      { bg: teal, section: 'LEC', room: 'BR 200', buildingCode: 'BR' },
      { bg: orange, section: 'TUT', room: 'SS 2105', buildingCode: 'SS' },
      { bg: orange, section: 'LEC', room: undefined },
    ];
    expect(borrowRooms(rows, known)[2].buildingCode).toBeUndefined();
  });
});

describe('findCells', () => {
  it('finds two coloured blocks on a white grid, with holes for their text', () => {
    const w = 40;
    const h = 40;
    const rgba = new Uint8ClampedArray(w * h * 4).fill(255);
    const paint = (x0: number, y0: number, x1: number, y1: number, c: number[]) => {
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) rgba.set([...c, 255], (y * w + x) * 4);
    };
    paint(2, 2, 18, 20, [200, 70, 60]);
    paint(6, 8, 12, 10, [250, 250, 250]); // text
    paint(22, 10, 38, 30, [60, 90, 200]);
    const cells = findCells(rgba, w, h);
    expect(cells.map(({ x0, y0, x1, y1 }) => [x0, y0, x1, y1])).toEqual([
      [2, 2, 17, 19],
      [22, 10, 37, 29],
    ]);
  });
});

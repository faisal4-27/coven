// Tiny "HH:MM" helpers so the planner can do time math in plain minutes.

export function toMinutes(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm ?? ''); // strict format so typos fail loudly instead of becoming NaN
  if (!m) throw new Error(`"${hhmm}" isn't a time, use HH:MM`);
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) throw new Error(`"${hhmm}" isn't a real time of day`); // 23:59 is the last valid minute
  return h * 60 + min;
}

// UofT classes start 10 minutes after the listed time ("9:00" begins at 9:10) and end on time.
export const CLASS_START_DELAY_MIN = 10;

/** When a class listed as `hhmm` actually begins. */
export const actualStart = (hhmm: string): string => toHHMM(toMinutes(hhmm) + CLASS_START_DELAY_MIN);

export function toHHMM(total: number): string {
  const h = Math.floor(total / 60) % 24; // wrap past midnight instead of showing 25:00
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

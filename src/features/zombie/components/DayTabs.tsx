// Weekday switcher across the top of Zombie mode. Each day keeps its own classes and plans itself.

import { PixelButton } from '../../../shared/ui';
import { DAY_NAMES, WEEKDAYS } from '../schedule/parseSchedule';
import type { Weekday } from '../schedule/parseSchedule';

interface Props {
  day: Weekday;
  counts: Partial<Record<Weekday, number>>;
  onChange: (day: Weekday) => void;
}

export function DayTabs({ day, counts, onChange }: Props) {
  const days = WEEKDAYS.filter((d) => (d !== 'Sat' && d !== 'Sun') || (counts[d] ?? 0) > 0 || d === day); // weekends only if something's on
  return (
    <div role="radiogroup" aria-label="Day of the week" className="flex gap-2 overflow-x-auto border-b-4 border-edge bg-dusk px-4 py-3 sm:justify-center sm:gap-3">
      {days.map((d) => (
        <PixelButton
          key={d}
          role="radio"
          aria-checked={day === d}
          accent="zombie"
          variant={day === d ? 'solid' : 'ghost'}
          className="min-w-16 flex-col gap-0! px-2!"
          onClick={() => onChange(d)}
          aria-label={`${DAY_NAMES[d]}, ${counts[d] ?? 0} classes`}
        >
          {d}
          <span className="font-pixel text-base normal-case">{counts[d] ?? 0}</span>
        </PixelButton>
      ))}
    </div>
  );
}

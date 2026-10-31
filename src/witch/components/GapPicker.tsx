import { useMemo } from 'react';
import { useCoven } from '../../shared/store';
import type { GapDurationMinutes } from '../types';

const GAP_OPTIONS: readonly GapDurationMinutes[] = [10, 20, 40, 60, 90];

export interface GapPickerProps {
  value: GapDurationMinutes;
  onChange: (minutes: GapDurationMinutes) => void;
}

export function GapPicker({ value, onChange }: GapPickerProps) {
  const events = useCoven((s) => s.events);

  // Compute nearest free window from shared calendar events if populated;
  // TODO(integration): Bind directly to shared timetable gap selector once
  // Banshee/Zombie populate `events` in `src/shared/store.ts`.
  const detectedCalendarGapMin = useMemo<number | null>(() => {
    if (!events || events.length < 2) return null;
    const sorted = [...events]
      .map((ev) => ({
        start: Date.parse(ev.start),
        end: Date.parse(ev.end),
      }))
      .filter((t) => Number.isFinite(t.start) && Number.isFinite(t.end) && t.end > t.start)
      .sort((a, b) => a.start - b.start);

    for (let i = 0; i < sorted.length - 1; i++) {
      const diffMin = Math.round((sorted[i + 1].start - sorted[i].end) / 60000);
      if (diffMin >= 10 && diffMin <= 180) {
        return diffMin;
      }
    }
    return null;
  }, [events]);

  return (
    <section
      className="witch-panel flex flex-col gap-3 p-4"
      aria-labelledby="witch-gap-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="witch-gap-heading" className="witch-head text-xs text-[#ff7a1a]">
          Time Gap Window
        </h3>
        <span className="text-lg text-[#d6b69c]">Selected: {value} min</span>
      </div>

      <div
        role="group"
        aria-label="Select available preparation time in minutes"
        className="grid grid-cols-5 gap-2"
      >
        {GAP_OPTIONS.map((mins) => {
          const active = value === mins;
          return (
            <button
              key={mins}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(mins)}
              className="witch-btn px-2 py-2 text-[10px]"
            >
              {mins}m
            </button>
          );
        })}
      </div>

      {detectedCalendarGapMin !== null ? (
        <p className="text-base text-[#ff9f43]">
          Shared calendar gap detected: ~{detectedCalendarGapMin} min between events.
        </p>
      ) : (
        <p className="text-base text-[#d6b69c]">
          Demo windows active until your Coven timetable events are loaded.
        </p>
      )}

      <p className="text-base text-[#d6b69c]">
        Campus gaps assume no stove access — look for{' '}
        <strong className="text-[#f4ecd8]">Packable</strong> or{' '}
        <strong className="text-[#f4ecd8]">Make-ahead</strong> potions before leaving home.
      </p>
    </section>
  );
}


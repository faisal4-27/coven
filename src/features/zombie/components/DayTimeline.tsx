// Vertical run-down of the day: class, leg (and coffee), class...

import { ModeIcon } from './ModeIcon';
import { MODE_COLOR, MODE_LABEL } from './modes';
import { DRINK_BUFFER_MIN } from '../planner/planDay';
import { actualStart } from '../planner/time';
import type { ClassEvent, Plan } from '../planner/types';

interface Props {
  classes: ClassEvent[];
  plan: Plan;
  nameOf: (id: string) => string;
  viaLabel: (viaId?: string) => string;
}

const legClass = 'ml-5 flex items-center gap-3 border-l-4 border-dashed py-2 pl-4 text-lg';

export function DayTimeline({ classes, plan, nameOf, viaLabel }: Props) {
  const coffeeByGap = new Map(plan.coffeeStops.map((s) => [s.gapIndex, s])); // quick lookup per gap

  return (
    <section className="flex flex-col gap-2" aria-labelledby="zombie-timeline-h">
      <h2 id="zombie-timeline-h" className="font-display text-sm uppercase tracking-widest text-ash">Today's shamble</h2>
      <ol className="flex flex-col">
        {classes.map((c, i) => {
          const leg = plan.legs[i]; // leg i leaves after class i, the last class has none
          const coffee = coffeeByGap.get(i);
          return [
            <li key={c.id} className="flex gap-3 bg-panel px-3 py-2 text-xl [box-shadow:0_0_0_4px_var(--color-edge)]">
              <span className="font-display text-zombie">{String(i + 1).padStart(2, '0')}</span>
              <span className="flex min-w-0 flex-col">
                <span>{c.title} <span className="text-ash">{actualStart(c.start)}-{c.end}</span></span>
                <span className="text-lg text-ash">{nameOf(c.buildingId)}</span>
              </span>
            </li>,
            leg && (
              <li key={`${c.id}-leg`} className={legClass} style={{ borderColor: MODE_COLOR[leg.mode] }}>
                <ModeIcon mode={leg.mode} />
                <span>
                  {MODE_LABEL[leg.mode]}{leg.viaId ? ` (${viaLabel(leg.viaId)})` : ''}: {leg.meters} m on foot, {leg.minutes} min
                  {leg.fitsGap === false && <span className="text-vampire"> Tight! Even this is longer than the gap.</span>}
                </span>
              </li>
            ),
            leg && coffee && (
              <li key={`${c.id}-coffee`} className={legClass} style={{ borderColor: MODE_COLOR.coffee }}>
                <ModeIcon mode="coffee" />
                <span>Coffee at {nameOf(coffee.shopId)}: +{coffee.extraMeters} m, {DRINK_BUFFER_MIN} min to sip</span>
              </li>
            ),
          ];
        })}
      </ol>
    </section>
  );
}

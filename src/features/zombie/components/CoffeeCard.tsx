// Shows the day's one coffee stop, placed in the gap where it costs the least extra walking.

import { Card } from '../../../shared/ui';
import { ModeIcon } from './ModeIcon';
import type { ClassEvent, CoffeeStop } from '../planner/types';

interface Props {
  stops: CoffeeStop[];
  classes: ClassEvent[];
  gapCount: number;
  nameOf: (id: string) => string;
}

export function CoffeeCard({ stops, classes, gapCount, nameOf }: Props) {
  return (
    <Card accent="hob" className="flex flex-col gap-3" aria-labelledby="zombie-coffee-h">
      <h2 id="zombie-coffee-h" className="flex items-center gap-3 font-display text-sm uppercase tracking-widest text-ash">
        <ModeIcon mode="coffee" scale={4} /> Caffeine
      </h2>
      {stops.length === 0 ? (
        <p className="text-xl">No cafe on the map yet. Brew at home and save the shuffle.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {stops.map((s) => (
            <li key={s.gapIndex} className="text-xl">
              After {classes[s.gapIndex]?.title}: <span className="text-hob">{nameOf(s.shopId)}</span>, +{s.extraMeters} m extra walking
              {s.fitsGap === false && <span className="text-vampire"> Tight! You'll be a little late, but coffee is non-negotiable.</span>}
            </li>
          ))}
        </ul>
      )}
      {stops.length > 0 && gapCount > 1 && <p className="text-lg text-ash">Placed in the gap where it's least out of the way.</p>}
    </Card>
  );
}

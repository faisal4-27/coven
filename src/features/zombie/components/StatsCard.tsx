// The headline number: how much walking the plan saved, plus an energy bar.

import { zombie } from '../../../shared/sprites';
import { PixelSprite } from '../../../shared/ui';
import type { PlanTotals } from '../planner/types';
import { EnergyMeter } from './EnergyMeter';

const METERS_PER_PERCENT = 30; // 3 km of walking drains the bar, so a light day stays near full

const energyFor = (meters: number) => Math.max(0, Math.min(100, Math.round(100 - meters / METERS_PER_PERCENT)));
const fmt = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`); // km once it's big enough to read better

export function StatsCard({ totals }: { totals: PlanTotals }) {
  const { plannedMeters, naiveMeters, savedMeters } = totals;
  const energy = energyFor(plannedMeters);
  const drained = energy < 40;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap-reverse items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-2">
          <span className="font-display text-sm uppercase tracking-widest text-ash">Walking saved</span>
          <p className="font-display text-4xl text-zombie">
            {savedMeters < 0 ? '-' : ''}{fmt(Math.abs(savedMeters))}{/* show a sign so a worse plan is never hidden */}
          </p>
          <p className="text-xl">
            {fmt(plannedMeters)} walked instead of {fmt(naiveMeters)}
          </p>
        </div>
        <div className="flex w-28 shrink-0 flex-col items-center text-center">
          <div className={drained ? 'animate-pulse' : 'anim-bob'}>
            <PixelSprite sprite={zombie} scale={3} />
          </div>
          <p className="mt-1 font-display text-sm uppercase tracking-widest text-ash">{drained ? 'Braaains...' : 'Shuffling fine'}</p>
        </div>
      </div>
      <EnergyMeter energy={energy} />
    </div>
  );
}

// Pixel health bar for remaining energy, same build as Vampire's BurnMeter. Empty = fully undead.

import { accents, colors } from '../../../shared/tokens';

const SEGMENTS = 10;

export function EnergyMeter({ energy, label = 'Energy' }: { energy: number; label?: string }) {
  const lit = Math.round((energy / 100) * SEGMENTS);
  return (
    <div className="flex items-center gap-3" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={energy} aria-label={`${label} ${energy}%`}>
      <span className="font-display text-sm uppercase tracking-widest text-ash">{label}</span>
      <div className="flex gap-1 bg-night p-1 [box-shadow:0_0_0_4px_var(--color-edge)]">
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <span
            key={i}
            className="h-4 w-3"
            style={{ background: i < lit ? (lit <= 3 ? accents.vampire.main : lit <= 6 ? accents.hob.main : accents.zombie.main) : colors.panelHi }}
          />
        ))}
      </div>
      <span className="w-12 text-right text-2xl tabular-nums">{energy}%</span>
    </div>
  );
}

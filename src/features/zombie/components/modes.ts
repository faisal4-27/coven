// Display names and colours for each mode, kept out of component files so hot reload keeps working.

import { accents, colors } from '../../../shared/tokens';
import type { LegMode } from '../planner/types';

export type IconMode = LegMode | 'coffee';

export const MODE_LABEL: Record<IconMode, string> = { walk: 'Walk', indoor: 'Indoor', subway: 'Subway', streetcar: 'Streetcar', coffee: 'Coffee' };

// Borrowed from the other monsters' accents so every screen speaks the same colour language.
export const MODE_COLOR: Record<IconMode, string> = {
  walk: accents.zombie.main,
  indoor: '#d4f08a', // pale zombie green, dashed on the map like Vampire's indoor legs
  subway: accents.banshee.main,
  streetcar: colors.moon,
  coffee: accents.hob.main,
};

export const MODE_DASHED: Record<IconMode, boolean> = { walk: false, indoor: true, subway: false, streetcar: false, coffee: true };

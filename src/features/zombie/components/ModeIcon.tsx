// 7x7 pixel icons for each way of getting around, plus coffee.

import { PixelSprite } from '../../../shared/ui';
import type { SpriteDef } from '../../../shared/sprites';
import { colors } from '../../../shared/tokens';
import { MODE_COLOR } from './modes';
import type { IconMode } from './modes';

const PALETTE = { b: colors.bone, g: MODE_COLOR.indoor, l: MODE_COLOR.subway, o: MODE_COLOR.coffee, y: MODE_COLOR.streetcar, w: MODE_COLOR.walk };

const icon = (rows: string[]): SpriteDef => ({ palette: PALETTE, frames: [rows] });

const ICONS: Record<IconMode, SpriteDef> = {
  walk: icon(['...w...', '..www..', '.w.w.w.', '...w...', '..w.w..', '.w...w.', '.......']), // little walking figure
  indoor: icon(['.ggggg.', '.g...g.', '.g...g.', '.g..gg.', '.g...g.', '.g...g.', 'ggggggg']), // door with a knob
  subway: icon(['.lllll.', 'l.....l', 'lllllll', 'l.l.l.l', 'lllllll', '.l...l.', 'l.....l']), // train front
  streetcar: icon(['...y...', '..y....', 'yyyyyyy', 'y.y.y.y', 'yyyyyyy', '.y...y.', '.......']), // tram with its pole
  coffee: icon(['.b.b...', '..b.b..', 'ooooo..', 'ooooooo', 'ooooo.o', 'oooooo.', '.ooo...']), // cup with steam
};

export function ModeIcon({ mode, scale = 3 }: { mode: IconMode; scale?: number }) {
  return <PixelSprite sprite={ICONS[mode]} scale={scale} className="shrink-0" />; // decorative, the label text sits next to it
}

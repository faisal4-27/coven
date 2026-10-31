import type {
  CoreIngredientId,
  CustomSpriteKind,
  IngredientId,
} from '../types';
import type { PixelGrid } from './palette';

export const INGREDIENT_SPRITES: Readonly<Record<CoreIngredientId, PixelGrid>> = {
  eggs: [
    '..oooo..',
    '.owwwwo.',
    'owwwcwwo',
    'owwwwwwo',
    'owwwwwwo',
    '.owwwwo.',
    '..oooo..',
    '........',
  ],
  milk: [
    '..oooo..',
    '.orrrro.',
    'owwwwwwo',
    'owuuuuwo',
    'owuuuuwo',
    'owwwwwwo',
    'owwwwwwo',
    '.oooooo.',
  ],
  yogurt: [
    'oooooooo',
    'orrrrrro',
    '.owwwwo.',
    '.owppwo.',
    '.owppwo.',
    '.owwwwo.',
    '..oooo..',
    '........',
  ],
  cheese: [
    '........',
    '....oooo',
    '..ooyyyo',
    '.oyyYyyo',
    'oyyyyyYo',
    'oyYyyyyo',
    'oooooooo',
    '........',
  ],
  spinach: [
    '...oo...',
    '..oggo..',
    '.oggGgo.',
    'oggGgggo',
    'oggGgGgo',
    '.oggGgo.',
    '..oggo..',
    '...bo...',
  ],
  tomato: [
    '...gg...',
    '..ogGo..',
    '.orrrrro',
    'orrwrrro',
    'orrrrrro',
    'orrrrRRo',
    '.orrrRo.',
    '..oooo..',
  ],
  banana: [
    '......oo',
    '.....oyo',
    '....oyyo',
    '...oyyYo',
    '..oyyYo.',
    '.oyyYo..',
    'oyYoo...',
    'oooo....',
  ],
  apple: [
    '...bg...',
    '..obgo..',
    '.orrrro.',
    'orwrrrro',
    'orrrrrro',
    'orrrrRRo',
    '.orrrRo.',
    '..oooo..',
  ],
  onion: [
    '...bb...',
    '..oppo..',
    '.opppPo.',
    'oppwpppo',
    'opwppppo',
    'oppppPpo',
    '.oppppo.',
    '..oooo..',
  ],
  carrot: [
    '..gg.g..',
    '...ggg..',
    '..onno..',
    '.onnnno.',
    '.onYnno.',
    '..onno..',
    '...oo...',
    '........',
  ],
  potato: [
    '..oooo..',
    '.obbtbo.',
    'obtbbbbo',
    'obbbtbbo',
    'obbbbbbo',
    '.obbtbo.',
    '..oooo..',
    '........',
  ],
  'frozen veg': [
    '..oggo..',
    '.oggGgo.',
    'oggGgggo',
    '.oggGgo.',
    '..ogGo..',
    '...cc...',
    '...oo...',
    '........',
  ],
  bread: [
    '.oooooo.',
    'otttttto',
    'otccccto',
    'otccccto',
    'otccccto',
    'otccccto',
    'otttttto',
    '.oooooo.',
  ],
  rice: [
    '..wwww..',
    '.wwwwww.',
    'wwwwwwww',
    'oooooooo',
    'orrrrrro',
    '.orrrro.',
    '..oooo..',
    '........',
  ],
  pasta: [
    '........',
    '.oyyyyo.',
    'oyYyYyyo',
    'oyyrrYyo',
    'oyYrryyo',
    '.oyyyyo.',
    '..oooo..',
    '........',
  ],
  tortilla: [
    '..oooo..',
    '.occcco.',
    'octcctco',
    'occctcco',
    'octcccto',
    'occcctco',
    '.occcco.',
    '..oooo..',
  ],
  oats: [
    '..tctt..',
    '.tctctc.',
    'tctctctc',
    'oooooooo',
    'obbbbbbo',
    '.obbbbo.',
    '..oooo..',
    '........',
  ],
  beans: [
    '........',
    '..ooooo.',
    '.orrrRRo',
    'orrRrrRo',
    '.oRRrrro',
    '..ooooo.',
    '........',
    '........',
  ],
  'peanut butter': [
    '.oooooo.',
    '.orrrro.',
    'oooooooo',
    'obttttbo',
    'obbbbbbo',
    'obbbbbbo',
    'obbbbbbo',
    '.oooooo.',
  ],
  'soy sauce': [
    '...oo...',
    '..orro..',
    '..oBBo..',
    '.oBBBBo.',
    '.oBwwBo.',
    '.oBBBBo.',
    '.oBBBBo.',
    '..oooo..',
  ],
};

export const CUSTOM_CATEGORY_SPRITES: Readonly<Record<CustomSpriteKind, PixelGrid>> = {
  leafy: [
    '.ooggoo.',
    'oggGGggo',
    'ogGGGGgo',
    '.ogGGgo.',
    '.owggwo.',
    '..owwo..',
    '..owwo..',
    '...oo...',
  ],
  protein: [
    '..oooo..',
    '.oBBBBo.',
    'oBbBBbBo',
    'oBBbBBBo',
    'ollllllo',
    '.ollllo.',
    '..oooo..',
    '........',
  ],
  scallion: [
    '.....ggo',
    '....ggGo',
    '...ggGo.',
    '..ggGo..',
    '.ggGo...',
    'owwo....',
    'owo.....',
    'oo......',
  ],
  seeds: [
    '........',
    '..oooo..',
    '.ocwcco.',
    'ocwcwcco',
    'occwcwco',
    '.ollllo.',
    '..oooo..',
    '........',
  ],
  sauce: [
    '........',
    '.oooooo.',
    'obbbbbbo',
    'obBttBbo',
    'obbbbbbo',
    '.ollllo.',
    '..oooo..',
    '........',
  ],
  oil: [
    '........',
    '..oooo..',
    '.owwwwo.',
    'owyyyywo',
    'owyyyywo',
    '.owwwwo.',
    '..oooo..',
    '........',
  ],
  jar: [
    '..oooo..',
    '.otttto.',
    '..oooo..',
    '.ouuuuo.',
    'ouuwuuuo',
    'ouuuuuuo',
    '.ouuuuo.',
    '..oooo..',
  ],
};

export function inferCustomSpriteKind(name: string): CustomSpriteKind {
  const lower = name.toLowerCase();
  if (
    lower.includes('bok choy') ||
    lower.includes('kale') ||
    lower.includes('lettuce') ||
    lower.includes('cabbage') ||
    lower.includes('herb') ||
    lower.includes('cilantro') ||
    lower.includes('basil')
  ) {
    return 'leafy';
  }
  if (
    lower.includes('scallion') ||
    lower.includes('green onion') ||
    lower.includes('chive') ||
    lower.includes('leek')
  ) {
    return 'scallion';
  }
  if (
    lower.includes('beef') ||
    lower.includes('bulgogi') ||
    lower.includes('chicken') ||
    lower.includes('pork') ||
    lower.includes('tofu') ||
    lower.includes('salmon') ||
    lower.includes('meat')
  ) {
    return 'protein';
  }
  if (
    lower.includes('seed') ||
    lower.includes('sesame') ||
    lower.includes('nut') ||
    lower.includes('garlic') ||
    lower.includes('ginger')
  ) {
    return 'seeds';
  }
  if (
    lower.includes('oil') ||
    lower.includes('butter') ||
    lower.includes('vinegar')
  ) {
    return 'oil';
  }
  if (
    lower.includes('sauce') ||
    lower.includes('tahini') ||
    lower.includes('paste') ||
    lower.includes('dressing') ||
    lower.includes('salsa')
  ) {
    return 'sauce';
  }
  return 'jar';
}

export function getIngredientSprite(
  id: IngredientId,
  spriteKind?: CustomSpriteKind
): PixelGrid {
  const coreHit = (INGREDIENT_SPRITES as Readonly<Record<string, PixelGrid>>)[id];
  if (coreHit) {
    return coreHit;
  }
  const kind = spriteKind ?? inferCustomSpriteKind(id);
  return CUSTOM_CATEGORY_SPRITES[kind];
}

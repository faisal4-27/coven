import { getIngredientMeta } from '../ingredients';
import type { DishTemplateName, IngredientId, PotionRecipe } from '../types';
import type { PixelGrid } from './palette';

export const DISH_TEMPLATES: Readonly<Record<DishTemplateName, PixelGrid>> = {
  toast: [
    '.oooooooo.',
    'otttttttto',
    'oAAAAAAAAo',
    'oBBBBBBBBo',
    'oCCCCCCCCo',
    'otttttttto',
    '.oooooooo.',
    '..........',
  ],
  cup: [
    '.oooooooo.',
    '.oAAAAAAo.',
    '..oBBBBo..',
    '..oBBBBo..',
    '..oCCCCo..',
    '..oCCCCo..',
    '...oooo...',
    '..........',
  ],
  bowl: [
    '...ABCA...',
    '..ABCABC..',
    '.ABCABCAB.',
    'oooooooooo',
    'ollllllllo',
    'ollllllllo',
    '.ollllllo.',
    '..oooooo..',
  ],
  plate: [
    '..........',
    '...oooo...',
    '.ooAABBoo.',
    'oAABBCCAAo',
    'oBBCCAABBo',
    '.ooCCAAoo.',
    '...oooo...',
    '..........',
  ],
  soup: [
    '..l..l....',
    '...l..l...',
    '.oooooooo.',
    'oAABACBAAo',
    'oBAAAAAACo',
    '.oAAAAAAo.',
    '..oooooo..',
    '..........',
  ],
};

export const SLOP_DISH_SPRITE: PixelGrid = [
  '..oooooo..',
  '.ouuuuuuo.',
  'ouwouuwouo',
  'ouuuuuuuuo',
  '.ouuuuuuo.',
  '..oooooo..',
];

export function getDishColorOverrides(
  ingredients: readonly IngredientId[]
): Readonly<Record<string, string>> {
  const nonBaseColors: string[] = [];
  const baseColors: string[] = [];

  for (const id of ingredients) {
    const meta = getIngredientMeta(id);
    if (meta.isBase) {
      baseColors.push(meta.color);
    } else {
      nonBaseColors.push(meta.color);
    }
  }

  const prioritized =
    nonBaseColors.length > 0
      ? [...nonBaseColors, ...baseColors]
      : [...baseColors, '#ff7a1a', '#ffb347', '#ff9f43'];

  const colorA = prioritized[0] ?? '#ff7a1a';
  const colorB = prioritized[1] ?? colorA;
  const colorC = prioritized[2] ?? prioritized[1] ?? colorA;

  return {
    A: colorA,
    B: colorB,
    C: colorC,
  };
}

export function getRecipeDishVisual(recipe: PotionRecipe): {
  grid: PixelGrid;
  overrides: Readonly<Record<string, string>>;
} {
  return {
    grid: DISH_TEMPLATES[recipe.sprite],
    overrides: getDishColorOverrides(recipe.ingredients),
  };
}

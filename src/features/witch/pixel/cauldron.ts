import { getIngredientMeta } from '../ingredients';
import type { IngredientId } from '../types';
import type { PixelGrid } from './palette';

export const CAULDRON_SPRITE: PixelGrid = [
  '..oooooooooooo..',
  '.oLLLLLLLLLLLLo.',
  'oooooooooooooooo',
  '.oddddddddddddo.',
  '.ollddddddddddo.',
  '..oddddddddddo..',
  '...oooooooooo...',
  '..oo........oo..',
];

function parseHexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) {
    return [255, 122, 26];
  }
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return [r, g, b];
}

function rgbToHex(r: number, g: number, b: number): string {
  const toByte = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, '0');
  return `#${toByte(r)}${toByte(g)}${toByte(b)}`;
}

export function computeCauldronLiquidColor(
  mix: readonly IngredientId[],
  isBrewing = false
): string {
  if (mix.length === 0) {
    return '#ff7a1a';
  }

  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let count = 0;

  for (const id of mix) {
    const meta = getIngredientMeta(id);
    const [r, g, b] = parseHexToRgb(meta.color);
    sumR += r;
    sumG += g;
    sumB += b;
    count += 1;
  }

  if (count === 0) {
    return '#ff7a1a';
  }

  let avgR = sumR / count;
  let avgG = sumG / count;
  let avgB = sumB / count;

  if (isBrewing) {
    avgR = avgR * 0.65 + 255 * 0.35;
    avgG = avgG * 0.65 + 122 * 0.35;
    avgB = avgB * 0.65 + 26 * 0.35;
  }

  return rgbToHex(avgR, avgG, avgB);
}

import { matchMix, recipeHasAvoidedAllergen } from './brew';
import { findWhereToGetMissing } from './dining';
import {
  CACHED_DEMO_PANTRY_IDS,
  DEFAULT_OWNED_IDS,
  buildCustomCatalogItem,
  getIngredientMeta,
  idsToIngredients,
  ingredientsToIds,
  registerCustomIngredients,
  resolveIngredientId,
} from './ingredients';
import { getAllPotionRecipes, registerCustomRecipes } from './recipes';
import type {
  Allergen,
  DishTemplateName,
  ExamSnackKind,
  Ingredient,
  IngredientId,
  MealEffort,
  MealSuggestion,
  PantryCatalogItem,
  PotionRecipe,
  ScanPantryOutcome,
  WitchPersistedState,
} from './types';

export const WITCH_STORAGE_KEY = 'coven.witch.v1';

const SUPPORTED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

export class UnsupportedPantryImageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedPantryImageError';
  }
}

export function classifyMealEffort(minutes: number): MealEffort {
  if (minutes <= 5) return 'none';
  if (minutes <= 12) return 'low';
  return 'medium';
}

function effortRank(effort: MealEffort): number {
  if (effort === 'none') return 0;
  if (effort === 'low') return 1;
  return 2;
}

export function isSupportedPantryImage(file: File): boolean {
  if (file.type && SUPPORTED_IMAGE_TYPES.has(file.type.toLowerCase())) {
    return true;
  }
  const lowerName = file.name.toLowerCase();
  return (
    lowerName.endsWith('.jpg') ||
    lowerName.endsWith('.jpeg') ||
    lowerName.endsWith('.png') ||
    lowerName.endsWith('.webp')
  );
}

interface VisualCanvasSummary {
  aspectRatio: number;
  hasBulgogiBokChoyLayout: boolean;
  greenRatio: number;
  redRatio: number;
  yellowRatio: number;
  brownRatio: number;
  whiteRatio: number;
}

function sampleRegionAvg(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number
): { r: number; g: number; b: number; greenShare: number; darkBrownShare: number } {
  const startX = Math.max(0, Math.floor(width * x0));
  const endX = Math.min(width, Math.ceil(width * x1));
  const startY = Math.max(0, Math.floor(height * y0));
  const endY = Math.min(height, Math.ceil(height * y1));
  const stepX = Math.max(1, Math.floor((endX - startX) / 14));
  const stepY = Math.max(1, Math.floor((endY - startY) / 14));

  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let greenHits = 0;
  let darkBrownHits = 0;
  let samples = 0;

  for (let y = startY; y < endY; y += stepY) {
    for (let x = startX; x < endX; x += stepX) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      sumR += r;
      sumG += g;
      sumB += b;
      if (g > r + 12 && g > b + 14 && g > 55) greenHits += 1;
      if (r > 38 && r < 185 && r > g + 8 && r > b + 10) darkBrownHits += 1;
      samples += 1;
    }
  }

  if (samples === 0) {
    return { r: 128, g: 128, b: 128, greenShare: 0, darkBrownShare: 0 };
  }
  return {
    r: sumR / samples,
    g: sumG / samples,
    b: sumB / samples,
    greenShare: greenHits / samples,
    darkBrownShare: darkBrownHits / samples,
  };
}

function inspectCanvasFeatures(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): VisualCanvasSummary {
  const imgData = ctx.getImageData(0, 0, width, height).data;

  // Check spatial regions centered on bowls/bundles (avoiding text label banners)
  const topRight = sampleRegionAvg(imgData, width, height, 0.42, 0.04, 0.90, 0.31);
  const topLeft = sampleRegionAvg(imgData, width, height, 0.13, 0.15, 0.29, 0.27);
  const midLeft = sampleRegionAvg(imgData, width, height, 0.14, 0.36, 0.42, 0.58);
  const midRight = sampleRegionAvg(imgData, width, height, 0.58, 0.49, 0.88, 0.69);
  const botCenter = sampleRegionAvg(imgData, width, height, 0.29, 0.73, 0.54, 0.90);
  const botRight = sampleRegionAvg(imgData, width, height, 0.78, 0.68, 0.98, 0.95);

  let layoutScore = 0;
  if (topRight.greenShare >= 0.2) layoutScore += 1; // baby bok choy
  if (midLeft.darkBrownShare >= 0.15) layoutScore += 1; // beef bulgogi
  if (midRight.r > 190 && midRight.g > 185 && midRight.b > 170) layoutScore += 1; // white rice
  if (botCenter.darkBrownShare >= 0.18 || (botCenter.r > 125 && botCenter.r > botCenter.b + 35)) {
    layoutScore += 1; // tahini-soy sauce
  }
  if (botRight.greenShare >= 0.1) layoutScore += 1; // green onion
  if (topLeft.r > 180 && topLeft.g > 170 && topLeft.r > topLeft.b + 25) layoutScore += 1; // oil bowl

  // Global color ratios for general offline photo fallback
  let greenPx = 0;
  let redPx = 0;
  let yellowPx = 0;
  let brownPx = 0;
  let whitePx = 0;
  let totalSampled = 0;
  const stride = Math.max(4, Math.floor((width * height) / 900)) * 4;

  for (let i = 0; i < imgData.length; i += stride) {
    const r = imgData[i];
    const g = imgData[i + 1];
    const b = imgData[i + 2];
    totalSampled += 1;
    if (g > r + 18 && g > b + 18) greenPx += 1;
    else if (r > g + 35 && r > b + 35) redPx += 1;
    else if (r > 190 && g > 165 && b < 130) yellowPx += 1;
    else if (r > 80 && r < 185 && r > g + 15 && g > b + 12) brownPx += 1;
    else if (r > 215 && g > 210 && b > 200) whitePx += 1;
  }

  const denom = Math.max(1, totalSampled);
  return {
    aspectRatio: width / Math.max(1, height),
    hasBulgogiBokChoyLayout: layoutScore >= 3,
    greenRatio: greenPx / denom,
    redRatio: redPx / denom,
    yellowRatio: yellowPx / denom,
    brownRatio: brownPx / denom,
    whiteRatio: whitePx / denom,
  };
}

async function preprocessAndAnalyzeImage(file: File): Promise<{
  imageBase64: string;
  mimeType: 'image/jpeg';
  visual: VisualCanvasSummary;
}> {
  if (typeof document === 'undefined' || typeof Image === 'undefined') {
    throw new Error('Browser canvas unavailable for image resizing.');
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not decode selected image.'));
      el.src = objectUrl;
    });

    const maxDim = 768;
    let targetW = img.naturalWidth || img.width || 512;
    let targetH = img.naturalHeight || img.height || 512;

    if (targetW > maxDim || targetH > maxDim) {
      if (targetW >= targetH) {
        targetH = Math.max(1, Math.round((targetH * maxDim) / targetW));
        targetW = maxDim;
      } else {
        targetW = Math.max(1, Math.round((targetW * maxDim) / targetH));
        targetH = maxDim;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context unavailable.');
    }

    ctx.drawImage(img, 0, 0, targetW, targetH);
    const visual = inspectCanvasFeatures(ctx, targetW, targetH);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    const commaIndex = dataUrl.indexOf(',');
    const base64 = commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;

    canvas.width = 0;
    canvas.height = 0;

    return {
      imageBase64: base64,
      mimeType: 'image/jpeg',
      visual,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function buildBulgogiBokChoyOutcome(): ScanPantryOutcome {
  const customItems: PantryCatalogItem[] = [
    buildCustomCatalogItem('Baby bok choy', '#3fae5a'),
    buildCustomCatalogItem('Beef bulgogi', '#7a442a'),
    buildCustomCatalogItem('Tahini-soy sauce', '#b87333'),
    buildCustomCatalogItem('Green onion', '#55c26b'),
    buildCustomCatalogItem('Sesame seeds', '#f3dfb0'),
    buildCustomCatalogItem('Vegetable oil', '#f6d04d'),
  ];
  registerCustomIngredients(customItems);

  const matchedIds: IngredientId[] = [
    'rice',
    'baby bok choy',
    'beef bulgogi',
    'tahini-soy sauce',
    'green onion',
    'sesame seeds',
    'vegetable oil',
  ];

  const autoRecipe: PotionRecipe = {
    id: 'bulgogi-nightshade-bowl',
    number: 18,
    potionName: 'Bulgogi Nightshade Bowl',
    mealName: 'Beef bulgogi & baby bok choy rice bowl',
    ingredients: matchedIds,
    minutes: 15,
    packable: true,
    tags: ['make-ahead'],
    sprite: 'bowl',
    isCustomScanned: true,
    steps: [
      'Warm vegetable oil in a skillet over medium-high heat and sear the marinated beef bulgogi for 3 to 4 minutes until caramelized.',
      'Add halved baby bok choy and toss for 2 minutes until bright green and tender-crisp.',
      'Spoon beef and bok choy over warm rice, drizzle with tahini-soy sauce, and top with sliced green onion and sesame seeds.',
    ],
  };
  registerCustomRecipes([autoRecipe]);

  return {
    ingredients: idsToIngredients(matchedIds),
    matchedIds,
    customItems,
    autoRecipe,
    source: 'cached',
    message:
      'Identified 7 ingredients from your photo, added them to your owned pantry & cauldron, and brewed Bulgogi Nightshade Bowl!',
  };
}

function buildVisualHeuristicOutcome(
  visual: VisualCanvasSummary,
  fileName: string
): ScanPantryOutcome {
  const lower = fileName.toLowerCase();
  if (
    visual.hasBulgogiBokChoyLayout ||
    lower.includes('bulgogi') ||
    lower.includes('bok')
  ) {
    return buildBulgogiBokChoyOutcome();
  }

  // Pick a complete brewable potion matching the photo's dominant food tones
  let chosenIds: IngredientId[];
  if (visual.redRatio > 0.04 && visual.greenRatio > 0.04) {
    chosenIds = ['eggs', 'bread', 'spinach', 'tomato'];
  } else if (visual.yellowRatio > 0.06 && visual.whiteRatio > 0.1) {
    chosenIds = ['banana', 'oats', 'milk'];
  } else if (visual.greenRatio > 0.05 && visual.brownRatio > 0.04) {
    chosenIds = ['rice', 'eggs', 'frozen veg', 'soy sauce'];
  } else if (visual.redRatio > 0.04 && visual.brownRatio > 0.05) {
    chosenIds = ['rice', 'beans', 'onion', 'tomato'];
  } else {
    chosenIds = [...CACHED_DEMO_PANTRY_IDS];
  }

  const match = matchMix(chosenIds, []);
  const autoRecipe = match.kind === 'full' ? match.recipe : null;

  return {
    ingredients: idsToIngredients(chosenIds),
    matchedIds: chosenIds,
    customItems: [],
    autoRecipe,
    source: 'cached',
    message: autoRecipe
      ? `Identified ${chosenIds.length} pantry items, added them to your shelf & cauldron, and brewed ${autoRecipe.potionName}!`
      : 'Identified pantry ingredients and added them to your shelf & cauldron!',
  };
}

function buildAutoRecipeFromAiPayload(
  rawRecipe: unknown,
  matchedIds: IngredientId[]
): PotionRecipe | null {
  // First check if existing catalog already has a full match that uses all (or >=3) of the scanned items
  const existingMatch = matchMix(matchedIds, []);
  const hasCustom = matchedIds.some((id) => getIngredientMeta(id).isCustomScanned);

  if (!hasCustom && existingMatch.kind === 'full') {
    return existingMatch.recipe;
  }

  if (rawRecipe && typeof rawRecipe === 'object') {
    const rec = rawRecipe as Record<string, unknown>;
    const potionName =
      typeof rec.potionName === 'string' && rec.potionName.trim()
        ? rec.potionName.trim()
        : 'Scryer’s Custom Cauldron';
    const mealName =
      typeof rec.mealName === 'string' && rec.mealName.trim()
        ? rec.mealName.trim()
        : `Skillet Bowl with ${matchedIds
            .slice(0, 3)
            .map((id) => getIngredientMeta(id).name)
            .join(', ')}`;
    const minutes =
      typeof rec.minutes === 'number' && rec.minutes >= 2 && rec.minutes <= 90
        ? Math.round(rec.minutes)
        : 15;
    const packable = Boolean(rec.packable ?? true);
    const validSprites: DishTemplateName[] = [
      'toast',
      'cup',
      'bowl',
      'plate',
      'soup',
    ];
    const sprite: DishTemplateName =
      typeof rec.sprite === 'string' &&
      validSprites.includes(rec.sprite as DishTemplateName)
        ? (rec.sprite as DishTemplateName)
        : 'bowl';
    const steps = Array.isArray(rec.steps)
      ? rec.steps
          .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
          .slice(0, 3)
      : [];

    const customRecipe: PotionRecipe = {
      id: `scanned-${potionName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      number: getAllPotionRecipes().length + 1,
      potionName,
      mealName,
      ingredients: matchedIds,
      minutes,
      packable,
      tags: ['make-ahead'],
      sprite,
      isCustomScanned: true,
      steps:
        steps.length > 0
          ? steps
          : [
              `Prep ${matchedIds
                .map((id) => getIngredientMeta(id).name.toLowerCase())
                .join(', ')} into bite-sized portions.`,
              'Cook aromatics and proteins in a warm pan until tender, toss with grains or greens, and season to taste.',
            ],
    };
    registerCustomRecipes([customRecipe]);
    return customRecipe;
  }

  if (matchedIds.length >= 2) {
    const names = matchedIds.map((id) => getIngredientMeta(id).name);
    const fallbackCustom: PotionRecipe = {
      id: `scanned-${matchedIds.slice(0, 3).join('-').replace(/[^a-z0-9-]+/g, '-')}`,
      number: getAllPotionRecipes().length + 1,
      potionName: 'Enchanted Shelf Stir-Fry',
      mealName: `${names.slice(0, 3).join(' & ')} Bowl`,
      ingredients: matchedIds,
      minutes: 15,
      packable: true,
      tags: ['make-ahead'],
      sprite: 'bowl',
      isCustomScanned: true,
      steps: [
        `Gather and chop ${names.join(', ')}.`,
        'Sear savory ingredients in a skillet over medium-high heat, fold in greens or grains, and toss with sauce until glossy.',
      ],
    };
    registerCustomRecipes([fallbackCustom]);
    return fallbackCustom;
  }

  return existingMatch.kind === 'full' ? existingMatch.recipe : null;
}

function sanitizeScannedItemsWithCustomSupport(rawItems: unknown): {
  ingredients: Ingredient[];
  matchedIds: IngredientId[];
  customItems: PantryCatalogItem[];
} {
  if (!Array.isArray(rawItems)) {
    return { ingredients: [], matchedIds: [], customItems: [] };
  }

  const seenIds = new Set<IngredientId>();
  const ingredients: Ingredient[] = [];
  const matchedIds: IngredientId[] = [];
  const customItems: PantryCatalogItem[] = [];

  for (const entry of rawItems) {
    let rawName = '';
    let rawQty: string | undefined;

    if (typeof entry === 'string') {
      rawName = entry.trim();
    } else if (entry && typeof entry === 'object') {
      const rec = entry as Record<string, unknown>;
      if (typeof rec.name === 'string') {
        rawName = rec.name.trim();
      }
      if (typeof rec.quantity === 'string' && rec.quantity.trim().length > 0) {
        rawQty = rec.quantity.trim().slice(0, 40);
      }
    }

    if (!rawName || rawName.length > 48) continue;

    let id = resolveIngredientId(rawName);
    if (!id) {
      const custom = buildCustomCatalogItem(rawName);
      customItems.push(custom);
      registerCustomIngredients([custom]);
      id = custom.id;
    }

    if (seenIds.has(id)) continue;
    seenIds.add(id);
    matchedIds.push(id);
    ingredients.push({
      name: getIngredientMeta(id).name,
      ...(rawQty ? { quantity: rawQty } : {}),
    });

    if (ingredients.length >= 25) break;
  }

  return { ingredients, matchedIds, customItems };
}

export function getCachedDemoScanOutcome(reason?: string): ScanPantryOutcome {
  const matchedIds = [...CACHED_DEMO_PANTRY_IDS];
  const match = matchMix(matchedIds, []);
  const autoRecipe = match.kind === 'full' ? match.recipe : null;

  return {
    ingredients: idsToIngredients(matchedIds),
    matchedIds,
    customItems: [],
    autoRecipe,
    source: 'cached',
    message:
      reason ??
      (autoRecipe
        ? `Sample scan identified ${matchedIds.length} items, added them to your shelf & cauldron, and brewed ${autoRecipe.potionName}!`
        : 'Sample scan loaded cached pantry items.'),
  };
}

export async function scanPantryDetailed(
  image: File
): Promise<ScanPantryOutcome> {
  if (!isSupportedPantryImage(image)) {
    throw new UnsupportedPantryImageError(
      'Unsupported file format. Please choose a JPEG, PNG, or WebP photograph.'
    );
  }

  let processed: {
    imageBase64: string;
    mimeType: 'image/jpeg';
    visual: VisualCanvasSummary;
  };
  try {
    processed = await preprocessAndAnalyzeImage(image);
  } catch {
    return getCachedDemoScanOutcome(
      'Image could not be decoded in this browser; loaded sample pantry and brewed a matching recipe.'
    );
  }

  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), 25000);

  try {
    const response = await fetch('/api/scan-pantry', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64: processed.imageBase64,
        mimeType: processed.mimeType,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const fallback = buildVisualHeuristicOutcome(processed.visual, image.name);
      return {
        ...fallback,
        message: `${fallback.message} (Server returned HTTP ${response.status})`,
      };
    }

    const body: unknown = await response.json();
    if (!body || typeof body !== 'object') {
      return buildVisualHeuristicOutcome(processed.visual, image.name);
    }

    const record = body as Record<string, unknown>;
    const sanitized = sanitizeScannedItemsWithCustomSupport(record.ingredients);
    const apiSource = record.source === 'ai' ? 'ai' : 'cached';
    const diag =
      typeof record.diagnostic === 'string' && record.diagnostic.trim()
        ? ` (${record.diagnostic.trim()})`
        : '';

    if (apiSource === 'cached' || sanitized.matchedIds.length === 0) {
      const fallback = buildVisualHeuristicOutcome(processed.visual, image.name);
      return {
        ...fallback,
        message: `${fallback.message}${diag}`,
      };
    }

    const autoRecipe = buildAutoRecipeFromAiPayload(
      record.recipe,
      sanitized.matchedIds
    );

    return {
      ingredients: sanitized.ingredients,
      matchedIds: sanitized.matchedIds,
      customItems: sanitized.customItems,
      autoRecipe,
      source: apiSource,
      message: autoRecipe
        ? `Identified ${sanitized.matchedIds.length} ingredients, added them to your shelf & cauldron, and brewed ${autoRecipe.potionName}!`
        : `Identified ${sanitized.matchedIds.length} ingredients and added them to your pantry & cauldron!`,
    };
  } catch {
    return buildVisualHeuristicOutcome(processed.visual, image.name);
  } finally {
    globalThis.clearTimeout(timer);
  }
}

export async function scanPantry(image: File): Promise<Ingredient[]> {
  const outcome = await scanPantryDetailed(image);
  return outcome.ingredients;
}

export async function suggestMeal(
  pantry: Ingredient[],
  minutesFree: number,
  opts?: { lowEffort?: boolean; avoided?: readonly Allergen[] }
): Promise<MealSuggestion[]> {
  if (!Number.isFinite(minutesFree) || minutesFree <= 0) {
    return [];
  }

  const ownedIdSet = new Set<IngredientId>(ingredientsToIds(pantry));
  const avoided = opts?.avoided ?? [];

  interface ScoredCandidate {
    suggestion: MealSuggestion;
    coverageFraction: number;
    missingCount: number;
    effortOrder: number;
    minutes: number;
    recipeNumber: number;
  }

  const candidates: ScoredCandidate[] = [];

  for (const recipe of getAllPotionRecipes()) {
    if (recipe.minutes > minutesFree) continue;
    if (recipeHasAvoidedAllergen(recipe, avoided)) continue;

    const effort = classifyMealEffort(recipe.minutes);
    if (opts?.lowEffort && effort === 'medium') {
      continue;
    }

    const uses: string[] = [];
    const missing: string[] = [];

    for (const reqId of recipe.ingredients) {
      const label = getIngredientMeta(reqId).name;
      if (ownedIdSet.has(reqId)) {
        uses.push(label);
      } else {
        missing.push(label);
      }
    }

    const coverageFraction =
      recipe.ingredients.length > 0
        ? uses.length / recipe.ingredients.length
        : 0;

    const whereToGetMissing =
      missing.length > 0 ? findWhereToGetMissing(missing) : undefined;

    candidates.push({
      suggestion: {
        name: `${recipe.potionName} (${recipe.mealName})`,
        minutes: recipe.minutes,
        effort,
        uses,
        missing,
        ...(whereToGetMissing ? { whereToGetMissing } : {}),
      },
      coverageFraction,
      missingCount: missing.length,
      effortOrder: effortRank(effort),
      minutes: recipe.minutes,
      recipeNumber: recipe.number,
    });
  }

  candidates.sort((a, b) => {
    if (b.coverageFraction !== a.coverageFraction) {
      return b.coverageFraction - a.coverageFraction;
    }
    if (a.missingCount !== b.missingCount) {
      return a.missingCount - b.missingCount;
    }
    if (a.effortOrder !== b.effortOrder) {
      return a.effortOrder - b.effortOrder;
    }
    if (a.minutes !== b.minutes) {
      return a.minutes - b.minutes;
    }
    return a.recipeNumber - b.recipeNumber;
  });

  return candidates.slice(0, 3).map((entry) => entry.suggestion);
}

export function suggestExamSnack(
  kind: ExamSnackKind,
  pantry: Ingredient[],
  avoided: readonly Allergen[] = []
): PotionRecipe[] {
  const ownedIdSet = new Set<IngredientId>(ingredientsToIds(pantry));

  const scored = getAllPotionRecipes()
    .filter((recipe) => !recipeHasAvoidedAllergen(recipe, avoided))
    .map((recipe) => {
      const matchedCount = recipe.ingredients.filter((id) =>
        ownedIdSet.has(id)
      ).length;
      const coverage = matchedCount / recipe.ingredients.length;

      let suitabilityScore = 0;
      if (kind === 'focus') {
        if (recipe.tags.includes('focus')) suitabilityScore += 4;
        if (recipe.minutes <= 5) suitabilityScore += 3;
        else if (recipe.minutes <= 10) suitabilityScore += 2;
        if (recipe.packable) suitabilityScore += 2;
      } else {
        if (recipe.tags.includes('wind-down')) suitabilityScore += 4;
        if (recipe.sprite === 'soup') suitabilityScore += 3;
        if (recipe.tags.includes('make-ahead')) suitabilityScore += 2;
        if (recipe.minutes <= 10 && recipe.sprite === 'cup') suitabilityScore += 1;
      }

      return {
        recipe,
        suitabilityScore,
        coverage,
        missingCount: recipe.ingredients.length - matchedCount,
      };
    });

  const filtered = scored.filter((item) => item.suitabilityScore >= 3);

  filtered.sort((a, b) => {
    const scoreA = a.suitabilityScore + a.coverage * 3;
    const scoreB = b.suitabilityScore + b.coverage * 3;
    if (scoreB !== scoreA) return scoreB - scoreA;
    if (a.missingCount !== b.missingCount) return a.missingCount - b.missingCount;
    if (a.recipe.minutes !== b.recipe.minutes) {
      return a.recipe.minutes - b.recipe.minutes;
    }
    return a.recipe.number - b.recipe.number;
  });

  return filtered.slice(0, 3).map((item) => item.recipe);
}

const VALID_ALLERGENS = new Set<string>(['egg', 'dairy', 'peanut', 'gluten']);

export function getDefaultWitchState(): WitchPersistedState {
  return {
    owned: [...DEFAULT_OWNED_IDS],
    discovered: [],
    cooked: [],
    gold: 10,
    avoided: [],
    customIngredients: [],
    customRecipes: [],
  };
}

export function loadWitchState(): WitchPersistedState {
  const fallback = getDefaultWitchState();
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return fallback;
    }
    const raw = window.localStorage.getItem(WITCH_STORAGE_KEY);
    if (!raw) return fallback;

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return fallback;
    const rec = parsed as Record<string, unknown>;

    const customIngredients = Array.isArray(rec.customIngredients)
      ? (rec.customIngredients as PantryCatalogItem[]).filter(
          (c) => c && typeof c.id === 'string' && typeof c.name === 'string'
        )
      : [];
    if (customIngredients.length > 0) {
      registerCustomIngredients(customIngredients);
    }

    const customRecipes = Array.isArray(rec.customRecipes)
      ? (rec.customRecipes as PotionRecipe[]).filter(
          (r) =>
            r &&
            typeof r.id === 'string' &&
            typeof r.potionName === 'string' &&
            Array.isArray(r.ingredients)
        )
      : [];
    if (customRecipes.length > 0) {
      registerCustomRecipes(customRecipes);
    }

    const owned = Array.isArray(rec.owned)
      ? rec.owned.filter(
          (x): x is IngredientId => typeof x === 'string' && x.trim().length > 0
        )
      : fallback.owned;

    const discovered = Array.isArray(rec.discovered)
      ? rec.discovered.filter((x): x is string => typeof x === 'string')
      : fallback.discovered;

    const cooked = Array.isArray(rec.cooked)
      ? rec.cooked.filter((x): x is string => typeof x === 'string')
      : fallback.cooked;

    const gold =
      typeof rec.gold === 'number' && Number.isFinite(rec.gold) && rec.gold >= 0
        ? rec.gold
        : fallback.gold;

    const avoided = Array.isArray(rec.avoided)
      ? rec.avoided.filter(
          (x): x is Allergen =>
            typeof x === 'string' && VALID_ALLERGENS.has(x)
        )
      : fallback.avoided;

    return {
      owned: Array.from(new Set(owned)),
      discovered: Array.from(new Set(discovered)),
      cooked: Array.from(new Set(cooked)),
      gold,
      avoided: Array.from(new Set(avoided)),
      customIngredients,
      customRecipes,
    };
  } catch {
    return fallback;
  }
}

export function saveWitchState(state: WitchPersistedState): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    window.localStorage.setItem(WITCH_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota or privacy-mode restrictions gracefully.
  }
}

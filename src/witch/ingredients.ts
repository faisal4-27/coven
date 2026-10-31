import { inferCustomSpriteKind } from './pixel/icons';
import type {
  Allergen,
  Ingredient,
  IngredientId,
  PantryCatalogItem,
} from './types';

export const CORE_INGREDIENTS: readonly PantryCatalogItem[] = [
  {
    id: 'eggs',
    name: 'Eggs',
    priceCad: 0.8,
    allergen: 'egg',
    color: '#f6dc7a',
    isBase: false,
    synonyms: ['egg', 'eggs', 'large egg', 'large eggs', 'whole egg'],
  },
  {
    id: 'milk',
    name: 'Milk',
    priceCad: 0.6,
    allergen: 'dairy',
    color: '#f4efe6',
    isBase: false,
    synonyms: ['milk', 'whole milk', 'skim milk', '2% milk', 'dairy milk'],
  },
  {
    id: 'yogurt',
    name: 'Yogurt',
    priceCad: 0.9,
    allergen: 'dairy',
    color: '#fff3ea',
    isBase: false,
    synonyms: ['yogurt', 'yoghurt', 'greek yogurt', 'plain yogurt'],
  },
  {
    id: 'cheese',
    name: 'Cheese',
    priceCad: 1.0,
    allergen: 'dairy',
    color: '#f6c33d',
    isBase: false,
    synonyms: ['cheese', 'cheeses', 'cheddar', 'mozzarella', 'shredded cheese'],
  },
  {
    id: 'spinach',
    name: 'Spinach',
    priceCad: 0.9,
    allergen: null,
    color: '#3fae5a',
    isBase: false,
    synonyms: ['spinach', 'baby spinach', 'spinach leaves'],
  },
  {
    id: 'tomato',
    name: 'Tomato',
    priceCad: 0.8,
    allergen: null,
    color: '#e0453a',
    isBase: false,
    synonyms: [
      'tomato',
      'tomatoes',
      'cherry tomatoes',
      'roma tomato',
      'diced tomatoes',
      'canned tomatoes',
    ],
  },
  {
    id: 'banana',
    name: 'Banana',
    priceCad: 0.4,
    allergen: null,
    color: '#f6d04d',
    isBase: false,
    synonyms: ['banana', 'bananas', 'ripe banana'],
  },
  {
    id: 'apple',
    name: 'Apple',
    priceCad: 0.7,
    allergen: null,
    color: '#d63d3d',
    isBase: false,
    synonyms: ['apple', 'apples', 'red apple', 'green apple', 'gala apple'],
  },
  {
    id: 'onion',
    name: 'Onion',
    priceCad: 0.3,
    allergen: null,
    color: '#c98ad0',
    isBase: false,
    synonyms: ['onion', 'onions', 'yellow onion', 'red onion', 'white onion'],
  },
  {
    id: 'carrot',
    name: 'Carrot',
    priceCad: 0.4,
    allergen: null,
    color: '#f08a2e',
    isBase: false,
    synonyms: ['carrot', 'carrots', 'baby carrots'],
  },
  {
    id: 'potato',
    name: 'Potato',
    priceCad: 0.5,
    allergen: null,
    color: '#c9955a',
    isBase: false,
    synonyms: ['potato', 'potatoes', 'russet potato', 'yellow potato'],
  },
  {
    id: 'frozen veg',
    name: 'Frozen veg',
    priceCad: 0.9,
    allergen: null,
    color: '#55c26b',
    isBase: false,
    synonyms: [
      'frozen veg',
      'frozen vegetables',
      'frozen veggies',
      'mixed vegetables',
      'mixed veg',
      'peas and carrots',
    ],
  },
  {
    id: 'bread',
    name: 'Bread',
    priceCad: 0.5,
    allergen: 'gluten',
    color: '#e0b070',
    isBase: true,
    synonyms: ['bread', 'loaf of bread', 'sliced bread', 'toast', 'whole wheat bread'],
  },
  {
    id: 'rice',
    name: 'Rice',
    priceCad: 0.4,
    allergen: null,
    color: '#f4efe6',
    isBase: true,
    synonyms: ['rice', 'white rice', 'brown rice', 'jasmine rice', 'basmati rice', 'cooked rice'],
  },
  {
    id: 'pasta',
    name: 'Pasta',
    priceCad: 0.6,
    allergen: 'gluten',
    color: '#f0cf6a',
    isBase: true,
    synonyms: ['pasta', 'spaghetti', 'penne', 'macaroni', 'noodles', 'fusilli'],
  },
  {
    id: 'tortilla',
    name: 'Tortilla',
    priceCad: 0.7,
    allergen: 'gluten',
    color: '#e6c58b',
    isBase: true,
    synonyms: ['tortilla', 'tortillas', 'flour tortilla', 'wrap', 'wraps'],
  },
  {
    id: 'oats',
    name: 'Oats',
    priceCad: 0.3,
    allergen: null,
    color: '#d8b98a',
    isBase: true,
    synonyms: ['oats', 'oat', 'rolled oats', 'quick oats', 'oatmeal'],
  },
  {
    id: 'beans',
    name: 'Beans',
    priceCad: 0.9,
    allergen: null,
    color: '#a82a2e',
    isBase: false,
    synonyms: [
      'beans',
      'bean',
      'black beans',
      'kidney beans',
      'pinto beans',
      'canned beans',
      'chickpeas',
    ],
  },
  {
    id: 'peanut butter',
    name: 'Peanut butter',
    priceCad: 0.5,
    allergen: 'peanut',
    color: '#a8693a',
    isBase: false,
    synonyms: ['peanut butter', 'peanutbutter', 'pb', 'jar of peanut butter'],
  },
  {
    id: 'soy sauce',
    name: 'Soy sauce',
    priceCad: 0.2,
    allergen: null,
    color: '#6b3f22',
    isBase: false,
    synonyms: ['soy sauce', 'soysauce', 'shoyu', 'tamari'],
  },
];

// Mutable backing map so custom photo-scanned ingredients work seamlessly across all lookups.
const mutableCatalogRecord: Record<string, PantryCatalogItem> = {};
for (const item of CORE_INGREDIENTS) {
  mutableCatalogRecord[item.id] = item;
}

export const INGREDIENTS: readonly PantryCatalogItem[] = CORE_INGREDIENTS;

export const INGREDIENT_BY_ID: Readonly<Record<string, PantryCatalogItem>> =
  mutableCatalogRecord;

export const DEFAULT_OWNED_IDS: readonly IngredientId[] = ['eggs', 'bread', 'rice'];

export const CACHED_DEMO_PANTRY_IDS: readonly IngredientId[] = [
  'eggs',
  'rice',
  'bread',
  'onion',
  'tomato',
  'peanut butter',
  'spinach',
  'oats',
];

function inferCustomColor(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('bok choy') || lower.includes('green') || lower.includes('scallion')) {
    return '#3fae5a';
  }
  if (lower.includes('beef') || lower.includes('bulgogi') || lower.includes('meat')) {
    return '#7a442a';
  }
  if (lower.includes('tahini') || lower.includes('sauce')) {
    return '#b87333';
  }
  if (lower.includes('sesame') || lower.includes('seed') || lower.includes('garlic')) {
    return '#f3dfb0';
  }
  if (lower.includes('oil') || lower.includes('butter')) {
    return '#f6d04d';
  }
  return '#9a7bff';
}

function inferCustomAllergen(name: string): Allergen | null {
  const lower = name.toLowerCase();
  if (lower.includes('peanut')) return 'peanut';
  if (lower.includes('milk') || lower.includes('cream') || lower.includes('cheese') || lower.includes('butter') && !lower.includes('peanut')) {
    return 'dairy';
  }
  if (lower.includes('egg')) return 'egg';
  if (lower.includes('wheat') || lower.includes('flour') || lower.includes('bread') || lower.includes('noodle')) {
    return 'gluten';
  }
  return null;
}

export function buildCustomCatalogItem(
  rawName: string,
  colorOverride?: string
): PantryCatalogItem {
  const trimmed = rawName.trim();
  const id = trimmed.toLowerCase();
  const displayName =
    trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return {
    id,
    name: displayName,
    priceCad: 0.75,
    allergen: inferCustomAllergen(id),
    color: colorOverride ?? inferCustomColor(id),
    isBase: id.includes('rice') || id.includes('noodle') || id.includes('grain'),
    synonyms: [id],
    spriteKind: inferCustomSpriteKind(id),
    isCustomScanned: true,
  };
}

export function registerCustomIngredients(
  items: readonly PantryCatalogItem[]
): void {
  for (const item of items) {
    if (!mutableCatalogRecord[item.id]) {
      mutableCatalogRecord[item.id] = item;
    }
  }
}

export function clearCustomIngredients(): void {
  const coreIds = new Set<string>(CORE_INGREDIENTS.map((i) => i.id));
  for (const key of Object.keys(mutableCatalogRecord)) {
    if (!coreIds.has(key)) {
      delete mutableCatalogRecord[key];
    }
  }
}

export function getAllCatalogIngredients(): PantryCatalogItem[] {
  const coreIds = new Set(CORE_INGREDIENTS.map((i) => i.id));
  const custom = Object.values(mutableCatalogRecord).filter(
    (item) => !coreIds.has(item.id)
  );
  // Put newly scanned custom items first so they are immediately visible at the top of the shelf!
  return [...custom, ...CORE_INGREDIENTS];
}

export function getIngredientMeta(id: IngredientId): PantryCatalogItem {
  const hit = mutableCatalogRecord[id];
  if (hit) return hit;
  const fallback = buildCustomCatalogItem(id);
  mutableCatalogRecord[id] = fallback;
  return fallback;
}

function cleanToken(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9\s%-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function resolveIngredientId(rawName: string): IngredientId | null {
  const cleaned = cleanToken(rawName);
  if (!cleaned) return null;

  // Exact match against any registered custom or core item first
  const allItems = Object.values(mutableCatalogRecord);
  for (const item of allItems) {
    if (item.id === cleaned || item.name.toLowerCase() === cleaned) {
      return item.id;
    }
    if (item.synonyms.includes(cleaned)) {
      return item.id;
    }
  }

  const depluralized = cleaned.endsWith('oes')
    ? cleaned.slice(0, -2)
    : cleaned.endsWith('s') && cleaned.length > 3
      ? cleaned.slice(0, -1)
      : cleaned;

  for (const item of allItems) {
    if (
      item.id === depluralized ||
      item.name.toLowerCase() === depluralized ||
      item.synonyms.includes(depluralized)
    ) {
      return item.id;
    }
  }

  // Only substring-match core items when there isn't a distinct multi-word dish ingredient
  // like "green onion" or "tahini-soy sauce"
  if (
    !cleaned.includes('green onion') &&
    !cleaned.includes('tahini') &&
    !cleaned.includes('bok choy') &&
    !cleaned.includes('bulgogi')
  ) {
    for (const item of CORE_INGREDIENTS) {
      for (const syn of item.synonyms) {
        if (syn.length >= 4 && cleaned.includes(syn)) {
          return item.id;
        }
      }
    }
  }

  return null;
}

export function idsToIngredients(ids: readonly IngredientId[]): Ingredient[] {
  return ids.map((id) => ({
    name: getIngredientMeta(id).name,
  }));
}

export function ingredientsToIds(items: readonly Ingredient[]): IngredientId[] {
  const seen = new Set<IngredientId>();
  for (const entry of items) {
    if (entry && typeof entry.name === 'string') {
      const id = resolveIngredientId(entry.name);
      if (id) {
        seen.add(id);
      }
    }
  }
  return Array.from(seen);
}

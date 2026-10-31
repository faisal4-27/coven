import { CACHED_DEMO_PANTRY_IDS, idsToIngredients } from './ingredients';
import { suggestExamSnack, suggestMeal } from './logic';
import type {
  ExamSnackKind,
  Ingredient,
  MealSuggestion,
  PotionRecipe,
} from './types';

export const MOCK_PANTRY_INGREDIENTS: Ingredient[] = idsToIngredients(
  CACHED_DEMO_PANTRY_IDS
);

export const MOCK_MEAL_SUGGESTIONS: MealSuggestion[] = [
  {
    name: 'Goblin Toast (Peanut butter banana toast)',
    minutes: 4,
    effort: 'none',
    uses: ['Bread', 'Peanut butter'],
    missing: ['Banana'],
    whereToGetMissing:
      'PLACEHOLDER - Bahen Atrium Grab & Go (BA) — unverified placeholder campus listing',
  },
  {
    name: "Witch's Breakfast Spell (Egg and veg toast)",
    minutes: 10,
    effort: 'low',
    uses: ['Eggs', 'Bread', 'Spinach', 'Tomato'],
    missing: [],
  },
  {
    name: 'Midnight Energy Elixir (Banana oat smoothie)',
    minutes: 5,
    effort: 'none',
    uses: ['Oats'],
    missing: ['Banana', 'Milk'],
    whereToGetMissing:
      'PLACEHOLDER - Bahen Atrium Grab & Go (BA) — unverified placeholder campus listing',
  },
];

export async function mockScanPantry(_image?: File): Promise<Ingredient[]> {
  return [...MOCK_PANTRY_INGREDIENTS];
}

export async function mockSuggestMeal(
  pantry: Ingredient[] = MOCK_PANTRY_INGREDIENTS,
  minutesFree = 20,
  opts?: { lowEffort?: boolean }
): Promise<MealSuggestion[]> {
  return suggestMeal(pantry, minutesFree, opts);
}

export function mockSuggestExamSnack(
  kind: ExamSnackKind,
  pantry: Ingredient[] = MOCK_PANTRY_INGREDIENTS
): PotionRecipe[] {
  return suggestExamSnack(kind, pantry);
}


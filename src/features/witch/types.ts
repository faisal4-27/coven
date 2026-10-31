import type {
  CalendarEvent,
  Ingredient,
  MealSuggestion,
} from '../../shared/types';

export type { CalendarEvent, Ingredient, MealSuggestion };

export type MealEffort = MealSuggestion['effort'];

export type Allergen = 'egg' | 'dairy' | 'peanut' | 'gluten';

export type CoreIngredientId =
  | 'eggs'
  | 'milk'
  | 'yogurt'
  | 'cheese'
  | 'spinach'
  | 'tomato'
  | 'banana'
  | 'apple'
  | 'onion'
  | 'carrot'
  | 'potato'
  | 'frozen veg'
  | 'bread'
  | 'rice'
  | 'pasta'
  | 'tortilla'
  | 'oats'
  | 'beans'
  | 'peanut butter'
  | 'soy sauce';

export type IngredientId = CoreIngredientId | (string & {});

export type CustomSpriteKind =
  | 'leafy'
  | 'protein'
  | 'scallion'
  | 'seeds'
  | 'sauce'
  | 'oil'
  | 'jar';

export interface PantryCatalogItem {
  id: IngredientId;
  name: string;
  priceCad: number; // Illustrative student grocery estimate per portion
  allergen: Allergen | null;
  color: string;
  isBase: boolean;
  synonyms: readonly string[];
  spriteKind?: CustomSpriteKind;
  isCustomScanned?: boolean;
}

export type DishTemplateName = 'toast' | 'cup' | 'bowl' | 'plate' | 'soup';

export type RecipeTag = 'breakfast' | 'make-ahead' | 'wind-down' | 'focus';

export type ExamSnackKind = 'focus' | 'wind-down';

export interface PotionRecipe {
  id: string;
  number: number;
  potionName: string;
  mealName: string;
  ingredients: readonly IngredientId[];
  minutes: number;
  packable: boolean;
  tags: readonly RecipeTag[];
  sprite: DishTemplateName;
  steps: readonly string[];
  isCustomScanned?: boolean;
}

export type WitchRank =
  | 'Apprentice'
  | 'Hedge Witch'
  | 'Brewmaster'
  | 'Archwitch';

export type MatchResult =
  | {
      kind: 'full';
      recipe: PotionRecipe;
      alternatives: PotionRecipe[];
      unused: IngredientId[];
    }
  | {
      kind: 'near';
      recipe: PotionRecipe;
      matched: IngredientId[];
      missing: IngredientId[];
    }
  | {
      kind: 'none';
      title: string;
      message: string;
      suggestion: string;
    };

export type GapDurationMinutes = 10 | 20 | 40 | 60 | 90;

export type ShelfMode = 'brew' | 'own';

export type ScanSource = 'ai' | 'cached';

export interface ScanPantryOutcome {
  ingredients: Ingredient[];
  matchedIds: IngredientId[];
  customItems: PantryCatalogItem[];
  autoRecipe: PotionRecipe | null;
  source: ScanSource;
  message: string;
}

export interface DiningItemEntry {
  name: string;
  tags: string[];
  priceCad: number;
}

export interface DiningPlaceEntry {
  name: string;
  building: string;
  hours: string;
  items: DiningItemEntry[];
}

export interface DiningDataFile {
  updated: string;
  places: DiningPlaceEntry[];
}

export interface WitchPersistedState {
  owned: IngredientId[];
  discovered: string[];
  cooked: string[];
  gold: number;
  avoided: Allergen[];
  customIngredients?: PantryCatalogItem[];
  customRecipes?: PotionRecipe[];
}

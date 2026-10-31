export { WitchPage } from './components/WitchPage';
export { PantryPreview } from './components/PantryPreview';

export {
  scanPantry,
  scanPantryDetailed,
  suggestMeal,
  suggestExamSnack,
  classifyMealEffort,
  loadWitchState,
  saveWitchState,
  WITCH_STORAGE_KEY,
} from './logic';

export { matchMix, costOfMix, rankForFound } from './brew';

export {
  MOCK_PANTRY_INGREDIENTS,
  MOCK_MEAL_SUGGESTIONS,
  mockScanPantry,
  mockSuggestMeal,
  mockSuggestExamSnack,
} from './mocks';

export {
  INGREDIENTS,
  INGREDIENT_BY_ID,
  DEFAULT_OWNED_IDS,
  CACHED_DEMO_PANTRY_IDS,
  clearCustomIngredients,
  getAllCatalogIngredients,
  getIngredientMeta,
  resolveIngredientId,
} from './ingredients';

export {
  POTION_RECIPES,
  RECIPE_BY_ID,
  getAllPotionRecipes,
} from './recipes';

export {
  loadDiningData,
  findCampusPlacesForTag,
  findWhereToGetMissing,
} from './dining';

export { writePantryToSharedStore } from './sharedStore';

export type {
  Allergen,
  CoreIngredientId,
  CustomSpriteKind,
  DishTemplateName,
  ExamSnackKind,
  GapDurationMinutes,
  Ingredient,
  IngredientId,
  MatchResult,
  MealEffort,
  MealSuggestion,
  PantryCatalogItem,
  PotionRecipe,
  RecipeTag,
  ScanPantryOutcome,
  ScanSource,
  ShelfMode,
  WitchPersistedState,
  WitchRank,
} from './types';

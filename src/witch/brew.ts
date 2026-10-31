import { getIngredientMeta } from './ingredients';
import { getAllPotionRecipes } from './recipes';
import type {
  Allergen,
  IngredientId,
  MatchResult,
  PotionRecipe,
  WitchRank,
} from './types';

export function recipeHasAvoidedAllergen(
  recipe: PotionRecipe,
  avoided: readonly Allergen[]
): boolean {
  if (avoided.length === 0) return false;
  const avoidedSet = new Set(avoided);
  return recipe.ingredients.some((id) => {
    const allergen = getIngredientMeta(id).allergen;
    return allergen !== null && avoidedSet.has(allergen);
  });
}

export function costOfMix(
  mix: readonly IngredientId[],
  owned: readonly IngredientId[]
): number {
  const ownedSet = new Set(owned);
  const uniqueMix = Array.from(new Set(mix));
  let total = 0;

  for (const id of uniqueMix) {
    if (ownedSet.has(id)) continue;
    total += getIngredientMeta(id).priceCad;
  }

  return Math.round(total * 100) / 100;
}

export function rankForFound(discoveredCount: number): WitchRank {
  if (discoveredCount >= 12) return 'Archwitch';
  if (discoveredCount >= 7) return 'Brewmaster';
  if (discoveredCount >= 3) return 'Hedge Witch';
  return 'Apprentice';
}

export function matchMix(
  mix: readonly IngredientId[],
  avoided: readonly Allergen[],
  discoveredIds: readonly string[] = []
): MatchResult {
  const uniqueMix = Array.from(new Set(mix));

  if (uniqueMix.length === 0) {
    return {
      kind: 'none',
      title: 'Bubbling Slop',
      message: 'Nothing was stirred into the cauldron yet.',
      suggestion:
        'Drop a base ingredient like bread, rice, oats, pasta, or tortilla into the cauldron with a fresh item.',
    };
  }

  const mixSet = new Set(uniqueMix);
  const discoveredSet = new Set(discoveredIds);
  const compatibleRecipes = getAllPotionRecipes().filter(
    (r) => !recipeHasAvoidedAllergen(r, avoided)
  );

  const fullMatches = compatibleRecipes.filter((recipe) =>
    recipe.ingredients.every((req) => mixSet.has(req))
  );

  if (fullMatches.length > 0) {
    fullMatches.sort((a, b) => {
      if (b.ingredients.length !== a.ingredients.length) {
        return b.ingredients.length - a.ingredients.length;
      }
      if (a.minutes !== b.minutes) {
        return a.minutes - b.minutes;
      }
      const aNew = discoveredSet.has(a.id) ? 0 : 1;
      const bNew = discoveredSet.has(b.id) ? 0 : 1;
      if (bNew !== aNew) {
        return bNew - aNew;
      }
      return a.number - b.number;
    });

    const winner = fullMatches[0];
    const winnerSet = new Set(winner.ingredients);
    const unused = uniqueMix.filter((id) => !winnerSet.has(id));

    return {
      kind: 'full',
      recipe: winner,
      alternatives: fullMatches.slice(1),
      unused,
    };
  }

  interface NearCandidate {
    recipe: PotionRecipe;
    matched: IngredientId[];
    missing: IngredientId[];
    extraCount: number;
    ratio: number;
  }

  const nearCandidates: NearCandidate[] = [];

  for (const recipe of compatibleRecipes) {
    const matched = recipe.ingredients.filter((req) => mixSet.has(req));
    if (matched.length === 0) continue;

    const missing = recipe.ingredients.filter((req) => !mixSet.has(req));
    const recipeSet = new Set(recipe.ingredients);
    const extraCount = uniqueMix.filter((id) => !recipeSet.has(id)).length;
    const ratio = matched.length / recipe.ingredients.length;

    const isClose =
      (ratio >= 0.5 && extraCount <= 2) ||
      (uniqueMix.length === 1 && missing.length <= 2);

    if (isClose) {
      nearCandidates.push({
        recipe,
        matched,
        missing,
        extraCount,
        ratio,
      });
    }
  }

  if (nearCandidates.length > 0) {
    nearCandidates.sort((a, b) => {
      if (a.missing.length !== b.missing.length) {
        return a.missing.length - b.missing.length;
      }
      if (b.ratio !== a.ratio) {
        return b.ratio - a.ratio;
      }
      if (a.extraCount !== b.extraCount) {
        return a.extraCount - b.extraCount;
      }
      if (a.recipe.minutes !== b.recipe.minutes) {
        return a.recipe.minutes - b.recipe.minutes;
      }
      return a.recipe.number - b.recipe.number;
    });

    const best = nearCandidates[0];
    return {
      kind: 'near',
      recipe: best.recipe,
      matched: best.matched,
      missing: best.missing,
    };
  }

  return {
    kind: 'none',
    title: 'Bubbling Slop',
    message:
      'The cauldron burps purple smoke! Those ingredients refused to harmonize into a known potion.',
    suggestion:
      'Try combining a pantry base (bread, rice, oats, tortilla, or pasta) with one or two fresh ingredients like eggs, tomato, spinach, or banana.',
  };
}

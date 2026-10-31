import { useMemo, useState } from 'react';
import { idsToIngredients } from '../ingredients';
import { classifyMealEffort, suggestExamSnack } from '../logic';
import { PixelSprite } from '../pixel/PixelSprite';
import { getRecipeDishVisual } from '../pixel/dishes';
import type { Allergen, ExamSnackKind, IngredientId, PotionRecipe } from '../types';

export interface ExamModeProps {
  owned: readonly IngredientId[];
  avoided: readonly Allergen[];
  onLoadRecipeIntoCauldron: (recipe: PotionRecipe) => void;
}

export function ExamMode({
  owned,
  avoided,
  onLoadRecipeIntoCauldron,
}: ExamModeProps) {
  const [kind, setKind] = useState<ExamSnackKind>('focus');

  const suggestions = useMemo(() => {
    const pantry = idsToIngredients(owned);
    return suggestExamSnack(kind, pantry, avoided);
  }, [kind, owned, avoided]);

  const ownedSet = useMemo(() => new Set(owned), [owned]);

  return (
    <section
      className="witch-panel flex flex-col gap-3 p-4"
      aria-labelledby="witch-exam-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="witch-exam-heading" className="witch-head text-xs text-[#ff7a1a]">
          Exam Week Kitchen
        </h3>
        <span className="text-base text-[#d6b69c]">Low-friction options</span>
      </div>

      <div
        role="group"
        aria-label="Exam mode meal style"
        className="grid grid-cols-2 gap-2"
      >
        <button
          type="button"
          aria-pressed={kind === 'focus'}
          onClick={() => setKind('focus')}
          className="witch-btn text-[10px]"
        >
          Focus Mode
        </button>
        <button
          type="button"
          aria-pressed={kind === 'wind-down'}
          onClick={() => setKind('wind-down')}
          className="witch-btn text-[10px]"
        >
          Wind-Down Mode
        </button>
      </div>

      <p className="text-base text-[#d6b69c]">
        {kind === 'focus'
          ? 'Quick, portable options suited for short study breaks between chapters.'
          : 'Simple, comforting evening meals and overnight prep for winding down your routine.'}
      </p>

      {suggestions.length === 0 ? (
        <div className="witch-well px-3 py-3 text-base text-[#d6b69c]">
          No exam options match all active dietary wards right now. Try relaxing a filter to view more recipes.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {suggestions.map((recipe) => {
            const dish = getRecipeDishVisual(recipe);
            const haveCount = recipe.ingredients.filter((id) =>
              ownedSet.has(id)
            ).length;
            const effort = classifyMealEffort(recipe.minutes);

            return (
              <li
                key={recipe.id}
                className="witch-well flex flex-wrap items-center justify-between gap-3 p-2.5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <PixelSprite
                    grid={dish.grid}
                    colorOverrides={dish.overrides}
                    pixelSize={4}
                    label={recipe.mealName}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-lg font-bold text-[#f4ecd8]">
                      {recipe.potionName}
                    </p>
                    <p className="text-base text-[#d6b69c]">
                      {recipe.mealName} · {recipe.minutes}m ({effort} effort) ·{' '}
                      {haveCount}/{recipe.ingredients.length} owned
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onLoadRecipeIntoCauldron(recipe)}
                  className="witch-btn px-2.5 py-1.5 text-[9px]"
                >
                  Load Mix
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}


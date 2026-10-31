import { rankForFound } from '../brew';
import { PixelSprite } from '../pixel/PixelSprite';
import { getRecipeDishVisual } from '../pixel/dishes';
import { getAllPotionRecipes } from '../recipes';
import type { PotionRecipe } from '../types';

export interface CodexProps {
  discoveredIds: readonly string[];
  cookedIds: readonly string[];
  onSelectRecipe: (recipe: PotionRecipe) => void;
}

export function Codex({
  discoveredIds,
  cookedIds,
  onSelectRecipe,
}: CodexProps) {
  const recipes = getAllPotionRecipes();
  const discoveredSet = new Set(discoveredIds);
  const cookedSet = new Set(cookedIds);
  const total = recipes.length;
  const foundCount = recipes.filter((r) => discoveredSet.has(r.id)).length;
  const rank = rankForFound(foundCount);
  const progressPct = Math.round((foundCount / Math.max(1, total)) * 100);

  return (
    <section
      className="witch-panel flex flex-col gap-5 p-5"
      aria-labelledby="witch-codex-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 id="witch-codex-heading" className="witch-head text-base text-[#ffc94d]">
            Magical Potion Codex
          </h2>
          <p className="text-lg text-[#c2b3d9]">
            Unlock recipes by scanning shelf photos or stirring matches in the Brewing Station.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="witch-tag witch-tag--violet">Rank: {rank}</span>
          <span className="witch-tag witch-tag--green">
            Discovered: {foundCount}/{total}
          </span>
          <span className="witch-tag witch-tag--amber">
            Cooked: {cookedIds.length}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-base text-[#c2b3d9]">
          <span>Collection Progress</span>
          <span>{progressPct}%</span>
        </div>
        <div
          className="witch-progress-track"
          role="progressbar"
          aria-valuenow={foundCount}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label={`${foundCount} of ${total} potions discovered`}
        >
          <div
            className="witch-progress-fill"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {foundCount === 0 && (
        <div className="witch-well px-4 py-3 text-lg text-[#ffc94d]">
          No potions unlocked yet! Upload a photo in the Scanner above or stir your starting pantry to claim your first entry.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {recipes.map((recipe) => {
          const isFound = discoveredSet.has(recipe.id);
          const isCooked = cookedSet.has(recipe.id);
          const visual = getRecipeDishVisual(recipe);

          if (!isFound) {
            return (
              <div
                key={recipe.id}
                className="witch-well flex flex-col items-center justify-between gap-2 p-4 text-center opacity-80"
                aria-label={`Undiscovered potion #${recipe.number}, requires ${recipe.ingredients.length} ingredients`}
              >
                <span className="text-sm text-[#c2b3d9]">
                  #{String(recipe.number).padStart(2, '0')}
                </span>
                <div className="my-2">
                  <PixelSprite
                    grid={visual.grid}
                    silhouette
                    silhouetteColor="#0d0714"
                    pixelSize={7}
                  />
                </div>
                <p className="witch-head text-xs text-[#9a7bff]">???</p>
                <p className="text-base text-[#c2b3d9]">
                  {recipe.ingredients.length} ingredients required
                </p>
              </div>
            );
          }

          return (
            <button
              key={recipe.id}
              type="button"
              onClick={() => onSelectRecipe(recipe)}
              className="witch-shelf-item witch-shelf-item--owned justify-between p-4"
            >
              <div className="flex w-full items-center justify-between text-sm">
                <span className="text-[#c2b3d9]">
                  #{String(recipe.number).padStart(2, '0')}
                </span>
                {isCooked ? (
                  <span className="text-[#ffc94d] font-bold">COOKED</span>
                ) : recipe.isCustomScanned ? (
                  <span className="text-[#9a7bff] font-bold">SCANNED</span>
                ) : null}
              </div>

              <div className="my-2">
                <PixelSprite
                  grid={visual.grid}
                  colorOverrides={visual.overrides}
                  pixelSize={7}
                />
              </div>

              <div>
                <p className="witch-head text-[11px] text-[#6fe08a]">
                  {recipe.potionName}
                </p>
                <p className="mt-1 text-lg text-[#f1e8d8]">{recipe.mealName}</p>
                <p className="text-sm text-[#c2b3d9]">
                  {recipe.minutes} min ·{' '}
                  {recipe.packable ? 'Packable' : 'Home meal'}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

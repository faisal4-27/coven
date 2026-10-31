import { useEffect, useRef } from 'react';
import { findWhereToGetMissing } from '../dining';
import { getIngredientMeta } from '../ingredients';
import { PixelSprite } from '../pixel/PixelSprite';
import { SLOP_DISH_SPRITE, getRecipeDishVisual } from '../pixel/dishes';
import { getIngredientSprite } from '../pixel/icons';
import { SPARKLE_PIXEL_SPRITE } from '../pixel/palette';
import type {
  GapDurationMinutes,
  IngredientId,
  MatchResult,
  PotionRecipe,
} from '../types';

export interface ResultModalProps {
  isOpen: boolean;
  result: MatchResult | null;
  isFirstDiscovery: boolean;
  fromCodex?: boolean;
  gapMinutes: GapDurationMinutes;
  owned: readonly IngredientId[];
  cookedIds: readonly string[];
  onMarkCooked: (recipeId: string) => void;
  onSelectAlternative?: (recipe: PotionRecipe) => void;
  onClose: () => void;
}

export function ResultModal({
  isOpen,
  result,
  isFirstDiscovery,
  fromCodex = false,
  gapMinutes,
  owned,
  cookedIds,
  onMarkCooked,
  onSelectAlternative,
  onClose,
}: ResultModalProps) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const focusTimer = window.setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 10);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', onKeyDown);
      previousFocusRef.current?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen || !result) {
    return null;
  }

  const ownedSet = new Set(owned);

  const renderCampusGuidance = (recipe: PotionRecipe) => {
    if (recipe.packable && recipe.tags.includes('make-ahead')) {
      return 'Prep ahead at home and pack in a container for campus (no campus stove needed).';
    }
    if (recipe.packable) {
      return 'Suitable for packing to campus once prepared at home.';
    }
    if (recipe.tags.includes('make-ahead')) {
      return 'Make-ahead batch dish — cook at home and portion into containers.';
    }
    return 'Prepare and enjoy at home (requires kitchen heat, not raw campus prep).';
  };

  return (
    <div
      className="witch-root witch-modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="witch-result-modal-title"
        className="witch-panel flex max-h-[90dvh] w-full max-w-xl flex-col gap-4 overflow-y-auto p-5"
      >
        {result.kind === 'full' && (() => {
          const { recipe, alternatives, unused } = result;
          const visual = getRecipeDishVisual(recipe);
          const fitsGap = recipe.minutes <= gapMinutes;
          const unownedInRecipe = recipe.ingredients
            .filter((id) => !ownedSet.has(id))
            .map((id) => getIngredientMeta(id).name);
          const campusSpot = findWhereToGetMissing(unownedInRecipe);
          const alreadyCooked = cookedIds.includes(recipe.id);

          const bannerText = fromCodex
            ? `Potion #${recipe.number} — Codex Entry`
            : isFirstDiscovery
              ? 'New potion discovered!'
              : 'Brewed again!';

          return (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span
                    className={`witch-tag ${
                      isFirstDiscovery && !fromCodex
                        ? 'witch-tag--green'
                        : 'witch-tag--violet'
                    }`}
                  >
                    {bannerText}
                  </span>
                  <h2
                    id="witch-result-modal-title"
                    className="witch-head mt-2 text-base text-[#ff7a1a]"
                  >
                    {recipe.potionName}
                  </h2>
                  <p className="text-2xl text-[#f4ecd8]">{recipe.mealName}</p>
                </div>

                <button
                  ref={closeBtnRef}
                  type="button"
                  onClick={onClose}
                  className="witch-btn px-3 py-1.5 text-[10px]"
                >
                  Close
                </button>
              </div>

              <div className="witch-well relative flex min-h-[144px] items-center justify-center p-4">
                <div
                  className="witch-sparkle"
                  style={{ top: '14px', left: '20%' }}
                  aria-hidden="true"
                >
                  <PixelSprite grid={SPARKLE_PIXEL_SPRITE} pixelSize={3} />
                </div>
                <div
                  className="witch-sparkle"
                  style={{ bottom: '16px', right: '20%', animationDelay: '0.35s' }}
                  aria-hidden="true"
                >
                  <PixelSprite grid={SPARKLE_PIXEL_SPRITE} pixelSize={3} />
                </div>

                <div className="witch-dish-pop">
                  <PixelSprite
                    grid={visual.grid}
                    colorOverrides={visual.overrides}
                    pixelSize={11}
                    label={`${recipe.potionName}: ${recipe.mealName}`}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="witch-tag witch-tag--amber">
                  Prep: {recipe.minutes} min
                </span>
                <span
                  className={`witch-tag ${
                    fitsGap ? 'witch-tag--green' : 'witch-tag--red'
                  }`}
                >
                  {fitsGap
                    ? `Fits your gap (${gapMinutes}m)`
                    : `Too long for ${gapMinutes}m gap`}
                </span>
                <span className="witch-tag">
                  {recipe.packable ? 'Packable for campus' : 'Home kitchen meal'}
                </span>
              </div>

              <p className="text-lg text-[#d6b69c]">
                {renderCampusGuidance(recipe)}
              </p>

              <div>
                <h3 className="witch-head mb-2 text-xs text-[#ff7a1a]">
                  Required Ingredients
                </h3>
                <div className="flex flex-wrap gap-2">
                  {recipe.ingredients.map((id) => {
                    const meta = getIngredientMeta(id);
                    const isOwned = ownedSet.has(id);
                    return (
                      <span key={id} className="witch-tag">
                        <PixelSprite
                          grid={getIngredientSprite(id, meta.spriteKind)}
                          pixelSize={3}
                        />
                        <span>{meta.name}</span>
                        <span className="text-sm text-[#d6b69c]">
                          {isOwned ? '(owned)' : `(~$${meta.priceCad.toFixed(2)})`}
                        </span>
                      </span>
                    );
                  })}
                </div>
              </div>

              {unownedInRecipe.length > 0 && (
                <div className="witch-well px-3 py-2 text-base">
                  <p className="text-[#ffb347]">
                    Not yet in your owned pantry: {unownedInRecipe.join(', ')}
                  </p>
                  <p className="text-[#d6b69c]">
                    {campusSpot
                      ? `Potential campus pickup: ${campusSpot}`
                      : 'No campus dining match found for these items — check a nearby grocer.'}
                  </p>
                </div>
              )}

              <div>
                <h3 className="witch-head mb-2 text-xs text-[#ffb347]">
                  Brewing Steps
                </h3>
                <ol className="flex list-decimal flex-col gap-1.5 pl-6 text-xl text-[#f4ecd8]">
                  {recipe.steps.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              </div>

              {alternatives.length > 0 && (
                <div className="witch-well flex flex-col gap-2 p-3">
                  <p className="text-base text-[#ffb347]">
                    Other potions your current mix can also brew:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {alternatives.map((alt) => (
                      <button
                        key={alt.id}
                        type="button"
                        onClick={() => onSelectAlternative?.(alt)}
                        className="witch-chip text-base"
                      >
                        <span>
                          {alt.potionName} ({alt.minutes}m)
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {unused.length > 0 && (
                <p className="text-base text-[#d6b69c]">
                  Unused ingredients left floating in pot:{' '}
                  {unused.map((id) => getIngredientMeta(id).name).join(', ')}.
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => onMarkCooked(recipe.id)}
                  className="witch-btn witch-btn--stir"
                >
                  {alreadyCooked ? 'Cooked Again! (+1)' : 'I cooked this'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="witch-btn"
                >
                  Back to Kitchen
                </button>
              </div>
            </>
          );
        })()}

        {result.kind === 'near' && (() => {
          const { recipe, matched, missing } = result;
          const visual = getRecipeDishVisual(recipe);
          const missingLabels = missing.map((id) => getIngredientMeta(id).name);
          const campusSpot = findWhereToGetMissing(missingLabels);

          return (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="witch-tag witch-tag--amber">So close!</span>
                  <h2
                    id="witch-result-modal-title"
                    className="witch-head mt-2 text-base text-[#ff7a1a]"
                  >
                    Almost {recipe.potionName}
                  </h2>
                  <p className="text-xl text-[#d6b69c]">
                    ({recipe.mealName} · {recipe.minutes} min)
                  </p>
                </div>

                <button
                  ref={closeBtnRef}
                  type="button"
                  onClick={onClose}
                  className="witch-btn px-3 py-1.5 text-[10px]"
                >
                  Close
                </button>
              </div>

              <div className="witch-well flex min-h-[132px] flex-col items-center justify-center gap-2 p-4">
                <PixelSprite
                  grid={visual.grid}
                  silhouette
                  silhouetteColor="#0a0502"
                  pixelSize={11}
                  label="Silhouette of an undiscovered dish"
                />
                <span className="text-base text-[#d6b69c]">
                  Add the missing {missing.length === 1 ? 'ingredient' : 'ingredients'} below to reveal this dish!
                </span>
              </div>

              <div>
                <p className="mb-2 text-lg text-[#ff9f43]">
                  Matched in cauldron:{' '}
                  {matched.map((id) => getIngredientMeta(id).name).join(', ')}
                </p>
                <h3 className="witch-head mb-2 text-xs text-[#ff5a36]">
                  Add to Complete Potion
                </h3>
                <div className="flex flex-wrap gap-2">
                  {missing.map((id) => {
                    const meta = getIngredientMeta(id);
                    return (
                      <span key={id} className="witch-tag">
                        <PixelSprite
                          grid={getIngredientSprite(id, meta.spriteKind)}
                          pixelSize={3}
                        />
                        <span>{meta.name}</span>
                        <span className="text-sm text-[#d6b69c]">
                          (~${meta.priceCad.toFixed(2)})
                        </span>
                      </span>
                    );
                  })}
                </div>
              </div>

              {campusSpot && (
                <div className="witch-well px-3 py-2 text-base text-[#d6b69c]">
                  Potential campus pickup: {campusSpot}
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button type="button" onClick={onClose} className="witch-btn witch-btn--amber">
                  Adjust Cauldron Mix
                </button>
              </div>
            </>
          );
        })()}

        {result.kind === 'none' && (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="witch-tag witch-tag--red">Brew Failed</span>
                <h2
                  id="witch-result-modal-title"
                  className="witch-head mt-2 text-base text-[#ff5a36]"
                >
                  {result.title}
                </h2>
              </div>

              <button
                ref={closeBtnRef}
                type="button"
                onClick={onClose}
                className="witch-btn px-3 py-1.5 text-[10px]"
              >
                Close
              </button>
            </div>

            <div className="witch-well flex min-h-[132px] flex-col items-center justify-center gap-3 p-4">
              <div className="witch-dish-pop">
                <PixelSprite
                  grid={SLOP_DISH_SPRITE}
                  pixelSize={12}
                  label="Bubbling cauldron slop"
                />
              </div>
            </div>

            <p className="text-xl text-[#f4ecd8]">{result.message}</p>
            <div className="witch-well px-3 py-2 text-lg text-[#ffb347]">
              Hint: {result.suggestion}
            </div>

            <div className="flex justify-end pt-2">
              <button type="button" onClick={onClose} className="witch-btn witch-btn--amber">
                Try Another Mix
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

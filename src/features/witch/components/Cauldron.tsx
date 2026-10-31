import { getIngredientMeta } from '../ingredients';
import { PixelSprite } from '../pixel/PixelSprite';
import { CAULDRON_SPRITE, computeCauldronLiquidColor } from '../pixel/cauldron';
import { getIngredientSprite } from '../pixel/icons';
import type { IngredientId } from '../types';

export interface CauldronProps {
  mix: readonly IngredientId[];
  mixCost: number;
  gold: number;
  isStirring: boolean;
  flyingIngredient: { id: IngredientId; seq: number } | null;
  onRemoveIngredient: (id: IngredientId) => void;
  onStir: () => void;
  onEmpty: () => void;
}

export function Cauldron({
  mix,
  mixCost,
  gold,
  isStirring,
  flyingIngredient,
  onRemoveIngredient,
  onStir,
  onEmpty,
}: CauldronProps) {
  const liquidColor = computeCauldronLiquidColor(mix, isStirring);
  const remaining = Math.round((gold - mixCost) * 100) / 100;
  const overBudget = remaining < 0;

  return (
    <section
      className="witch-panel flex flex-col gap-4 p-4"
      aria-labelledby="witch-cauldron-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="witch-cauldron-heading" className="witch-head text-sm text-[#ff7a1a]">
          Brewing Cauldron
        </h2>
        <span className="witch-tag witch-tag--violet">
          {mix.length} {mix.length === 1 ? 'ingredient' : 'ingredients'}
        </span>
      </div>

      <div className="witch-well witch-cauldron-arena">
        {flyingIngredient && (
          <div key={flyingIngredient.seq} className="witch-fly-in" aria-hidden="true">
            <PixelSprite
              grid={getIngredientSprite(
                flyingIngredient.id,
                getIngredientMeta(flyingIngredient.id).spriteKind
              )}
              pixelSize={4}
            />
          </div>
        )}

        {mix.length === 0 ? (
          <div className="py-3 text-center text-lg text-[#d6b69c]">
            Cauldron is empty — upload a photo above or tap ingredients on the shelf!
          </div>
        ) : (
          <div
            className="flex min-h-[52px] flex-wrap items-center justify-center gap-2"
            role="list"
            aria-label="Ingredients currently floating in the cauldron"
          >
            {mix.map((id) => {
              const item = getIngredientMeta(id);
              return (
                <div key={id} role="listitem">
                  <button
                    type="button"
                    onClick={() => onRemoveIngredient(id)}
                    className="witch-float-token"
                    aria-label={`Remove ${item.name} from cauldron`}
                    title={`Remove ${item.name}`}
                  >
                    <PixelSprite
                      grid={getIngredientSprite(id, item.spriteKind)}
                      pixelSize={4}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="witch-bubble-row" aria-hidden="true">
          <span
            className={`witch-bubble witch-bubble--1 ${isStirring ? 'witch-bubble--fast' : ''}`}
            style={{ backgroundColor: liquidColor }}
          />
          <span
            className={`witch-bubble witch-bubble--2 ${isStirring ? 'witch-bubble--fast' : ''}`}
            style={{ backgroundColor: liquidColor }}
          />
          <span
            className={`witch-bubble witch-bubble--3 ${isStirring ? 'witch-bubble--fast' : ''}`}
            style={{ backgroundColor: liquidColor }}
          />
        </div>

        <div
          className={`witch-cauldron-glow ${isStirring ? 'witch-pot-shake' : ''}`}
          style={{
            boxShadow: `0 -8px 0 0 ${liquidColor}22`,
          }}
        >
          <PixelSprite
            grid={CAULDRON_SPRITE}
            pixelSize={11}
            colorOverrides={{ L: liquidColor }}
            label={`Witch cauldron with ${mix.length} ingredients`}
          />
        </div>

        {mix.length > 0 && (
          <p className="text-base text-[#d6b69c]">
            Tip: tap any floating ingredient icon above the rim to remove it.
          </p>
        )}
      </div>

      <div className="witch-well flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-lg">
        <span>
          In pot: <strong className="text-[#f4ecd8]">{mix.length}</strong>
        </span>
        <span>
          Cost: <strong className="text-[#ffb347]">${mixCost.toFixed(2)}</strong>
        </span>
        <span className={overBudget ? 'text-[#ff5a36] font-bold' : 'text-[#ff9f43]'}>
          {overBudget
            ? `Over by $${Math.abs(remaining).toFixed(2)}`
            : `$${remaining.toFixed(2)} left`}
        </span>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onStir}
          disabled={isStirring}
          className="witch-btn witch-btn--stir flex-1"
        >
          {isStirring ? 'Stirring...' : 'STIR!'}
        </button>
        <button
          type="button"
          onClick={onEmpty}
          disabled={isStirring || mix.length === 0}
          className="witch-btn"
        >
          Empty
        </button>
      </div>
    </section>
  );
}

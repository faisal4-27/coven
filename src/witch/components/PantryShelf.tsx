import { PixelSprite } from '../pixel/PixelSprite';
import { getIngredientSprite } from '../pixel/icons';
import { CHECK_BADGE_SPRITE } from '../pixel/palette';
import type {
  Allergen,
  IngredientId,
  PantryCatalogItem,
  ShelfMode,
} from '../types';

export interface PantryShelfProps {
  catalog: readonly PantryCatalogItem[];
  mode: ShelfMode;
  owned: readonly IngredientId[];
  mix: readonly IngredientId[];
  avoided: readonly Allergen[];
  onModeChange: (nextMode: ShelfMode) => void;
  onSelectIngredient: (id: IngredientId) => void;
  onClearPantry: () => void;
}

export function PantryShelf({
  catalog,
  mode,
  owned,
  mix,
  avoided,
  onModeChange,
  onSelectIngredient,
  onClearPantry,
}: PantryShelfProps) {
  const ownedSet = new Set(owned);
  const mixSet = new Set(mix);
  const avoidedSet = new Set(avoided);
  const canClearPantry =
    owned.length > 0 || catalog.some((item) => item.isCustomScanned);

  return (
    <section
      className="witch-panel flex flex-col gap-4 p-4"
      aria-labelledby="witch-shelf-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="witch-shelf-heading" className="witch-head text-sm text-[#ff7a1a]">
            Magical Pantry Shelf
          </h2>
          <p className="text-base text-[#d6b69c]">
            {owned.length} of {catalog.length} items currently owned ($0 to brew)
          </p>
        </div>

        <button
          type="button"
          onClick={onClearPantry}
          disabled={!canClearPantry}
          className="witch-btn witch-btn--danger text-[10px]"
        >
          Clear Pantry
        </button>
      </div>

      <div
        role="group"
        aria-label="Pantry shelf tap mode"
        className="grid grid-cols-1 gap-2 sm:grid-cols-2"
      >
        <button
          type="button"
          aria-pressed={mode === 'brew'}
          onClick={() => onModeChange('brew')}
          className="witch-btn text-[10px]"
        >
          Tap: Add to Cauldron
        </button>
        <button
          type="button"
          aria-pressed={mode === 'own'}
          onClick={() => onModeChange('own')}
          className="witch-btn text-[10px]"
        >
          Tap: Mark as Owned
        </button>
      </div>

      {owned.length === 0 && (
        <div className="witch-well px-3 py-2 text-base text-[#ffb347]">
          Your pantry is currently empty! Upload a photo in the Scanner above or switch to &ldquo;Tap: Mark as Owned&rdquo; to mark scraps on your shelf.
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {catalog.map((item) => {
          const isOwned = ownedSet.has(item.id);
          const isInMix = mixSet.has(item.id);
          const isRestricted =
            item.allergen !== null && avoidedSet.has(item.allergen);

          const cardClasses = [
            'witch-shelf-item',
            isOwned ? 'witch-shelf-item--owned' : '',
            isInMix ? 'witch-shelf-item--mixed' : '',
          ]
            .filter(Boolean)
            .join(' ');

          const actionDesc =
            mode === 'own'
              ? isOwned
                ? `Unmark ${item.name} as owned`
                : `Mark ${item.name} as owned`
              : isInMix
                ? `${item.name} is already in cauldron (tap to remove)`
                : `Add ${item.name} to cauldron`;

          return (
            <button
              key={item.id}
              type="button"
              disabled={isRestricted}
              aria-pressed={mode === 'own' ? isOwned : isInMix}
              aria-label={`${actionDesc}. ${
                isOwned
                  ? 'Owned, $0 extra'
                  : `Estimated $${item.priceCad.toFixed(2)} CAD`
              }`}
              onClick={() => onSelectIngredient(item.id)}
              className={cardClasses}
            >
              <div className="flex w-full items-center justify-between text-xs">
                {isOwned ? (
                  <span className="inline-flex items-center gap-1 text-[#ff7a1a]">
                    <PixelSprite grid={CHECK_BADGE_SPRITE} pixelSize={2} />
                    <span>OWNED</span>
                  </span>
                ) : (
                  <span className="text-[#d6b69c]">~${item.priceCad.toFixed(2)}</span>
                )}
                {isInMix && (
                  <span className="text-[#ffb347] font-bold">IN POT</span>
                )}
              </div>

              <div className="my-1">
                <PixelSprite
                  grid={getIngredientSprite(item.id, item.spriteKind)}
                  pixelSize={4}
                />
              </div>

              <span className="text-lg leading-tight text-[#f4ecd8]">
                {item.name}
              </span>

              <span className="text-sm leading-none text-[#d6b69c]">
                {isRestricted
                  ? `Blocked (${item.allergen})`
                  : item.isCustomScanned
                    ? 'Scanned item'
                    : isOwned
                      ? '$0.00 extra'
                      : item.allergen
                        ? `Contains ${item.allergen}`
                        : 'Pantry staple'}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

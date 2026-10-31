import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { hob } from '../../shared/sprites';
import { useCoven } from '../../shared/store';
import { Card, PixelSprite as SharedPixelSprite } from '../../shared/ui';
import { INGREDIENT_BY_ID, idsToIngredients } from '../ingredients';
import { loadWitchState, suggestMeal } from '../logic';
import '../styles/witch.css';
import type { Ingredient, MealSuggestion } from '../types';

export interface PantryPreviewProps {
  /** Route path for Hob / Witch Mode (`'/hob'` in Coven's router). */
  to?: string;
}

/**
 * Compact Hob / Witch card intended for Coven's main home dashboard (`Picker.tsx` / `Zombie`).
 * Uses Coven's shared `hob` avatar sprite while remaining styled inside `.witch-root`.
 */
export function PantryPreview({ to = '/hob' }: PantryPreviewProps) {
  const sharedPantry = useCoven((s) => s.pantry);

  const localState = useMemo(() => loadWitchState(), []);

  const effectivePantry = useMemo<Ingredient[]>(() => {
    if (sharedPantry && sharedPantry.length > 0) {
      return sharedPantry;
    }
    return idsToIngredients(localState.owned);
  }, [sharedPantry, localState.owned]);

  const [bestMeal, setBestMeal] = useState<MealSuggestion | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    suggestMeal(effectivePantry, 20, { avoided: localState.avoided })
      .then((list) => {
        if (!cancelled) {
          setBestMeal(list[0] ?? null);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBestMeal(null);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [effectivePantry, localState.avoided]);

  const ownedSummary =
    effectivePantry.length > 0
      ? `${effectivePantry.length} owned`
      : `0 owned (${INGREDIENT_BY_ID.eggs.name} shelf empty)`;

  return (
    <div className="witch-root h-full">
      <Link to={to} className="group block h-full outline-none">
        <Card
          accent="hob"
          className="flex h-full items-center gap-4 bg-[#2b1d42] transition-transform group-hover:-translate-y-1 group-focus-visible:-translate-y-1"
        >
          <SharedPixelSprite sprite={hob} scale={2} title="Hob · Potion Overflow" />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-display text-lg text-[#ffc94d]">
                Hob · Potion Overflow
              </p>
              <span className="witch-tag witch-tag--violet text-sm">
                {ownedSummary}
              </span>
            </div>

            {loading ? (
              <p className="mt-1 text-lg text-[#c2b3d9]">
                Checking cauldron for a 20-min gap...
              </p>
            ) : bestMeal ? (
              <>
                <p className="mt-1 truncate text-xl text-[#f1e8d8]">
                  20m pick: <strong>{bestMeal.name}</strong>
                </p>
                <p className="text-base text-[#c2b3d9]">
                  {bestMeal.minutes} min prep ·{' '}
                  {bestMeal.missing.length === 0
                    ? 'All ingredients owned ($0 extra)'
                    : `Missing ${bestMeal.missing.join(', ')}`}
                </p>
              </>
            ) : (
              <p className="mt-1 text-lg text-[#c2b3d9]">
                No 20-min recipe matches current dietary wards — open kitchen to adjust.
              </p>
            )}
          </div>
        </Card>
      </Link>
    </div>
  );
}

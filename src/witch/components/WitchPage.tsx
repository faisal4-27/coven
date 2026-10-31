import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PageHeader, Starfield } from '../../shared/ui';
import {
  costOfMix,
  matchMix,
  rankForFound,
  recipeHasAvoidedAllergen,
} from '../brew';
import {
  clearCustomIngredients,
  getAllCatalogIngredients,
  getIngredientMeta,
  idsToIngredients,
} from '../ingredients';
import { loadWitchState, saveWitchState, suggestMeal } from '../logic';
import { PixelSprite } from '../pixel/PixelSprite';
import { WITCH_HAT_SPRITE } from '../pixel/palette';
import { getAllPotionRecipes } from '../recipes';
import { writePantryToSharedStore } from '../sharedStore';
import '../styles/witch.css';
import type {
  Allergen,
  GapDurationMinutes,
  IngredientId,
  MatchResult,
  MealSuggestion,
  PantryCatalogItem,
  PotionRecipe,
  ScanPantryOutcome,
  ShelfMode,
} from '../types';
import { Cauldron } from './Cauldron';
import { Codex } from './Codex';
import { DietChips } from './DietChips';
import { ExamMode } from './ExamMode';
import { GapPicker } from './GapPicker';
import { GoldPouch } from './GoldPouch';
import { PantryScanner } from './PantryScanner';
import { PantryShelf } from './PantryShelf';
import { ResultModal } from './ResultModal';

type ActiveTab = 'brew' | 'codex';

interface BannerNotice {
  text: string;
  tone: 'info' | 'warn' | 'ok';
}

export function WitchPage() {
  const initial = useMemo(() => loadWitchState(), []);

  const [owned, setOwned] = useState<IngredientId[]>(initial.owned);
  const [discovered, setDiscovered] = useState<string[]>(initial.discovered);
  const [cooked, setCooked] = useState<string[]>(initial.cooked);
  const [gold, setGold] = useState<number>(initial.gold);
  const [avoided, setAvoided] = useState<Allergen[]>(initial.avoided);
  const [customIngredients, setCustomIngredients] = useState<
    PantryCatalogItem[]
  >(initial.customIngredients ?? []);
  const [customRecipes, setCustomRecipes] = useState<PotionRecipe[]>(
    initial.customRecipes ?? []
  );

  const [activeTab, setActiveTab] = useState<ActiveTab>('brew');
  const [shelfMode, setShelfMode] = useState<ShelfMode>('brew');
  const [gapMinutes, setGapMinutes] = useState<GapDurationMinutes>(20);
  const [mix, setMix] = useState<IngredientId[]>([]);
  const [isPhotoScanning, setIsPhotoScanning] = useState(false);
  const [isStirring, setIsStirring] = useState(false);
  const [lastScannedRecipe, setLastScannedRecipe] =
    useState<PotionRecipe | null>(null);
  const [flyingIngredient, setFlyingIngredient] = useState<{
    id: IngredientId;
    seq: number;
  } | null>(null);

  const [notice, setNotice] = useState<BannerNotice | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalResult, setModalResult] = useState<MatchResult | null>(null);
  const [modalFirstDiscovery, setModalFirstDiscovery] = useState(false);
  const [modalFromCodex, setModalFromCodex] = useState(false);
  const [gapRecommendations, setGapRecommendations] = useState<
    MealSuggestion[]
  >([]);
  const [recsLoading, setRecsLoading] = useState(false);

  const flySeqRef = useRef(1);
  const stirTimeoutRef = useRef<number | null>(null);

  const catalog = useMemo(() => {
    void customIngredients;
    return getAllCatalogIngredients();
  }, [customIngredients]);

  const allRecipes = useMemo(() => {
    void customRecipes;
    return getAllPotionRecipes();
  }, [customRecipes]);

  // Persist Witch state to localStorage (`coven.witch.v1`)
  useEffect(() => {
    saveWitchState({
      owned,
      discovered,
      cooked,
      gold,
      avoided,
      customIngredients,
      customRecipes,
    });
  }, [
    owned,
    discovered,
    cooked,
    gold,
    avoided,
    customIngredients,
    customRecipes,
  ]);

  // Sync confirmed owned pantry to Coven's shared Zustand store
  useEffect(() => {
    writePantryToSharedStore(idsToIngredients(owned));
  }, [owned]);

  // Clean up any pending stir timer on unmount
  useEffect(() => {
    return () => {
      if (stirTimeoutRef.current !== null) {
        window.clearTimeout(stirTimeoutRef.current);
      }
    };
  }, []);

  // Recompute top 3 calendar-gap meal suggestions whenever pantry, gap, diet, or recipes change
  useEffect(() => {
    let cancelled = false;
    setRecsLoading(true);

    suggestMeal(idsToIngredients(owned), gapMinutes, { avoided })
      .then((items) => {
        if (!cancelled) {
          setGapRecommendations(items);
          setRecsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setGapRecommendations([]);
          setRecsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [owned, gapMinutes, avoided, allRecipes]);

  const mixCost = useMemo(() => costOfMix(mix, owned), [mix, owned]);
  const rank = useMemo(
    () => rankForFound(discovered.length),
    [discovered.length]
  );

  const showNotice = useCallback(
    (text: string, tone: BannerNotice['tone'] = 'info') => {
      setNotice({ text, tone });
    },
    []
  );

  const handleToggleAllergen = (allergen: Allergen) => {
    const isCurrentlyAvoided = avoided.includes(allergen);
    const nextAvoided = isCurrentlyAvoided
      ? avoided.filter((a) => a !== allergen)
      : [...avoided, allergen];

    setAvoided(nextAvoided);

    if (!isCurrentlyAvoided) {
      setMix((prevMix) => {
        const filtered = prevMix.filter(
          (id) => getIngredientMeta(id).allergen !== allergen
        );
        if (filtered.length < prevMix.length) {
          showNotice(
            `Removed ${allergen}-containing ingredients from the cauldron.`,
            'info'
          );
        }
        return filtered;
      });
    }
  };

  const handleSelectShelfIngredient = (id: IngredientId) => {
    const item = getIngredientMeta(id);
    if (item.allergen && avoided.includes(item.allergen)) {
      return;
    }

    if (shelfMode === 'own') {
      setOwned((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
      return;
    }

    if (mix.includes(id)) {
      setMix((prev) => prev.filter((x) => x !== id));
      return;
    }

    const seq = flySeqRef.current++;
    setFlyingIngredient({ id, seq });
    setMix((prev) => [...prev, id]);
    setNotice(null);
  };

  const handleRemoveFromCauldron = (id: IngredientId) => {
    setMix((prev) => prev.filter((x) => x !== id));
  };

  const handleStir = () => {
    if (isStirring) return;

    if (mix.length === 0) {
      showNotice(
        'Your cauldron is empty! Upload an ingredient photo above or tap items from the Magical Pantry.',
        'warn'
      );
      return;
    }

    if (mixCost > gold) {
      showNotice(
        `Insufficient Gold Pouch! Extra ingredients cost $${mixCost.toFixed(
          2
        )}, exceeding your $${gold.toFixed(2)} budget.`,
        'warn'
      );
      return;
    }

    setNotice(null);
    setIsStirring(true);

    if (stirTimeoutRef.current !== null) {
      window.clearTimeout(stirTimeoutRef.current);
    }

    stirTimeoutRef.current = window.setTimeout(() => {
      const outcome = matchMix(mix, avoided, discovered);
      let firstTime = false;

      if (outcome.kind === 'full') {
        setLastScannedRecipe(outcome.recipe);
        if (!discovered.includes(outcome.recipe.id)) {
          firstTime = true;
          setDiscovered((prev) => [...prev, outcome.recipe.id]);
        }
      }

      setIsStirring(false);
      setModalFirstDiscovery(firstTime);
      setModalFromCodex(false);
      setModalResult(outcome);
      setModalOpen(true);
    }, 900);
  };

  const handleScanStart = () => {
    setIsPhotoScanning(true);
    setLastScannedRecipe(null);
    setModalOpen(false);
  };

  const handleScanError = () => {
    setIsPhotoScanning(false);
  };

  const handleScanComplete = (outcome: ScanPantryOutcome) => {
    setIsPhotoScanning(false);

    if (outcome.customItems.length > 0) {
      setCustomIngredients((prev) => {
        const byId = new Map(prev.map((c) => [c.id, c]));
        for (const item of outcome.customItems) {
          byId.set(item.id, item);
        }
        return Array.from(byId.values());
      });
    }

    if (outcome.autoRecipe?.isCustomScanned) {
      const customRec = outcome.autoRecipe;
      setCustomRecipes((prev) => {
        const byId = new Map(prev.map((r) => [r.id, r]));
        byId.set(customRec.id, customRec);
        return Array.from(byId.values());
      });
    }

    const allowedIds = outcome.matchedIds.filter((id) => {
      const al = getIngredientMeta(id).allergen;
      return al === null || !avoided.includes(al);
    });

    if (allowedIds.length === 0) {
      showNotice(
        'Scanned items matched active dietary wards and were held outside the cauldron.',
        'warn'
      );
      return;
    }

    // Add all identified items to Owned Pantry ($0 extra cost) and toss into Cauldron
    setOwned((prev) => Array.from(new Set([...prev, ...allowedIds])));
    setMix(allowedIds);

    const seq = flySeqRef.current++;
    setFlyingIngredient({ id: allowedIds[0], seq });
    setNotice(null);
    setIsStirring(true);

    if (stirTimeoutRef.current !== null) {
      window.clearTimeout(stirTimeoutRef.current);
    }

    stirTimeoutRef.current = window.setTimeout(() => {
      let brewOutcome: MatchResult;
      if (
        outcome.autoRecipe &&
        !recipeHasAvoidedAllergen(outcome.autoRecipe, avoided)
      ) {
        const reqSet = new Set(outcome.autoRecipe.ingredients);
        const unused = allowedIds.filter((id) => !reqSet.has(id));
        brewOutcome = {
          kind: 'full',
          recipe: outcome.autoRecipe,
          alternatives: [],
          unused,
        };
      } else {
        brewOutcome = matchMix(allowedIds, avoided, discovered);
      }

      if (brewOutcome.kind === 'full') {
        setLastScannedRecipe(brewOutcome.recipe);
        if (!discovered.includes(brewOutcome.recipe.id)) {
          setDiscovered((prev) => [...prev, brewOutcome.recipe.id]);
        }
        showNotice(
          `Stocked ${allowedIds.length} scanned ingredients and brewed ${brewOutcome.recipe.potionName}!`,
          'ok'
        );
      } else if (brewOutcome.kind === 'near') {
        setLastScannedRecipe(brewOutcome.recipe);
      }

      setIsStirring(false);
    }, 1400);
  };

  const handleRebrewIds = (ids: IngredientId[]) => {
    const allowedIds = ids.filter((id) => {
      const al = getIngredientMeta(id).allergen;
      return al === null || !avoided.includes(al);
    });

    if (allowedIds.length === 0) {
      showNotice(
        'Select at least one unrestricted ingredient to brew.',
        'warn'
      );
      return;
    }

    setOwned((prev) => Array.from(new Set([...prev, ...allowedIds])));
    setMix(allowedIds);

    const seq = flySeqRef.current++;
    setFlyingIngredient({ id: allowedIds[0], seq });
    setNotice(null);
    setIsStirring(true);

    if (stirTimeoutRef.current !== null) {
      window.clearTimeout(stirTimeoutRef.current);
    }

    stirTimeoutRef.current = window.setTimeout(() => {
      const brewOutcome = matchMix(allowedIds, avoided, discovered);

      if (brewOutcome.kind === 'full') {
        setLastScannedRecipe(brewOutcome.recipe);
        if (!discovered.includes(brewOutcome.recipe.id)) {
          setDiscovered((prev) => [...prev, brewOutcome.recipe.id]);
        }
      } else if (brewOutcome.kind === 'near') {
        setLastScannedRecipe(brewOutcome.recipe);
      }

      setIsStirring(false);
    }, 1400);
  };

  const handleSelectAlternativeInModal = (altRecipe: PotionRecipe) => {
    const altSet = new Set(altRecipe.ingredients);
    const unused = mix.filter((id) => !altSet.has(id));
    const isNew = !discovered.includes(altRecipe.id);

    if (isNew) {
      setDiscovered((prev) => [...prev, altRecipe.id]);
    }
    setLastScannedRecipe(altRecipe);

    const remainingAlts = allRecipes.filter(
      (r) =>
        r.id !== altRecipe.id &&
        r.ingredients.every((req) => mix.includes(req)) &&
        !recipeHasAvoidedAllergen(r, avoided)
    );

    setModalFirstDiscovery(isNew);
    setModalFromCodex(false);
    setModalResult({
      kind: 'full',
      recipe: altRecipe,
      alternatives: remainingAlts,
      unused,
    });
  };

  const handleOpenCodexRecipe = (recipe: PotionRecipe) => {
    setModalFirstDiscovery(false);
    setModalFromCodex(true);
    setModalResult({
      kind: 'full',
      recipe,
      alternatives: [],
      unused: [],
    });
    setModalOpen(true);
  };

  const handleMarkCooked = (recipeId: string) => {
    setCooked((prev) => (prev.includes(recipeId) ? prev : [...prev, recipeId]));
    showNotice('Logged in your Witch Kitchen! Meal marked as cooked.', 'ok');
  };

  const handleClearPantry = () => {
    clearCustomIngredients();
    setCustomIngredients([]);
    setOwned([]);
    setMix([]);
    setLastScannedRecipe(null);
    showNotice('Cleared all owned pantry items and emptied the cauldron.', 'info');
  };

  const handleLoadRecipeIntoCauldron = (recipe: PotionRecipe) => {
    const allowedIds = recipe.ingredients.filter((id) => {
      const al = getIngredientMeta(id).allergen;
      return al === null || !avoided.includes(al);
    });
    setMix(allowedIds);
    setActiveTab('brew');
    showNotice(
      `Loaded ${recipe.potionName} ingredients into the cauldron — press STIR! to brew.`,
      'info'
    );
  };

  return (
    <div className="witch-root witch-page-shell">
      <Starfield count={36} seed={11} />

      <div className="relative z-10 flex min-h-dvh flex-col">
        <PageHeader
          monster="hob"
          title="Hob · Potion Overflow"
          subtitle="Brew affordable campus meals from whatever scraps are left on your shelf"
        >
          <div className="hidden items-center gap-2 md:flex">
            <PixelSprite grid={WITCH_HAT_SPRITE} pixelSize={3} />
            <span className="witch-tag witch-tag--violet text-base">
              {rank} · {discovered.length}/{allRecipes.length}
            </span>
          </div>
        </PageHeader>

        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 px-4 py-5 sm:px-6">
          {/* Top Navigation Tabs + Player Progression Bar */}
          <div className="witch-panel flex flex-wrap items-center justify-between gap-3 p-3">
            <div
              role="group"
              aria-label="Witch Mode views"
              className="flex flex-wrap gap-2"
            >
              <button
                type="button"
                aria-pressed={activeTab === 'brew'}
                onClick={() => setActiveTab('brew')}
                className="witch-btn"
              >
                Brewing Station
              </button>
              <button
                type="button"
                aria-pressed={activeTab === 'codex'}
                onClick={() => setActiveTab('codex')}
                className="witch-btn"
              >
                Potion Codex ({discovered.length}/{allRecipes.length})
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-base">
              <span className="witch-tag witch-tag--violet">Rank: {rank}</span>
              <span className="witch-tag witch-tag--green">
                Owned: {owned.length}/{catalog.length}
              </span>
              <span className="witch-tag witch-tag--amber">
                Cooked: {cooked.length}
              </span>
            </div>
          </div>

          {/* Notification / Validation Banner */}
          {notice && (
            <div
              role={notice.tone === 'warn' ? 'alert' : 'status'}
              className={`witch-panel flex items-center justify-between gap-3 px-4 py-3 ${
                notice.tone === 'warn'
                  ? 'border-[#ff7a6b] text-[#ff7a6b]'
                  : notice.tone === 'ok'
                    ? 'border-[#6fe08a] text-[#6fe08a]'
                    : 'text-[#ffc94d]'
              }`}
            >
              <p className="text-xl">{notice.text}</p>
              <button
                type="button"
                onClick={() => setNotice(null)}
                className="witch-btn px-2.5 py-1 text-[10px]"
                aria-label="Dismiss notification"
              >
                Dismiss
              </button>
            </div>
          )}

          {activeTab === 'brew' ? (
            <>
              {/* TOP HERO SECTION — INSTANT UPLOAD / PHOTO SCANNER */}
              <PantryScanner
                catalog={catalog}
                lastBrewedRecipe={lastScannedRecipe}
                cookedIds={cooked}
                isAutoBrewing={isStirring}
                hasPantryItems={owned.length > 0 || customIngredients.length > 0}
                onScanStart={handleScanStart}
                onScanError={handleScanError}
                onScanComplete={handleScanComplete}
                onRebrewIds={handleRebrewIds}
                onMarkCooked={handleMarkCooked}
                onClearPantry={handleClearPantry}
              />

              <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
                {/* LEFT SECTION — BREWING STATION */}
                <div className="flex flex-col gap-4 lg:col-span-5">
                  <Cauldron
                    mix={mix}
                    mixCost={mixCost}
                    gold={gold}
                    isStirring={isStirring || isPhotoScanning}
                    flyingIngredient={flyingIngredient}
                    onRemoveIngredient={handleRemoveFromCauldron}
                    onStir={handleStir}
                    onEmpty={() => setMix([])}
                  />

                  <GapPicker value={gapMinutes} onChange={setGapMinutes} />

                  <GoldPouch
                    gold={gold}
                    mixCost={mixCost}
                    onGoldChange={setGold}
                  />

                  <DietChips
                    avoided={avoided}
                    onToggle={handleToggleAllergen}
                  />

                  {/* Gap-Filtered Meal Recommendations */}
                  <section
                    className="witch-panel flex flex-col gap-3 p-4"
                    aria-labelledby="witch-recs-heading"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3
                        id="witch-recs-heading"
                        className="witch-head text-xs text-[#6fe08a]"
                      >
                        Best Meals for {gapMinutes}m Gap
                      </h3>
                      <span className="text-sm text-[#c2b3d9]">
                        Top 3 ranked
                      </span>
                    </div>

                    {recsLoading ? (
                      <p className="text-lg text-[#c2b3d9]">
                        Ranking recipes for your {gapMinutes}-minute gap...
                      </p>
                    ) : gapRecommendations.length === 0 ? (
                      <div className="witch-well px-3 py-2 text-base text-[#c2b3d9]">
                        No potions fit within {gapMinutes} minutes under your active dietary wards. Try choosing a longer time window.
                      </div>
                    ) : (
                      <ul className="flex flex-col gap-2">
                        {gapRecommendations.map((sug) => {
                          const matchedRecipe = allRecipes.find((r) =>
                            sug.name.startsWith(r.potionName)
                          );
                          return (
                            <li
                              key={sug.name}
                              className="witch-well flex flex-col gap-1.5 p-3"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-lg font-bold text-[#f1e8d8]">
                                  {sug.name}
                                </span>
                                <span className="witch-tag witch-tag--amber text-sm">
                                  {sug.minutes}m · {sug.effort} effort
                                </span>
                              </div>

                              <p className="text-base text-[#6fe08a]">
                                Uses owned:{' '}
                                {sug.uses.length > 0
                                  ? sug.uses.join(', ')
                                  : 'None yet'}
                              </p>

                              {sug.missing.length > 0 ? (
                                <>
                                  <p className="text-base text-[#ffc94d]">
                                    Missing: {sug.missing.join(', ')}
                                  </p>
                                  {sug.whereToGetMissing && (
                                    <p className="text-sm text-[#c2b3d9]">
                                      Campus hint: {sug.whereToGetMissing}
                                    </p>
                                  )}
                                </>
                              ) : (
                                <p className="text-base text-[#6fe08a]">
                                  Ready to brew right now for $0 extra!
                                </p>
                              )}

                              {matchedRecipe && (
                                <div className="pt-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleLoadRecipeIntoCauldron(
                                        matchedRecipe
                                      )
                                    }
                                    className="witch-btn px-2.5 py-1 text-[9px]"
                                  >
                                    Load into Cauldron
                                  </button>
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </section>
                </div>

                {/* RIGHT SECTION — MAGICAL PANTRY */}
                <div className="flex flex-col gap-4 lg:col-span-7">
                  <PantryShelf
                    catalog={catalog}
                    mode={shelfMode}
                    owned={owned}
                    mix={mix}
                    avoided={avoided}
                    onModeChange={setShelfMode}
                    onSelectIngredient={handleSelectShelfIngredient}
                    onClearPantry={handleClearPantry}
                  />

                  <ExamMode
                    owned={owned}
                    avoided={avoided}
                    onLoadRecipeIntoCauldron={handleLoadRecipeIntoCauldron}
                  />
                </div>
              </div>
            </>
          ) : (
            <Codex
              discoveredIds={discovered}
              cookedIds={cooked}
              onSelectRecipe={handleOpenCodexRecipe}
            />
          )}
        </main>
      </div>

      <ResultModal
        isOpen={modalOpen}
        result={modalResult}
        isFirstDiscovery={modalFirstDiscovery}
        fromCodex={modalFromCodex}
        gapMinutes={gapMinutes}
        owned={owned}
        cookedIds={cooked}
        onMarkCooked={handleMarkCooked}
        onSelectAlternative={handleSelectAlternativeInModal}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}

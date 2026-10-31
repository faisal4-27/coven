import { useEffect, useId, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { hob } from '../../../shared/sprites';
import { PixelSprite as SharedPixelSprite } from '../../../shared/ui';
import { getIngredientMeta } from '../ingredients';
import {
  UnsupportedPantryImageError,
  getCachedDemoScanOutcome,
  isSupportedPantryImage,
  scanPantryDetailed,
} from '../logic';
import { PixelSprite } from '../pixel/PixelSprite';
import {
  CAULDRON_SPRITE,
  computeCauldronLiquidColor,
} from '../pixel/cauldron';
import { getRecipeDishVisual } from '../pixel/dishes';
import { getIngredientSprite } from '../pixel/icons';
import { SPARKLE_PIXEL_SPRITE } from '../pixel/palette';
import type {
  GapDurationMinutes,
  IngredientId,
  PantryCatalogItem,
  PotionRecipe,
  ScanPantryOutcome,
  ScanSource,
} from '../types';

const IDLE_PREVIEW_IDS: readonly IngredientId[] = [
  'eggs',
  'rice',
  'spinach',
  'tomato',
  'bread',
];

export interface PantryScannerProps {
  catalog: readonly PantryCatalogItem[];
  lastBrewedRecipe: PotionRecipe | null;
  cookedIds: readonly string[];
  isAutoBrewing: boolean;
  hasPantryItems: boolean;
  rank: string;
  ownedCount: number;
  gapMinutes: GapDurationMinutes;
  gold: number;
  onScanStart: () => void;
  onScanError: () => void;
  onScanComplete: (outcome: ScanPantryOutcome) => void;
  onRebrewIds: (ids: IngredientId[]) => void;
  onMarkCooked: (recipeId: string) => void;
  onClearPantry: () => void;
  onOpenKitchen: () => void;
}

export function PantryScanner({
  catalog,
  lastBrewedRecipe,
  cookedIds,
  isAutoBrewing,
  hasPantryItems,
  rank,
  ownedCount,
  gapMinutes,
  gold,
  onScanStart,
  onScanError,
  onScanComplete,
  onRebrewIds,
  onMarkCooked,
  onClearPantry,
  onOpenKitchen,
}: PantryScannerProps) {
  const uploadInputId = useId();
  const cameraInputId = useId();

  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [scanSource, setScanSource] = useState<ScanSource | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [detectedIds, setDetectedIds] = useState<IngredientId[]>([]);
  const [hasResults, setHasResults] = useState(false);
  const [showAddMore, setShowAddMore] = useState(false);

  const uploadRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  // Revoke temporary preview object URL on cleanup so uploaded photos are never retained.
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const runInstantScan = async (file: File) => {
    setIsScanning(true);
    setHasResults(false);
    setDetectedIds([]);
    setErrorMsg(null);
    setStatusMessage(null);
    onScanStart();

    try {
      const outcome = await scanPantryDetailed(file);
      setScanSource(outcome.source);
      setStatusMessage(outcome.message);
      setDetectedIds(outcome.matchedIds);
      setHasResults(true);
      onScanComplete(outcome);
    } catch (err) {
      onScanError();
      if (err instanceof UnsupportedPantryImageError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg(
          'Scanner failed unexpectedly. Try Sample Scan or tap ingredients below.'
        );
      }
    } finally {
      setIsScanning(false);
    }
  };

  const handleFilePicked = (file: File | undefined) => {
    if (!file) return;

    setErrorMsg(null);
    setStatusMessage(null);
    setScanSource(null);

    if (!isSupportedPantryImage(file)) {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      setSelectedFileName(null);
      setErrorMsg(
        'Unsupported image type. Please upload a JPEG, PNG, or WebP ingredient photo.'
      );
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    const nextUrl = URL.createObjectURL(file);
    setSelectedFileName(file.name || 'Captured photo');
    setPreviewUrl(nextUrl);

    // Reset input value so re-uploading the same photo triggers onChange again
    if (uploadRef.current) uploadRef.current.value = '';
    if (cameraRef.current) cameraRef.current.value = '';

    void runInstantScan(file);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    const droppedFile = event.dataTransfer.files?.[0];
    handleFilePicked(droppedFile);
  };

  const handleSampleScan = () => {
    setErrorMsg(null);
    onScanStart();
    const demo = getCachedDemoScanOutcome();
    setScanSource(demo.source);
    setStatusMessage(demo.message);
    setDetectedIds(demo.matchedIds);
    setHasResults(true);
    onScanComplete(demo);
  };

  const handleClearScan = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setSelectedFileName(null);
    setHasResults(false);
    setDetectedIds([]);
    setStatusMessage(null);
    setErrorMsg(null);
    setShowAddMore(false);
  };

  const toggleDetectedId = (id: IngredientId) => {
    setDetectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const detectedSet = new Set(detectedIds);
  const isBrewingCauldronVisible = isScanning || isAutoBrewing;
  const cauldronLiquidColor = computeCauldronLiquidColor(detectedIds, true);
  const dishVisual = lastBrewedRecipe
    ? getRecipeDishVisual(lastBrewedRecipe)
    : null;

  return (
    <section
      className="witch-panel flex flex-col gap-5 p-5 sm:p-6"
      aria-labelledby="witch-scanner-heading"
    >
      {/* Hero Banner: Big Visible Hob Avatar + Main Scanner Controls */}
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-stretch">
        {/* Big Animated Hob Avatar Pedestal */}
        <div
          className="witch-well flex shrink-0 flex-col items-center justify-end gap-2 px-5 pt-4 pb-3 sm:w-52"
          style={{
            backgroundImage:
              'linear-gradient(to top, rgba(255, 122, 26, 0.28) 0 26%, transparent 26%)',
          }}
        >
          <div className="anim-bob">
            <SharedPixelSprite
              sprite={hob}
              scale={6}
              title="Hob · Kitchen Spirit"
            />
          </div>
          <span className="witch-tag witch-tag--amber mt-1 text-sm font-bold">
            Hob · {rank}
          </span>
        </div>

        {/* Main Scanner Headline + Primary Actions */}
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-4 text-center sm:text-left">
          <div>
            <div className="flex items-center justify-center gap-2 sm:justify-start">
              <PixelSprite grid={SPARKLE_PIXEL_SPRITE} pixelSize={2} />
              <span className="font-display text-xs uppercase tracking-widest text-[#ffb347]">
                Main Cauldron Scanner
              </span>
            </div>
            <h2
              id="witch-scanner-heading"
              className="mt-1 font-display text-2xl leading-tight text-[#ff7a1a] sm:text-4xl"
              style={{ textShadow: '3px 3px 0 #0a0502' }}
            >
              Instant Photo-to-Potion Scanner
            </h2>
            <p className="mt-2 text-xl text-[#d6b69c]">
              Upload or drop a photo of your ingredients — Hob identifies every item, stocks your pantry, tosses them into the cauldron, and brews your meal automatically.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
            <label
              htmlFor={uploadInputId}
              className="witch-btn witch-btn--stir cursor-pointer text-sm sm:text-base"
            >
              Upload Ingredient Photo
              <input
                ref={uploadRef}
                id={uploadInputId}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => handleFilePicked(e.target.files?.[0])}
              />
            </label>

            <label
              htmlFor={cameraInputId}
              className="witch-btn witch-btn--amber cursor-pointer text-xs sm:text-sm"
            >
              Take Photo
              <input
                ref={cameraRef}
                id={cameraInputId}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                className="sr-only"
                onChange={(e) => handleFilePicked(e.target.files?.[0])}
              />
            </label>

            <button
              type="button"
              onClick={handleSampleScan}
              disabled={isBrewingCauldronVisible}
              className="witch-btn witch-btn--violet text-xs sm:text-sm"
            >
              Sample Scan
            </button>

            <button
              type="button"
              onClick={() => {
                handleClearScan();
                onClearPantry();
              }}
              disabled={
                isBrewingCauldronVisible ||
                (!hasPantryItems && !previewUrl && !hasResults)
              }
              className="witch-btn witch-btn--danger text-xs sm:text-sm"
            >
              Clear Pantry
            </button>
          </div>
        </div>
      </div>

      {/* Opening Stage when no photo is loaded yet: Large Dropzone + Simmering Cauldron */}
      {!previewUrl && !hasResults && !isBrewingCauldronVisible && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={`witch-well flex min-h-[250px] flex-col items-center justify-center gap-4 border-dashed px-6 py-8 text-center transition-colors lg:col-span-7 ${
              isDragOver
                ? 'border-[#ff7a1a] bg-[#331b0e]'
                : 'border-[#8f4c22]'
            }`}
          >
            <div className="flex flex-wrap items-center justify-center gap-2" aria-hidden="true">
              {IDLE_PREVIEW_IDS.map((id) => {
                const meta = getIngredientMeta(id);
                return (
                  <span key={id} className="witch-float-token">
                    <PixelSprite
                      grid={getIngredientSprite(id, meta.spriteKind)}
                      pixelSize={4}
                    />
                  </span>
                );
              })}
            </div>

            <div>
              <p className="text-2xl text-[#f4ecd8]">
                Drop a shelf or ingredient flat-lay photo here
              </p>
              <p className="mt-1 text-lg text-[#d6b69c]">
                or press{' '}
                <label
                  htmlFor={uploadInputId}
                  className="cursor-pointer font-bold text-[#ff7a1a] underline"
                >
                  Upload Ingredient Photo
                </label>{' '}
                to scan &amp; brew in one step
              </p>
            </div>

            <p className="text-base text-[#d6b69c]">
              Resized in-browser · Never stored or logged · Groq AI Vision + automatic potion recipe
            </p>
          </div>

          <div className="witch-well witch-cauldron-arena flex min-h-[250px] flex-col items-center justify-center text-center lg:col-span-5">
            <div className="flex items-center gap-2">
              <PixelSprite grid={SPARKLE_PIXEL_SPRITE} pixelSize={2} />
              <p className="witch-head text-xs text-[#ff7a1a]">
                Cauldron Ready
              </p>
              <PixelSprite grid={SPARKLE_PIXEL_SPRITE} pixelSize={2} />
            </div>

            <div className="witch-bubble-row" aria-hidden="true">
              <span
                className="witch-bubble witch-bubble--1"
                style={{ backgroundColor: '#ff7a1a' }}
              />
              <span
                className="witch-bubble witch-bubble--2"
                style={{ backgroundColor: '#ffb347' }}
              />
              <span
                className="witch-bubble witch-bubble--3"
                style={{ backgroundColor: '#ff7a1a' }}
              />
            </div>

            <div
              className="witch-cauldron-glow"
              style={{ boxShadow: '0 -8px 0 0 #ff7a1a2b' }}
            >
              <PixelSprite
                grid={CAULDRON_SPRITE}
                pixelSize={10}
                colorOverrides={{ L: '#ff7a1a' }}
                label="Simmering cauldron waiting for ingredients"
              />
            </div>

            <p className="text-lg text-[#d6b69c]">
              Waiting for your ingredient photo to start brewing...
            </p>
          </div>
        </div>
      )}

      {/* Error State */}
      {errorMsg && (
        <div
          role="alert"
          className="witch-well border-[#ff5a36] px-3 py-2 text-base text-[#ff8566]"
        >
          {errorMsg}
        </div>
      )}

      {/* Photo Preview + Brewing Cauldron Animation -> Final Brewed Recipe */}
      {(previewUrl || hasResults || isBrewingCauldronVisible) && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className="grid grid-cols-1 gap-4 lg:grid-cols-12"
        >
          {/* Left Column: Photo Preview + Identified Pantry Ingredients */}
          <div className="witch-well flex flex-col gap-3 p-3.5 lg:col-span-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt="Uploaded ingredients preview"
                    className="h-24 w-24 shrink-0 border-2 border-[#6b3818] object-cover"
                  />
                )}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {isScanning ? (
                      <span className="witch-tag witch-tag--amber">
                        Scanning Photo...
                      </span>
                    ) : (
                      <>
                        {scanSource && (
                          <span
                            className={`witch-tag ${
                              scanSource === 'ai'
                                ? 'witch-tag--green'
                                : 'witch-tag--amber'
                            }`}
                          >
                            {scanSource === 'ai'
                              ? 'Source: Groq AI Vision'
                              : 'Source: Smart Photo Scan'}
                          </span>
                        )}
                        <span className="witch-tag witch-tag--violet">
                          Added to Pantry &amp; Pot
                        </span>
                      </>
                    )}
                  </div>
                  <p className="mt-1 truncate text-lg font-bold text-[#f4ecd8]">
                    {selectedFileName ?? 'Sample Pantry Shelf'}
                  </p>
                  <p className="text-base text-[#ff9f43]">
                    {isScanning
                      ? 'Reading ingredients from your photo and heating the cauldron...'
                      : statusMessage}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClearScan}
                disabled={isBrewingCauldronVisible}
                className="witch-btn px-2.5 py-1 text-[9px]"
              >
                Clear
              </button>
            </div>

            {hasResults && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <p className="text-base text-[#ffb347]">
                    Identified &amp; stocked ({detectedIds.length} ingredients):
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowAddMore((prev) => !prev)}
                    className="witch-chip text-sm"
                    aria-expanded={showAddMore}
                  >
                    {showAddMore ? 'Hide full shelf' : '+ Adjust / add items'}
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(showAddMore ? catalog.map((c) => c.id) : detectedIds).map(
                    (id) => {
                      const item = getIngredientMeta(id);
                      const checked = detectedSet.has(id);
                      return (
                        <button
                          key={id}
                          type="button"
                          aria-pressed={checked}
                          onClick={() => toggleDetectedId(id)}
                          className="witch-chip"
                        >
                          <PixelSprite
                            grid={getIngredientSprite(item.id, item.spriteKind)}
                            pixelSize={2}
                          />
                          <span>{item.name}</span>
                          <span>{checked ? '[x]' : '[ ]'}</span>
                        </button>
                      );
                    }
                  )}
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    disabled={
                      detectedIds.length === 0 || isBrewingCauldronVisible
                    }
                    onClick={() => onRebrewIds(detectedIds)}
                    className="witch-btn witch-btn--amber text-[10px]"
                  >
                    {isBrewingCauldronVisible
                      ? 'Brewing Cauldron...'
                      : `Re-Brew Selected (${detectedIds.length})`}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Right Column: Live Brewing Cauldron Animation -> Final Recipe */}
          <div className="witch-well flex flex-col justify-between gap-3 p-3.5 lg:col-span-6">
            {isBrewingCauldronVisible ? (
              <div
                role="status"
                aria-live="polite"
                className="witch-cauldron-arena flex h-full flex-col items-center justify-center py-3 text-center"
              >
                <div className="flex items-center gap-2">
                  <PixelSprite grid={SPARKLE_PIXEL_SPRITE} pixelSize={2} />
                  <p className="witch-head text-xs text-[#ff7a1a]">
                    Brewing Cauldron
                  </p>
                  <PixelSprite grid={SPARKLE_PIXEL_SPRITE} pixelSize={2} />
                </div>

                {/* Floating bobbing ingredient sprites dropping into the pot */}
                {detectedIds.length > 0 && (
                  <div
                    className="flex flex-wrap items-center justify-center gap-1.5 pt-1"
                    aria-hidden="true"
                  >
                    {detectedIds.slice(0, 8).map((id) => {
                      const meta = getIngredientMeta(id);
                      return (
                        <span key={id} className="witch-float-token">
                          <PixelSprite
                            grid={getIngredientSprite(id, meta.spriteKind)}
                            pixelSize={3}
                          />
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Rising pixel potion bubbles */}
                <div className="witch-bubble-row" aria-hidden="true">
                  <span
                    className="witch-bubble witch-bubble--1 witch-bubble--fast"
                    style={{ backgroundColor: cauldronLiquidColor }}
                  />
                  <span
                    className="witch-bubble witch-bubble--2 witch-bubble--fast"
                    style={{ backgroundColor: cauldronLiquidColor }}
                  />
                  <span
                    className="witch-bubble witch-bubble--3 witch-bubble--fast"
                    style={{ backgroundColor: cauldronLiquidColor }}
                  />
                </div>

                {/* Shaking pixel-art cauldron */}
                <div
                  className="witch-cauldron-glow witch-pot-shake"
                  style={{
                    boxShadow: `0 -8px 0 0 ${cauldronLiquidColor}33`,
                  }}
                >
                  <PixelSprite
                    grid={CAULDRON_SPRITE}
                    pixelSize={9}
                    colorOverrides={{ L: cauldronLiquidColor }}
                    label="Animated brewing cauldron"
                  />
                </div>

                <p className="text-lg text-[#ffb347]">
                  {isScanning
                    ? 'Scanning your photo & heating the cauldron...'
                    : `Stirring ${detectedIds.length} ingredients into your potion...`}
                </p>
              </div>
            ) : lastBrewedRecipe && dishVisual ? (
              <div className="witch-recipe-reveal flex h-full flex-col justify-between gap-3">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="border-2 border-[#6b3818] bg-[#140a05] p-2">
                    <PixelSprite
                      grid={dishVisual.grid}
                      colorOverrides={dishVisual.overrides}
                      pixelSize={6}
                      label={lastBrewedRecipe.mealName}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="witch-tag witch-tag--green">
                        Brewed from Photo
                      </span>
                      <span className="witch-tag witch-tag--amber">
                        {lastBrewedRecipe.minutes} min
                      </span>
                      {lastBrewedRecipe.packable && (
                        <span className="witch-tag witch-tag--violet">
                          Packable
                        </span>
                      )}
                    </div>
                    <h3 className="witch-head mt-1.5 text-sm text-[#ff7a1a]">
                      {lastBrewedRecipe.potionName}
                    </h3>
                    <p className="text-xl text-[#f4ecd8]">
                      {lastBrewedRecipe.mealName}
                    </p>
                  </div>
                </div>

                <ol className="flex list-decimal flex-col gap-1 pl-5 text-base text-[#f4ecd8]">
                  {lastBrewedRecipe.steps.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ol>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <span className="text-sm text-[#ff9f43]">
                    Unlocked in Potion Codex · $0.00 extra cost
                  </span>
                  <button
                    type="button"
                    disabled={cookedIds.includes(lastBrewedRecipe.id)}
                    onClick={() => onMarkCooked(lastBrewedRecipe.id)}
                    className="witch-btn witch-btn--stir text-[10px]"
                  >
                    {cookedIds.includes(lastBrewedRecipe.id)
                      ? 'Cooked!'
                      : 'Mark as Cooked'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center py-6 text-center text-base text-[#d6b69c]">
                Upload a photo to watch the Brewing Cauldron stir up your recipe.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Kitchen Status + 1-Click Access to Manual Pantry & Controls */}
      <div className="witch-well flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-base">
        <div className="flex flex-wrap items-center gap-3 text-[#d6b69c]">
          <span>
            Stocked Pantry:{' '}
            <strong className="text-[#ff9f43]">{ownedCount} items</strong>
          </span>
          <span>·</span>
          <span>
            Time Gap:{' '}
            <strong className="text-[#ffb347]">{gapMinutes} min</strong>
          </span>
          <span>·</span>
          <span>
            Gold Pouch:{' '}
            <strong className="text-[#f4ecd8]">${gold.toFixed(2)}</strong>
          </span>
        </div>

        <button
          type="button"
          onClick={onOpenKitchen}
          className="witch-btn text-xs"
        >
          Manual Pantry &amp; Kitchen ▸
        </button>
      </div>
    </section>
  );
}

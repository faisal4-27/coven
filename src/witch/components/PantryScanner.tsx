import { useEffect, useId, useRef, useState } from 'react';
import type { DragEvent } from 'react';
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
  IngredientId,
  PantryCatalogItem,
  PotionRecipe,
  ScanPantryOutcome,
  ScanSource,
} from '../types';

export interface PantryScannerProps {
  catalog: readonly PantryCatalogItem[];
  lastBrewedRecipe: PotionRecipe | null;
  cookedIds: readonly string[];
  isAutoBrewing: boolean;
  hasPantryItems: boolean;
  onScanStart: () => void;
  onScanError: () => void;
  onScanComplete: (outcome: ScanPantryOutcome) => void;
  onRebrewIds: (ids: IngredientId[]) => void;
  onMarkCooked: (recipeId: string) => void;
  onClearPantry: () => void;
}

export function PantryScanner({
  catalog,
  lastBrewedRecipe,
  cookedIds,
  isAutoBrewing,
  hasPantryItems,
  onScanStart,
  onScanError,
  onScanComplete,
  onRebrewIds,
  onMarkCooked,
  onClearPantry,
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
      className="witch-panel flex flex-col gap-4 p-4 sm:p-5"
      aria-labelledby="witch-scanner-heading"
    >
      {/* Header Row + Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <PixelSprite grid={SPARKLE_PIXEL_SPRITE} pixelSize={2} />
            <h2
              id="witch-scanner-heading"
              className="witch-head text-xs text-[#ffc94d] sm:text-sm"
            >
              Instant Photo-to-Potion Scanner
            </h2>
          </div>
          <p className="mt-1 text-lg text-[#c2b3d9]">
            Upload or drop a photo of your ingredients — Coven identifies every item, stocks your pantry, tosses them into the cauldron, and brews your meal automatically.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label
            htmlFor={uploadInputId}
            className="witch-btn witch-btn--stir cursor-pointer text-[10px]"
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
            className="witch-btn witch-btn--amber cursor-pointer text-[10px]"
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
            className="witch-btn witch-btn--violet text-[10px]"
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
            className="witch-btn witch-btn--danger text-[10px]"
          >
            Clear Pantry
          </button>
        </div>
      </div>

      {/* Dropzone when no photo is loaded yet */}
      {!previewUrl && !hasResults && !isBrewingCauldronVisible && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`witch-well flex flex-col items-center justify-center gap-2 border-dashed px-4 py-5 text-center transition-colors ${
            isDragOver
              ? 'border-[#6fe08a] bg-[#2a173e]'
              : 'border-[#5a3b7c]'
          }`}
        >
          <p className="text-xl text-[#f1e8d8]">
            Drop a shelf or ingredient flat-lay photo here, or press{' '}
            <span className="text-[#6fe08a]">Upload Ingredient Photo</span> above.
          </p>
          <p className="text-sm text-[#c2b3d9]">
            Resized in-browser · Never stored or logged · Automatically identifies items, adds to pantry &amp; brews recipe
          </p>
        </div>
      )}

      {/* Error State */}
      {errorMsg && (
        <div
          role="alert"
          className="witch-well border-[#ff7a6b] px-3 py-2 text-base text-[#ff7a6b]"
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
                    className="h-24 w-24 shrink-0 border-2 border-[#0d0714] object-cover"
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
                  <p className="mt-1 truncate text-lg font-bold text-[#f1e8d8]">
                    {selectedFileName ?? 'Sample Pantry Shelf'}
                  </p>
                  <p className="text-base text-[#6fe08a]">
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
                  <p className="text-base text-[#ffc94d]">
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
                  <p className="witch-head text-xs text-[#6fe08a]">
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

                <p className="text-lg text-[#ffc94d]">
                  {isScanning
                    ? 'Scanning your photo & heating the cauldron...'
                    : `Stirring ${detectedIds.length} ingredients into your potion...`}
                </p>
              </div>
            ) : lastBrewedRecipe && dishVisual ? (
              <div className="witch-recipe-reveal flex h-full flex-col justify-between gap-3">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="border-2 border-[#5a3b7c] bg-[#160b24] p-2">
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
                    <h3 className="witch-head mt-1.5 text-sm text-[#ffc94d]">
                      {lastBrewedRecipe.potionName}
                    </h3>
                    <p className="text-xl text-[#f1e8d8]">
                      {lastBrewedRecipe.mealName}
                    </p>
                  </div>
                </div>

                <ol className="flex list-decimal flex-col gap-1 pl-5 text-base text-[#f1e8d8]">
                  {lastBrewedRecipe.steps.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ol>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <span className="text-sm text-[#6fe08a]">
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
              <div className="flex h-full flex-col items-center justify-center py-6 text-center text-base text-[#c2b3d9]">
                Upload a photo to watch the Brewing Cauldron stir up your recipe.
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

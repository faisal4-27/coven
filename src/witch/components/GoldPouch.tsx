import { useState } from 'react';
import { PixelSprite } from '../pixel/PixelSprite';
import { POUCH_PIXEL_SPRITE } from '../pixel/palette';

export interface GoldPouchProps {
  gold: number;
  mixCost: number;
  onGoldChange: (nextGold: number) => void;
}

export function GoldPouch({ gold, mixCost, onGoldChange }: GoldPouchProps) {
  // Keep raw string state while focused/typing so partial decimals like "10." or ""
  // are never overwritten mid-keystroke.
  const [rawInput, setRawInput] = useState<string>(() => String(gold));
  const [isFocused, setIsFocused] = useState(false);

  const displayedValue = isFocused ? rawInput : String(gold);
  const remaining = Math.round((gold - mixCost) * 100) / 100;
  const overBudget = remaining < 0;

  const handleChange = (nextText: string) => {
    setRawInput(nextText);

    const trimmed = nextText.trim();
    if (trimmed === '') {
      onGoldChange(0);
      return;
    }

    const parsed = Number(trimmed);
    if (Number.isFinite(parsed) && parsed >= 0) {
      onGoldChange(parsed);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const trimmed = rawInput.trim();
    const parsed = Number(trimmed);
    if (trimmed === '' || !Number.isFinite(parsed) || parsed < 0) {
      const safe = Math.max(0, gold);
      setRawInput(String(safe));
      onGoldChange(safe);
    }
  };

  return (
    <section
      className="witch-panel flex flex-col gap-3 p-4"
      aria-labelledby="witch-gold-heading"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <PixelSprite grid={POUCH_PIXEL_SPRITE} pixelSize={3} label="Gold pouch" />
          <h3 id="witch-gold-heading" className="witch-head text-xs text-[#ffc94d]">
            Gold Pouch (CAD)
          </h3>
        </div>
        <span className="text-base text-[#c2b3d9]">Owned items = $0.00</span>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="witch-gold-input" className="text-lg text-[#f1e8d8]">
          Available grocery budget ($)
        </label>
        <input
          id="witch-gold-input"
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={displayedValue}
          onFocus={() => {
            setRawInput(String(gold));
            setIsFocused(true);
          }}
          onBlur={handleBlur}
          onChange={(e) => handleChange(e.target.value)}
          className="witch-input w-full"
          aria-describedby="witch-gold-summary witch-gold-note"
        />
      </div>

      <div
        id="witch-gold-summary"
        className="witch-well flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-lg"
      >
        <span>
          Extra mix cost:{' '}
          <strong className="text-[#ffc94d]">${mixCost.toFixed(2)}</strong>
        </span>
        <span className={overBudget ? 'text-[#ff7a6b] font-bold' : 'text-[#6fe08a]'}>
          {overBudget
            ? `Short by $${Math.abs(remaining).toFixed(2)}`
            : `Remaining: $${remaining.toFixed(2)}`}
        </span>
      </div>

      {overBudget && (
        <p role="alert" className="text-base text-[#ff7a6b]">
          Unowned ingredients exceed your Gold Pouch. Mark items you already own or adjust your mix before stirring.
        </p>
      )}

      <p id="witch-gold-note" className="text-base text-[#c2b3d9]">
        All prices shown are approximate illustrative estimates, not verified retailer prices.
      </p>
    </section>
  );
}


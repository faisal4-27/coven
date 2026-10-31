import type { Allergen } from '../types';

const DIET_OPTIONS: ReadonlyArray<{ id: Allergen; label: string }> = [
  { id: 'egg', label: 'No eggs' },
  { id: 'dairy', label: 'No dairy' },
  { id: 'peanut', label: 'No peanuts' },
  { id: 'gluten', label: 'No gluten' },
];

export interface DietChipsProps {
  avoided: readonly Allergen[];
  onToggle: (allergen: Allergen) => void;
}

export function DietChips({ avoided, onToggle }: DietChipsProps) {
  return (
    <section
      className="witch-panel flex flex-col gap-3 p-4"
      aria-labelledby="witch-diet-heading"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 id="witch-diet-heading" className="witch-head text-xs text-[#ff7a1a]">
          Dietary Wards
        </h3>
        {avoided.length > 0 && (
          <span className="text-base text-[#ff5a36]">
            {avoided.length} active
          </span>
        )}
      </div>

      <div
        role="group"
        aria-label="Dietary restrictions and allergen filters"
        className="flex flex-wrap gap-2"
      >
        {DIET_OPTIONS.map((opt) => {
          const isPressed = avoided.includes(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              aria-pressed={isPressed}
              onClick={() => onToggle(opt.id)}
              className="witch-chip"
            >
              <span>{isPressed ? '[X]' : '[ ]'}</span>
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>

      <p className="text-base text-[#d6b69c]">
        Reminder: simplified allergen tags are for planning convenience only and are not a food-safety guarantee. Always verify ingredient labels independently.
      </p>
    </section>
  );
}


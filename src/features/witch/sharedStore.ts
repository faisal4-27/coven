import { useCoven } from '../../shared/store';
import type { Ingredient } from './types';

/**
 * Writes the student's confirmed pantry ingredients into Coven's shared Zustand store
 * (`src/shared/store.ts` -> `pantry`), so Zombie Mode and other features can read it.
 *
 * This is the ONLY Witch module permitted to write to shared state.
 */
export function writePantryToSharedStore(pantry: Ingredient[]): void {
  try {
    const state = useCoven.getState();
    if (typeof state.setPantry === 'function') {
      state.setPantry(pantry);
    }
  } catch {
    // Fail safely if called in an isolated test or non-store environment.
  }
}


# Witch Mode — Potion Overflow (`src/witch/`)

**Owner:** Person 4  
**Monster Identity:** Hob / Witch (*Potion Overflow*, route `/hob`, `monster="hob"`)  
**Real Student Need:** Food affordability, limited shelf ingredients, dietary restrictions, and fitting meals into tight timetable gaps.

---

## 1. What Witch Mode Does

**Potion Overflow** is a retro RPG pixel-art cooking game combined with a student meal planner:

- **Brewing Cauldron & Pantry Shelf:** Students toggle owned ingredients (`$0` additional cost, starting with `Eggs`, `Bread`, and `Rice`) or drop any of 20 pixel-art ingredients into a bubbling 16-column cauldron and press **STIR!** to discover 17 potions.
- **Dynamic Pixel-Art Dishes:** Dish sprites (`toast`, `cup`, `bowl`, `plate`, `soup`) recolor dynamically from each recipe's primary non-base ingredients.
- **Gold Pouch & Gap Picker:** Tracks approximate grocery budget (CAD, any nonnegative decimal) and compares recipe prep times against 10 / 20 / 40 / 60 / 90-minute gaps while distinguishing campus-packable vs. home-cooked meals.
- **Dietary Wards:** Persistent allergen filters (`No eggs`, `No dairy`, `No peanuts`, `No gluten`) grey out restricted items, purge them from the cauldron, and exclude incompatible recipes.
- **AI Pantry Scanner (`Scrying Orb`):** Resizes uploaded/captured shelf photos in-browser (`<= 1024px`, JPEG `0.8`), calls `/api/scan-pantry`, and gracefully falls back to a clearly labeled cached demo scan when offline or unconfigured.
- **Exam Week Kitchen:** Switches between **Focus Mode** (quick portable study-break snacks) and **Wind-Down Mode** (relaxed evening meals and overnight prep).
- **Magical Potion Codex:** Tracks player rank (`Apprentice`, `Hedge Witch`, `Brewmaster`, `Archwitch`) and unlocks discovered recipes across sessions.

---

## 2. Folder & Component Structure

```text
src/witch/
├── index.ts                  # Public feature barrel exports
├── types.ts                  # Feature types + re-exports of shared Ingredient & MealSuggestion
├── ingredients.ts            # 20 ingredients, illustrative CAD prices, allergens, synonym matcher
├── recipes.ts                # 17 potion recipes with steps, prep minutes, packability & tags
├── brew.ts                   # Pure brewing engine: matchMix, costOfMix, rankForFound
├── logic.ts                  # Public contracts: scanPantry, suggestMeal, suggestExamSnack + persistence
├── dining.ts                 # Campus ingredient lookup utilities
├── mocks.ts                  # Mock helpers for offline/cross-team testing
├── sharedStore.ts            # Single adapter writing confirmed pantry into src/shared/store.ts
├── data/dining.json          # Placeholder UofT campus dining/grab-and-go tag dataset
├── pixel/                    # Pure SVG pixel-art rendering system (palette, icons, dishes, cauldron)
├── components/               # WitchPage, Cauldron, PantryShelf, ResultModal, Codex, GapPicker,
│                             # GoldPouch, DietChips, PantryScanner, ExamMode, PantryPreview
├── styles/witch.css          # Scoped styles (.witch-root) + Press Start 2P / VT323 font import
└── api-draft/scan-pantry.ts  # Serverless vision endpoint draft (move to /api/scan-pantry.ts)
```

---

## 3. Exported Functions & Components (`src/witch/index.ts`)

- **Components:** `WitchPage`, `PantryPreview`
- **Core Contracts:**
  - `scanPantry(image: File): Promise<Ingredient[]>`
  - `suggestMeal(pantry: Ingredient[], minutesFree: number, opts?: { lowEffort?: boolean }): Promise<MealSuggestion[]>`
  - `suggestExamSnack(kind: "focus" | "wind-down", pantry: Ingredient[]): PotionRecipe[]`
- **Mocks:** `mockScanPantry`, `mockSuggestMeal`, `mockSuggestExamSnack`, `MOCK_PANTRY_INGREDIENTS`, `MOCK_MEAL_SUGGESTIONS`

---

## 4. How Pantry Scanning Works & Privacy

1. Client validates `image/jpeg`, `image/png`, or `image/webp`, downscales to max `1024px` on an ephemeral `<canvas>`, encodes JPEG (`0.8`), and revokes temporary blob URLs immediately after confirmation.
2. Client sends `{ imageBase64, mimeType }` via `POST /api/scan-pantry` (10s timeout).
3. Server draft (`api-draft/scan-pantry.ts`) rejects payloads `> 4 MB`, queries Gemini Vision (`GEMINI_API_KEY`) for visible ingredients from the 20 supported items, normalizes/deduplicates up to 25 items, and never logs or stores images.
4. When `/api/scan-pantry` is not deployed or `GEMINI_API_KEY` is unset, both server and client fall back to cached demo items (`Eggs, Rice, Bread, Onion, Tomato, Peanut butter, Spinach, Oats`) with `source: "cached"` clearly shown to the user.

---

## 5. What Uses Mock / Placeholder Data

- **Ingredient prices (`ingredients.ts`):** Approximate illustrative student CAD portion estimates, never verified retailer pricing.
- **Campus dining (`data/dining.json`):** All 7 campus spots, hours, and items are explicitly marked `PLACEHOLDER` (`priceCad: 0`) until verified menus are scraped.
- **Fallback pantry scan:** Cached 8-item demo pantry when `/api/scan-pantry` or `GEMINI_API_KEY` is unavailable.

---

## 6. Local Persistence & Shared State

- **LocalStorage key:** `coven.witch.v1` (wrapped in `try/catch`). Stores `owned`, `discovered`, `cooked`, `gold`, and `avoided`. Never stores photos.
- **Shared Zustand store:** `sharedStore.ts` calls `useCoven.getState().setPantry(pantry)` whenever confirmed owned ingredients change.

---

## 7. Required Integration Points, Env Vars & Team Coordination

- **Router (`src/app/App.tsx` — coordinate with Person 1):** Swap `<ComingSoon monster="hob" />` on `/hob` to render `<WitchPage />` (`Hob` and `Witch` represent the same Person 4 monster slice).
- **Home / Zombie Dashboard (`src/app/routes/Picker.tsx` & `src/features/zombie` — coordinate with Person 1 & Person 2):** Mount `<PantryPreview />` alongside `<RoutePreview />`, and import `suggestMeal` from `src/witch` for Zombie low-effort meal planning.
- **Serverless API (`/api/scan-pantry.ts` — team approval):** Move `src/witch/api-draft/scan-pantry.ts` to `/api/scan-pantry.ts` at repo root.
- **Environment Variables (Vercel / `.env.local` server-side):**
  - `GEMINI_API_KEY` — Google Gemini API key for server-side pantry vision scanning.
  - `GEMINI_MODEL` *(optional)* — Defaults to `gemini-2.5-flash`.


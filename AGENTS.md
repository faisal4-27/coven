# Coven

A survival planner for UofT's monsters. Pick your monster, and Coven plans your UofT day around your curse, your deadlines, your route, and your food.

Halloween on the outside, accessibility on the inside. Every monster maps to a real student need.

This file is the source of truth for anyone (human or coding agent) working in this repo. Read it fully before writing code.

---

## 1. The pitch

| Monster | Curse | Real student need |
|---|---|---|
| Vampire | Burns in sunlight | Light sensitivity, migraines, getting around campus in harsh weather |
| Banshee | Wails before doom arrives, so she always sees it coming | Deadline pileups, the weeks where assignments, tests and labs all land together |
| Hob | A kitchen spirit that cooks whatever scraps are left on the shelf | Budget meal planning around a packed timetable |
| Zombie | Has been shuffling around Robarts since midterms started, barely moving | Burnout and exam week, days where you need the easiest possible plan |

Demo arc. Open as a goofy Halloween app, show each monster working on real UofT data, finish with Zombie mode reorganizing the whole day in one click, then reveal the accessibility slide ("every monster here is a real UofT student").

---

## 2. Team and ownership

Each person owns one full vertical slice, UI plus logic. Stay inside your own folder unless a change is agreed with the team.

| Person | Feature | Route | Folder |
|---|---|---|---|
| Person 1 | Vampire routing, plus the lightweight shell (hours 0 to 2 only) | `/vampire` and `/` | `src/features/vampire`, `src/app`, `src/shared/ui` |
| Person 2 | Zombie mode, which is also the home screen content | `/zombie` | `src/features/zombie` |
| Person 3 | Banshee crunch moons | `/banshee` | `src/features/banshee` |
| Person 4 | Hob pantry, plus indoor campus mapping and the pitch deck | `/hob` | `src/features/hob` |

---

## 3. Tech stack

- Vite, React 19, TypeScript (strict), Tailwind v4 via `@tailwindcss/vite` (theme tokens live in `src/index.css`, no config file)
- React Router 7 (`react-router-dom`) for the four feature routes
- Zustand for shared app state (`src/shared/store.ts`)
- Clerk (`@clerk/react` v6) for sign up and sign in, see section 3.1
- Leaflet + `react-leaflet` for maps. Geometry (shadow hulls, point in polygon) is hand-rolled in `src/features/vampire/shadows.ts`, no turf
- `suncalc` v2 for sun position and moon phase. **v2 is ESM with named imports and returns degrees, azimuth clockwise from north.** Old v1 examples (radians, south-based azimuth, default import) are wrong
- `pdfjs-dist` for syllabus text extraction in the browser
- LLM calls go through Vercel serverless functions in `api/` so keys never reach the browser
- Deployed on Vercel

### 3.1 Auth

- Clerk, configured with `VITE_CLERK_PUBLISHABLE_KEY` in `.env.local` (and in Vercel env vars). Never commit it. `.env.example` lists it.
- No key means **demo mode**. Sign up and sign in open a pixel dialog that just asks for a name and stores it in `localStorage`. The demo can never break on missing keys or venue Wi-Fi.
- Everything goes through `src/shared/auth.tsx`: `AuthProvider`, `AuthButtons` (landing CTAs), `AccountButton` (header avatar or sign out), `RequireAuth` (route guard). Features read the user from the store (`useCoven((s) => s.user)`), never from Clerk directly.
- Clerk modals are restyled through the `appearance` object in `auth.tsx` and sit in the `clerk` CSS layer so Tailwind doesn't fight them.

---

## 4. Repo structure

```
/
├── AGENTS.md
├── api/                      # serverless functions (LLM calls only)
│   ├── extract-syllabus.ts   # Person 3
│   ├── scan-pantry.ts        # Person 4
│   └── draft-message.ts      # Person 3
├── public/data/
│   ├── indoor-graph.json     # hand-mapped indoor connections (Person 4)
│   ├── massing-stgeorge.geojson  # clipped Toronto 3D Massing, 1,189 footprints (Person 1, done)
│   └── dining.json           # small dining/café menu file (Person 4)
├── scripts/
│   └── clip-massing.py       # regenerates massing-stgeorge.geojson from the City shapefile
└── src/
    ├── app/                  # shell, router, landing scenery (Person 1)
    │   ├── App.tsx           # routes. Swap a ComingSoon element for your page when it lands
    │   └── routes/           # Landing, Picker (monster picker), ComingSoon placeholder
    ├── shared/
    │   ├── types.ts          # shared contracts, see section 5
    │   ├── store.ts          # shared app state
    │   ├── mocks.ts          # fake versions of every contract
    │   ├── tokens.ts         # design tokens + monster copy (name, curse, need, route)
    │   ├── auth.tsx          # Clerk or demo-mode auth, see 3.1
    │   ├── sprites/          # pixel-art sprites as text grids (Person 1)
    │   └── ui/               # shared components (Person 1)
    └── features/
        ├── zombie/
        ├── vampire/
        ├── banshee/
        └── hob/
```

Rule of thumb. If a file is outside your feature folder, ask before editing it. `src/shared/types.ts` changes need a team heads up.

---

## 5. Shared contracts

These are agreed in hours 0 to 2 and then treated as fixed. Every feature exports its logic function plus a preview card. `src/shared/mocks.ts` contains fake versions of every function so nobody is blocked.

```ts
// src/shared/types.ts

export type Monster = "vampire" | "banshee" | "hob" | "zombie";

export interface Assessment {
  id: string;
  course: string;          // "MAT224"
  title: string;           // "Term Test 2"
  type: "test" | "exam" | "assignment" | "lab" | "quiz" | "project" | "other";
  date: string;            // ISO date, "2026-11-18"
  time?: string;           // "18:00"
  weight: number;          // percent of final grade, after "best of" adjustments
  location?: string;       // building code if known, "BA"
  confidence: number;      // 0 to 1, from extraction, low values need user review
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;           // ISO datetime
  end: string;
  buildingCode?: string;
  kind: "class" | "study" | "meal" | "assessment" | "other";
}

export interface CrunchWeek {
  weekStart: string;       // ISO date (Monday)
  load: number;            // sum of weights due that week
  phase: "new" | "waxing-crescent" | "first-quarter" | "waxing-gibbous" | "full";
  assessments: Assessment[];
}

export interface StudyBlock {
  assessmentId: string;
  start: string;
  end: string;
}

export interface RouteResult {
  path: [number, number][];   // [lng, lat]
  distanceM: number;
  durationMin: number;
  sunExposure: number;        // 0 to 1, fraction of route in direct sun
  indoorFraction: number;     // 0 to 1
  steps: string[];            // human readable directions
}

export interface Ingredient {
  name: string;
  quantity?: string;
}

export interface MealSuggestion {
  name: string;
  minutes: number;            // prep time
  effort: "none" | "low" | "medium";
  uses: string[];             // ingredient names from the pantry
  missing: string[];
  whereToGetMissing?: string; // dining hall or café name
}
```

```ts
// Function contracts, one per feature

// Person 1, src/features/vampire/logic.ts
export function getRoute(
  from: string,                // building code
  to: string,
  at: Date,
  opts?: { minimizeWalking?: boolean; avoidSun?: boolean }
): Promise<RouteResult>;

// Person 3, src/features/banshee/logic.ts
export function extractAssessments(file: File, termStart: string): Promise<Assessment[]>;
export function detectCrunchWeeks(items: Assessment[]): CrunchWeek[];
export function planStudy(items: Assessment[], weeks: CrunchWeek[], busy: CalendarEvent[]): StudyBlock[];

// Person 4, src/features/hob/logic.ts
export function scanPantry(image: File): Promise<Ingredient[]>;
export function suggestMeal(
  pantry: Ingredient[],
  minutesFree: number,
  opts?: { lowEffort?: boolean }
): Promise<MealSuggestion[]>;

// Person 2, src/features/zombie/logic.ts
export function planZombieDay(date: Date): Promise<CalendarEvent[]>;
```

```ts
// Preview cards, dropped into the home screen by Person 2 (Zombie)
<RoutePreview />     // Person 1
<CrunchPreview />    // Person 3
<PantryPreview />    // Person 4
```

### Shared state (`src/shared/store.ts`)

- `user` and `authReady`, set by `src/shared/auth.tsx` (`CovenUser` in `types.ts`)
- `monster`, the selected monster
- `assessments`, written by Banshee, read by Zombie
- `events`, the user's classes and planned blocks
- `pantry`, written by Hob, read by Zombie
- `assessments`, `events` and `pantry` persist in localStorage (`coven.data`), so they survive reloads
- `now`, the current time, overridable for the demo so we can fake a full moon week

---

## 6. Features

### 6.1 Vampire, sun-safe routing (Person 1)

Status: working end to end on real data. Notes for whoever touches it:
- Massing is the City's 2025 3D Massing shapefile. Despite the `_WGS84` name its geometry is EPSG:3857, `scripts/clip-massing.py` converts it. "Site Plan" footprints with no height inherit the tallest LiDAR part inside them. Bahen and Myhal are still under-represented, so `massingOverrides` in `campus.ts` adds them back from their OSM outlines.
- The walking graph is authored in a street-aligned local frame (`campus.ts`, metres, St. George centreline is `u = 0`, rotated 16.7°) and calibrated against OSM. Sidewalks sit at `u = ±12`.
- Only the Galbraith to Sandford Fleming indoor link is confirmed. The other indoor edges are placeholders (`verified` unset) until Person 4's `indoor-graph.json` lands.
- Logic: `planRoute()` returns the contract `RouteResult` plus drawable `pieces` (shade, sun, indoor) and the shadow polygons. `getRoute()` is the section 5 contract wrapper.
- Base map is OSM tiles inverted with a CSS filter. CARTO now needs an API key, so don't switch back.
- Demo features: ▶ Time-lapse sweeps the clock to sunset (shadows slide, route re-picks) while a pixel vampire walks the route (`Walker.tsx`, scorched and smoking on sunny stretches). `ExposureStrip.tsx` shows sun exposure per 15 min under the slider, with a "Leave at … for X% sun" suggestion from `planDay()`. The vampire speaks voiced day/night lines.
- Live weather (`weather.ts`, Open-Meteo, no key) is display only: heavy cloud softens the burn meter and UV 6+ adds a light-sensitivity note. Routing and `RouteResult` ignore weather; it hides itself when offline.

Goal. Get between St. George buildings with as little direct sun as possible, using indoor connections, covered walkways and shaded streets.

How it works
1. Clip Toronto 3D Massing to St. George, keep footprint plus height, save as `massing-stgeorge.geojson`.
2. For a given time, get sun azimuth and altitude from `suncalc`.
3. Project each footprint away from the sun by `height / tan(altitude)` to build shadow polygons, union them with turf.
4. Build a walking graph from hand-mapped outdoor edges between the demo buildings plus `indoor-graph.json` edges (indoor edges have zero sun). OSM footways are optional if time allows.
5. Dijkstra with cost `length * (1 + penalty * sunFraction)`. With `minimizeWalking`, penalty drops and length dominates.
6. If the sun is below the horizon, every route is safe. Show a "you're free after 4:47pm" style banner (Toronto winter sunsets are early).

UI. Map, start and end building pickers, time slider, sun exposure score, toggle between fastest and shadiest route.

Extra gag. Reflection-free mode as a playful filter for online tutorials.

### 6.2 Banshee, crunch moons (Person 3)

Status: live at `/banshee`. Sample term includes a 65% full-moon week about two weeks out for the demo. PDF reader loads on demand. Extension drafts use `api/draft-message.ts` with a built-in template fallback. Needs `OPENAI_API_KEY` on Vercel for PDF extraction and tailored drafts.

Goal. Turn syllabi into a term view where heavy weeks show up as approaching full moons, then plan study time early so students are productive before the crunch.

How it works
1. Student uploads one syllabus PDF per course and enters term start date and tutorial day.
2. `pdfjs-dist` extracts text. Scanned PDFs are out of scope for this build.
3. `api/extract-syllabus.ts` sends text to an LLM with a strict JSON schema and returns `Assessment[]`.
4. Student reviews a confirmation list. Low `confidence` rows are highlighted.
5. `detectCrunchWeeks` sums weights per week and maps load to a moon phase.
6. `planStudy` allocates roughly one hour of study per percent of weight, spreads it across the 2 to 3 weeks before each deadline, and moves blocks earlier if they would fall inside another full moon.
7. `api/draft-message.ts` drafts an extension request or a "can we move our meeting" message when a clash cannot be avoided, plus a reminder that the ACORN Absence Declaration exists.

Watch for
- Relative dates ("Week 7", "in tutorial"), convert using term start and tutorial day.
- "Best of" rules ("best 4 of 5 quizzes"), adjust weight accordingly.
- Use three real, pre-tested syllabi for the demo.

UI. Term timeline as a row of moons with a countdown to the next full one, week detail view, generated study blocks on a calendar.

### 6.3 Hob, kitchen scraps (Person 4)

Goal. Scan your shelf and get meals that fit the gaps in your timetable and your budget.

How it works
1. Camera capture or image upload.
2. `api/scan-pantry.ts` sends the image to a vision LLM and returns `Ingredient[]`.
3. `suggestMeal` takes ingredients plus free minutes and returns scrap recipes (real recipes, teas, snacks).
4. Missing ingredients are matched against `dining.json` so the app can say where on campus to grab them.
5. Exam mode suggests focus snacks for late study sessions and wind-down teas for after.

Also owned by Person 4
- In the first 45 minutes, walk the demo route and write `indoor-graph.json`, then hand it to Person 1.
- Pitch deck, accessibility reveal slide, backup demo video.

### 6.4 Zombie, low-energy day (Person 2)

Mount point: `/zombie` currently renders `ComingSoon`. `<RoutePreview />` from `src/features/vampire/RoutePreview.tsx` is ready and already shown on the picker.

Goal. One click turns your day into the easiest possible version of itself. This is the finale of the demo and the home screen.

How it works
1. Reads `assessments` and `events` from shared state.
2. Calls `getRoute` with `minimizeWalking` for every move between buildings.
3. Calls `suggestMeal` with `lowEffort` for each free gap.
4. Keeps only essential classes and study blocks, inserts breaks, and pushes non-urgent study to quieter weeks using the crunch moon data.
5. Shows a before and after view of the day with an animated transition.

UI. Home screen with the monster picker and the three preview cards, plus the Zombie toggle that reorganizes the day.

---

## 7. Data sources

| Data | Source | Notes |
|---|---|---|
| Building heights and footprints | Toronto Open Data, 3D Massing | LiDAR derived, clip to St. George |
| Building names, codes, coordinates | Cobalt datasets on GitHub (`cobalt-uoft/datasets`) | Archived since 2020, building list still mostly accurate |
| Footpaths | OpenStreetMap via Overpass | St. George bounding box |
| Indoor connections | Hand-mapped by the team | Only the 6 to 8 demo buildings |
| Sun and moon | `suncalc` | Computed locally, no API |
| Assessments | Student's syllabus PDFs | Parsed by LLM, confirmed by user |
| Dining menus | Small hand-made JSON | Scrape one or two pages the morning of, or fake it |

Backup building data. UofT Map Library building outlines, Statistics Canada Open Database of Buildings.

---

## 8. Design system

Pixel-art Halloween. Everyone imports from `src/shared/ui`, `src/shared/sprites` and the Tailwind tokens instead of styling from scratch, so the four screens look like one app.

**Palette** (Tailwind names from `@theme` in `src/index.css`, mirrored in `src/shared/tokens.ts` for Leaflet/canvas)

| Token | Hex | Use |
|---|---|---|
| `night` | `#0b0a14` | page background |
| `dusk` | `#13111f` | headers, sidebars |
| `panel` / `panel-hi` | `#1a1730` / `#262142` | cards, inputs |
| `edge` | `#3a3360` | pixel borders |
| `bone` | `#f4ecd8` | body text |
| `ash` | `#9c94b8` | secondary text |
| `moon` | `#f6e7a1` | highlights |
| `vampire` | `#d7263d` | Vampire accent |
| `banshee` | `#9ad1ff` | Banshee accent |
| `hob` | `#ff7a1a` | Hob accent |
| `zombie` | `#a8d84e` | Zombie accent |

Each accent has a `-dark` variant for pressed and shaded states.

**Type.** `font-display` (Pixelify Sans) for headings and buttons, default body is `font-pixel` (VT323, 20px base). Loaded from Google Fonts in `index.html`.

**Pixel rules**
- No border radius, no blur. Borders are 4px hard edges, shadows are hard offsets (`8px 8px 0 #000`). Use `Card` or the `px-border` / `px-shadow` utilities.
- Animations are stepped (`steps()`), never smooth easing. Use the utilities `anim-bob`, `anim-twinkle`, `anim-flap`, `anim-rise`, `anim-smoke`. `prefers-reduced-motion` turns them off globally, and `PixelSprite` stops cycling frames.
- **All avatars and characters go through `PixelSprite`.** Never use an image file for a monster.

**Sprites** (`src/shared/sprites/`). Drawn as text grids, one character per pixel, `.` transparent, with a palette per sprite. Author the left half and `mirror()` it, then `paint()` asymmetric details (the zombie's reaching arm, the hob's spoon). Frames are full grids, usually the base plus a small `paint()` patch (a blink). `monsterSprites[monster]` gives each monster's sprite; `bat`, `tombstone`, `sun` are decor.

**Shared components** (`src/shared/ui`)
- `PixelSprite`, renders a sprite as crisp SVG, animates frames, `tint` to recolor
- `PixelButton` / `PixelLink`, `accent` (monster) and `variant` (`solid`, `ghost`), `size` (`md`, `lg`)
- `Card`, pixel panel, optional `accent` border
- `PageHeader`, every feature page starts with `<PageHeader monster="hob" title=… subtitle=…/>`. It includes the account button
- `MoonIcon`, pixel moon for a `CrunchWeek['phase']` (Banshee)
- `Loading` (flapping bat), `EmptyState` (tombstone)
- `Starfield`, twinkling background

Every screen has a loading state and an empty state, the demo cannot show a blank screen. Mobile friendly down to 400px, judges may open it on a phone.

**Performance rules** (measured, these were real lag sources)
- No `setInterval` + `setState` animation loops. `PixelSprite` animates frames purely in CSS; a dozen React-driven sprites caused constant stutter.
- Heavy computation goes in a Web Worker (see `src/features/vampire/exposure.worker.ts`), never on the main thread during input.
- Don't render hundreds of Leaflet `Polygon`s. Draw bulk geometry with `CanvasRings` (one canvas path, no `closePath()` per ring).
- The dev server is several times slower than production because of React's dev instrumentation. Judge smoothness, and run the demo, on `npm run build && npm run preview`.


### Sound

8-bit chiptune, deliberately quiet so the presenter can talk over it. `src/shared/sound.ts` owns it: nothing plays until the first click or key press, muting (top-right speaker, persisted) stops everything, and a missing or broken file is skipped silently. Files live in `public/sfx/<name>.mp3`. The current ones are placeholders from `scripts/make-sfx.py`; drop in a better file with the same name and nothing else changes.

| Name | For |
|---|---|
| `banshee`, `hob`, `zombie` | Each monster's own sound (picker hover and select, feature page arrival). The vampire is deliberately silent |
| `banshee-moon` | Banshee, a full moon or crunch week appears |
| `hob-meal` | Hob, meal suggestions finished loading |
| `zombie-reorganize` | Zombie, the day was reorganized |
| `seance-summon` | Seance starts (later) |
| `click`, `transition`, `success`, `error`, `blip` | UI. Shared buttons click on their own (pass `silent` to opt out), route changes play `transition`, `ErrorState` plays `error` |
| `ambient` | 30 s night loop, starts after the first interaction at volume 0.15 |

In a feature:

```ts
const { play } = useSound() // import { useSound } from '../../shared/sound'
useEffect(() => { if (weeks.some((w) => w.phase === 'full')) play('banshee-moon', { volume: 0.5 }) }, [weeks])
```

- Banshee plays `banshee-moon` when a full moon week appears. Hob plays `hob-meal` when suggestions load. Zombie plays `zombie-reorganize` when the day reorganizes. Each may also play its own monster sound once on page mount.
- Keep volumes at 0.5 or below. Play on results that actually change, not on every render; `play` ignores repeats within 120 ms and takes a `cooldown` option for more.
- `monsterBlip(monster)` is a pitched text blip for dialogue.

---

## 9. Timeline (5 hours)

Five hours is tight. Mocks first, real data second, polish last. Anything not working by the 3h45 freeze gets its fallback from section 10.

| Time | Everyone | Person 1 |
|---|---|---|
| 0h00 to 0h30 | Agree contracts, scaffold repo, pick demo route, demo date and demo syllabi | Shell, router, tokens, shared UI, store and mocks pushed by 0h30 |
| 0h30 to 2h30 | Build feature on mock data. Person 4 maps the indoor graph in the first 45 minutes | Clip massing data, shadow polygons, routing graph, map UI |
| 2h30 | Integration check, every route loads in the shell and reads shared state | Real indoor graph plugged in, real `getRoute` exposed to Zombie |
| 2h30 to 3h45 | Real data replaces mocks, fix integration bugs. Person 4 builds the deck | Route scoring, time slider, sun exposure score, sunset banner, `<RoutePreview />` |
| 3h45 | Feature freeze. Preview cards handed to Person 2 | Same |
| 3h45 to 4h30 | Rehearse the demo on the exact data, record the backup video | Same |
| 4h30 to 5h00 | Buffer and submission | Same |

### Scope cuts for 5 hours

- Vampire routes over a hand-built graph of the 6 to 8 demo buildings (outdoor edges plus indoor edges), not the full OSM network. Shadows are only computed for those edges.
- Banshee handles text PDFs only. Scanned PDFs are future work.
- Hob skips Coven sharing.
- Zombie can ship with mock data from any feature that isn't ready.
- Reflection-free mode is cut unless everything else is done.

---

## 10. Fallbacks

- Shadow computation too slow or buggy, precompute shadows for 3 or 4 times of day and ship them as static GeoJSON.
- Syllabus extraction unreliable, preload confirmed `Assessment[]` for the three demo syllabi.
- Pantry scan unreliable, use a pre-photographed shelf with a known result.
- LLM API down, every `api/` function returns a cached response for demo inputs.
- Any feature not ready, its preview card shows mock data so the home screen still works.

---

## 11. Demo script (3 minutes)

1. Home screen, pick Vampire. Route from Bahen to Robarts at midday, watch it hug indoor connections and shade.
2. Switch to Banshee. Upload a syllabus, watch the term turn into a row of moons, the next full moon is two weeks out, study blocks appear in the quiet weeks before it.
3. Switch to Hob. Scan a real shelf, a meal fits the 40 minute gap between classes, with the missing ingredient available at a nearby café.
4. Switch to Zombie. One click, the whole day reorganizes into the lowest-effort version.
5. Reveal slide. Every monster is a real UofT student. Light sensitivity, deadline pileups, tight budgets, burnout.

---

## 12. Conventions for agents and humans

- TypeScript strict mode. No `any` in shared types.
- Never call an LLM from the browser. Use `api/` functions.
- Never commit API keys. Use Vercel environment variables.
- Keep feature logic in `logic.ts` and UI in components, so Zombie mode can import logic without pulling in UI.
- Every async function used by another feature must have a matching mock in `src/shared/mocks.ts` that returns realistic sample data.
- Do not edit another person's feature folder without asking.
- Small commits, pull often, merge to `main` only when the app still builds.
- Privacy. Pantry photos and syllabi are processed and discarded, nothing is stored server side.

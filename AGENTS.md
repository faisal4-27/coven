# Coven

A survival planner for UofT's monsters. Pick your monster, and Coven plans your UofT day around your curse, your deadlines, your route, and your food.

Halloween on the outside, accessibility on the inside. Every monster maps to a real student need.

This file is the source of truth for anyone (human or coding agent) working in this repo. Read it fully before writing code.

---

## 1. The pitch

| Monster | Curse | Real student need |
|---|---|---|
| Vampire | Burns in sunlight | Light sensitivity, migraines, getting around campus in harsh weather |
| Werewolf | Transforms on the full moon | Deadline pileups, the weeks where assignments, tests and labs all land together |
| Witch | Needs ingredients for potions | Budget meal planning around a packed timetable |
| Zombie | Low energy, slow moving | Burnout and exam week, days where you need the easiest possible plan |

Demo arc. Open as a goofy Halloween app, show each monster working on real UofT data, finish with Zombie mode reorganizing the whole day in one click, then reveal the accessibility slide ("every monster here is a real UofT student").

---

## 2. Team and ownership

Each person owns one full vertical slice, UI plus logic. Stay inside your own folder unless a change is agreed with the team.

| Person | Feature | Route | Folder |
|---|---|---|---|
| Person 1 | Vampire routing, plus the lightweight shell (hours 0 to 2 only) | `/vampire` and `/` | `src/features/vampire`, `src/app`, `src/shared/ui` |
| Person 2 | Zombie mode, which is also the home screen content | `/zombie` | `src/features/zombie` |
| Person 3 | Werewolf crunch moons | `/werewolf` | `src/features/werewolf` |
| Person 4 | Witch pantry, plus indoor campus mapping and the pitch deck | `/witch` | `src/features/witch` |

---

## 3. Tech stack

- Vite, React, TypeScript, Tailwind
- React Router for the four feature routes
- Zustand (or React context) for shared app state
- Leaflet or MapLibre for maps, `@turf/turf` for geometry
- `suncalc` for sun position and moon phase
- `pdfjs-dist` for syllabus text extraction in the browser
- LLM calls go through Vercel serverless functions in `api/` so keys never reach the browser
- Deployed on Vercel

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
│   ├── buildings.json        # UofT buildings (from Cobalt datasets)
│   ├── indoor-graph.json     # hand-mapped indoor connections (Person 4)
│   ├── massing-stgeorge.geojson  # clipped Toronto 3D Massing (Person 1)
│   ├── footpaths.geojson     # optional OSM footways for St. George (Person 1)
│   └── dining.json           # small dining/café menu file (Person 4)
└── src/
    ├── app/                  # shell, router, monster picker (Person 1)
    ├── shared/
    │   ├── types.ts          # shared contracts, see section 5
    │   ├── store.ts          # shared app state
    │   ├── mocks.ts          # fake versions of every contract
    │   ├── tokens.ts         # design tokens
    │   └── ui/               # shared components (Person 1)
    └── features/
        ├── zombie/
        ├── vampire/
        ├── werewolf/
        └── witch/
```

Rule of thumb. If a file is outside your feature folder, ask before editing it. `src/shared/types.ts` changes need a team heads up.

---

## 5. Shared contracts

These are agreed in hours 0 to 2 and then treated as fixed. Every feature exports its logic function plus a preview card. `src/shared/mocks.ts` contains fake versions of every function so nobody is blocked.

```ts
// src/shared/types.ts

export type Monster = "vampire" | "werewolf" | "witch" | "zombie";

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

// Person 3, src/features/werewolf/logic.ts
export function extractAssessments(file: File, termStart: string): Promise<Assessment[]>;
export function detectCrunchWeeks(items: Assessment[]): CrunchWeek[];
export function planStudy(items: Assessment[], weeks: CrunchWeek[], busy: CalendarEvent[]): StudyBlock[];

// Person 4, src/features/witch/logic.ts
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

- `monster`, the selected monster
- `assessments`, written by Werewolf, read by Zombie
- `events`, the user's classes and planned blocks
- `pantry`, written by Witch, read by Zombie
- `now`, the current time, overridable for the demo so we can fake a full moon week

---

## 6. Features

### 6.1 Vampire, sun-safe routing (Person 1)

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

### 6.2 Werewolf, crunch moons (Person 3)

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

### 6.3 Witch, pantry potions (Person 4)

Goal. Scan your shelf and get meals that fit the gaps in your timetable and your budget.

How it works
1. Camera capture or image upload.
2. `api/scan-pantry.ts` sends the image to a vision LLM and returns `Ingredient[]`.
3. `suggestMeal` takes ingredients plus free minutes and returns "potions" (real recipes, teas, snacks).
4. Missing ingredients are matched against `dining.json` so the app can say where on campus to grab them.
5. Exam mode suggests focus potions for late study sessions and sleep draughts for after.

Also owned by Person 4
- In the first 45 minutes, walk the demo route and write `indoor-graph.json`, then hand it to Person 1.
- Pitch deck, accessibility reveal slide, backup demo video.

### 6.4 Zombie, low-energy day (Person 2)

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

Person 1 publishes `src/shared/tokens.ts` and `src/shared/ui/` in the first two hours. Everyone imports from these instead of styling from scratch so the four screens look like one app.

- Dark theme by default, one accent color per monster (vampire red, werewolf silver, witch green, zombie sickly yellow-green)
- Shared components, `Button`, `Card`, `PageHeader`, `MoonIcon`, `Loading`, `EmptyState`
- Every screen has a loading state and an empty state, the demo cannot show a blank screen
- Mobile friendly, judges may open it on a phone

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
- Werewolf handles text PDFs only. Scanned PDFs are future work.
- Witch skips Coven sharing.
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
2. Switch to Werewolf. Upload a syllabus, watch the term turn into a row of moons, the next full moon is two weeks out, study blocks appear in the quiet weeks before it.
3. Switch to Witch. Scan a real shelf, a meal fits the 40 minute gap between classes, with the missing ingredient available at a nearby café.
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

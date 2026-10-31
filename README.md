# Coven

**A survival planner for UofT's monsters.** Pick your monster, and Coven plans your UofT day around your curse, your deadlines, your route and your food.

Halloween on the outside, accessibility on the inside. Every monster maps to a real student need.

**Live demo: [coven-henna.vercel.app](https://coven-henna.vercel.app/)**

> Building on this repo, human or coding agent? Read [`AGENTS.md`](./AGENTS.md) first. It is the source of truth for contracts, ownership, design rules and conventions. This README is the short version.

---

## The monsters

| Monster | Curse | Real student need | Route |
|---|---|---|---|
| Vampire | Burns in sunlight | Light sensitivity, migraines, getting around campus in harsh weather | `/vampire` |
| Banshee | Wails before doom arrives, so she always sees it coming | Deadline pileups, weeks where assignments, tests and labs all land together | `/banshee` |
| Hob | A kitchen spirit that cooks whatever scraps are left on the shelf | Budget meal planning around a packed timetable | `/hob` |
| Zombie | Has been shuffling around Robarts since midterms started | Burnout and exam week, days where you need the easiest possible plan | `/zombie` |

### What each one does

- **Vampire, sun-safe routing.** Computes building shadows from the sun's position and routes between St. George buildings with as little direct sun as possible, using indoor connections, covered walkways and shaded streets. Includes a time slider, a sun exposure score, a fastest vs shadiest toggle and a "you're free after sunset" banner.
- **Banshee, crunch moons.** Upload syllabus PDFs and the term becomes a row of moons. Heavy weeks show up as approaching full moons, and study blocks are scheduled early in the quiet weeks before them. Drafts extension-request messages when a clash can't be avoided.
- **Hob, kitchen scraps.** Scan your shelf and get meals that fit the gaps in your timetable and your budget, with missing ingredients matched to places to grab them on campus.
- **Zombie, low-energy day.** One click turns your day into the easiest possible version of itself: minimal walking, low-effort meals, essential classes only, and non-urgent study pushed to quieter weeks. It is also the home screen.

---

## Quick start

```bash
git clone <repo-url>
cd coven
npm install
cp .env.example .env.local   # then fill in the keys you have (all optional, see below)
npm run dev
```

For the smoothest experience, and for demos, use a production build. The dev server is several times slower because of React's dev instrumentation:

```bash
npm run build && npm run preview
```

### Environment variables

| Variable | Where | What it does |
|---|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | `.env.local` and Vercel | Enables Clerk sign up and sign in. |
| `OPENAI_API_KEY` | Vercel (server only) | Used by `api/` functions for syllabus extraction and tailored message drafts. |

Nothing breaks without keys:

- **No Clerk key** means **demo mode**. Sign up and sign in open a pixel dialog that asks for a name and stores it in `localStorage`.
- **No LLM key** means the `api/` functions fall back to cached or template responses for demo inputs.

Never commit keys. `.env.example` lists what is expected. LLM calls always go through `api/` serverless functions, never from the browser.

### Regenerating data and assets

| Script | Purpose |
|---|---|
| `scripts/clip-massing.py` | Regenerates `public/data/massing-stgeorge.geojson` from the City of Toronto 3D Massing shapefile (clipped to St. George). |
| `scripts/make-sfx.py` | Generates the placeholder 8-bit sound effects in `public/sfx/`. Drop in a better file with the same name to replace one. |

---

## Tech stack

- **Vite, React 19, TypeScript (strict)**, **Tailwind v4** via `@tailwindcss/vite` (theme tokens live in `src/index.css`)
- **React Router 7** for the four feature routes
- **Zustand** for shared app state (`src/shared/store.ts`), with assessments, events and pantry persisted to `localStorage`
- **Clerk** (`@clerk/react` v6) for auth, with a no-key demo mode
- **Leaflet** and `react-leaflet` for maps. Shadow geometry is hand-rolled in `src/features/vampire/shadows.ts`
- **suncalc v2** for sun position and moon phase. Note that v2 is ESM with named imports, returns degrees, and measures azimuth clockwise from north
- **pdfjs-dist** for syllabus text extraction in the browser
- **Vercel** for hosting and serverless functions. The app is deployed at [coven-henna.vercel.app](https://coven-henna.vercel.app/), and pushes to `main` redeploy it once the repo is connected to the Vercel project

---

## Project structure

```
/
├── AGENTS.md                 # source of truth for contributors and agents
├── api/                      # serverless functions (LLM calls only)
│   ├── extract-syllabus.ts
│   ├── scan-pantry.ts
│   └── draft-message.ts
├── public/
│   ├── data/                 # buildings, indoor graph, massing GeoJSON, dining menus
│   └── sfx/                  # sound effects
├── scripts/                  # data and asset generators
└── src/
    ├── app/                  # shell, router, landing, monster picker
    ├── shared/               # types, store, mocks, tokens, auth, sprites, ui
    └── features/
        ├── vampire/
        ├── banshee/
        ├── hob/
        └── zombie/
```

Keep feature logic in each feature's `logic.ts` and UI in components, so Zombie mode can import logic without pulling in UI. Every async function used by another feature has a matching mock in `src/shared/mocks.ts`.

---

## Design system

Pixel-art Halloween, shared by all four screens. Import from `src/shared/ui`, `src/shared/sprites` and the Tailwind tokens rather than styling from scratch.

- **Look:** dark theme, one accent per monster (vampire red, banshee pale blue, hob ember orange, zombie sickly green), hard 4px borders and hard offset shadows, no border radius or blur.
- **Type:** Pixelify Sans for headings and buttons, VT323 for body text.
- **Motion:** stepped animations only. `prefers-reduced-motion` disables them.
- **Characters:** every avatar goes through `PixelSprite`. Sprites are text grids, never image files.
- **Sound:** quiet 8-bit chiptune, muted with the top-right speaker and never played before the first click.
- **Every screen** has a loading state and an empty state, and works on mobile down to 400px.

### Performance rules

- No `setInterval` plus `setState` animation loops. Animate in CSS.
- Heavy computation goes in a Web Worker (see `src/features/vampire/exposure.worker.ts`).
- Draw bulk map geometry with `CanvasRings`, not hundreds of Leaflet polygons.

---

## Data sources

| Data | Source |
|---|---|
| Building heights and footprints | Toronto Open Data, 3D Massing (clipped to St. George) |
| Building names, codes, coordinates | Cobalt datasets (`cobalt-uoft/datasets`) |
| Footpaths | OpenStreetMap via Overpass |
| Indoor connections | Hand-mapped by the team |
| Sun and moon | `suncalc`, computed locally |
| Assessments | Student's syllabus PDFs, parsed by an LLM and confirmed by the user |
| Dining menus | Small hand-made JSON in `public/data/dining.json` |

---

## Status

| Feature | State |
|---|---|
| Vampire | Working end to end on real data. Only the Galbraith to Sandford Fleming indoor link is confirmed, the other indoor edges are placeholders until `indoor-graph.json` lands. |
| Banshee | Live. Sample term includes a full-moon week about two weeks out for the demo. Text PDFs only, scanned PDFs are out of scope. |
| Hob | In progress. Scan, meal suggestions and dining matching follow the contracts in `AGENTS.md`. |
| Zombie | In progress. `/zombie` renders a `ComingSoon` placeholder until the page lands. |

When a feature isn't ready, its preview card shows mock data so the home screen still works. See the fallbacks section of `AGENTS.md`.

---

## The 3 minute demo

1. **Vampire.** Route from Bahen to Robarts at midday and watch it hug indoor connections and shade.
2. **Banshee.** Upload a syllabus, watch the term turn into moons, and see study blocks appear before the next full moon.
3. **Hob.** Scan a shelf and get a meal that fits the 40 minute gap between classes.
4. **Zombie.** One click reorganizes the whole day into the lowest-effort version.
5. **Reveal.** Every monster is a real UofT student: light sensitivity, deadline pileups, tight budgets, burnout.

---

## Contributing

Each person owns one vertical slice (UI plus logic) in their own folder. If a file is outside your feature folder, ask before editing it. Changes to `src/shared/types.ts` need a team heads up.

- TypeScript strict mode, no `any` in shared types.
- Small commits, pull often, merge to `main` only when the app still builds.
- Never commit API keys, and never call an LLM from the browser.

## Privacy

Pantry photos and syllabi are processed and discarded. Nothing is stored server side. Shared app data lives only in your browser's `localStorage`.

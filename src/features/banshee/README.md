# Banshee integration

This feature was rebuilt against the updated `Desktop/uoft/coven` shared contracts. Only files inside `src/features/banshee` are provided. No teammate files or routes were changed.

## Shell owner

1. Import the page lazily in `src/app/App.tsx`, matching the Vampire route:

```tsx
const BansheePage = lazy(() => import('../features/banshee/BansheePage'))
```

2. Replace only the Banshee ComingSoon element with:

```tsx
<Route path="/banshee" element={<RequireAuth><Suspense fallback={<Loading label="Reading the moons…" />}><BansheePage /></Suspense></RequireAuth>} />
```

3. Home/Zombie owner imports `CrunchPreview` from `src/features/banshee/CrunchPreview.tsx`.
4. Logic consumers import directly from `logic.ts` so they do not pull in UI or CSS. The index also exports UI, so do not use it for workers.

## Validation

Run at the repository root:

```powershell
npm install
node --experimental-strip-types --test src/features/banshee/logic.test.ts
npm run build
npm run lint
npm run dev
```

Tests require a modern Node version with native TypeScript stripping (tested with Node 26). Nine tests passed in the build chat, including overlap avoidance, busy-event caps, exact shortfalls, real breaks, full-moon avoidance, local date/DST grouping, validation and imports. Dependency installation was blocked by network restrictions there, so a full React build and browser visual QA remain required in VS Code. Do not treat those as passed.

After route integration, verify at `/banshee`: empty state, sample term, add/edit/remove, import review, both study rhythms, daily/weekly view, busy commitments, plan regeneration after changes, calendar apply twice, 400px width, keyboard focus and reduced motion. Existing shared store data lasts only until reload; this feature does not change shared persistence.

## Contracts and scheduling

- Exact shared signatures: `extractAssessments(file, termStart)`, `detectCrunchWeeks(items)`, `planStudy(items, weeks, busy)`.
- `createStudyPlan` adds configurable settings, explicit breaks and unscheduled workload without extending shared `StudyBlock`.
- Planner is invoked in a feature-local Web Worker. `planStudy` is the synchronous contract wrapper using the actual current date; callers needing the shared demo clock should use `createStudyPlan` and `defaultSettings(useCoven.getState().now)`.
- Uses 60 minutes per grade percentage point, at most 21 days before a deadline, local study hours, earliest-deadline round robin, daily caps including pre-existing study, preference for weeks below 60%, and real break reservations. Every fourth session gets a longer break. Every focus session is followed by a break, including the last session.
- Shared calendar writes occur only after Add to calendar. They replace IDs beginning `banshee-plan:` and retain all other events. Breaks use `kind: 'other'`. Busy events with invalid intervals block planning rather than being silently ignored.
- Changing deadlines removes this feature's existing plan so deleted/edited assessments leave no stale generated events. Changing settings or other calendar events invalidates the preview and requires regeneration.
- Deadline time defaults to 23:59, local device time. Workload moons use shared mock thresholds: <15 new, 15 crescent, 30 quarter, 45 gibbous, 60+ full. They are workload indicators, not astronomical moon phases.

## Syllabus scope and remaining backend work

TXT/JSON and pasted explicit deadline lines work locally, with a review step before writing shared assessments. Example:

```text
MAT224 | Term Test 2 | 2026-11-18 | 25%
CSC263 | Assignment | Week 7 | 10%
```

Week N conversion in pasted text requires selecting tutorial day. Week 1 begins on term start; tutorial occurrences use the selected weekday on/after that date. JSON must be an array with course, title, date and numeric weight. The parser is conservative; it does not infer arbitrary prose or automatically adjust best-of rules. Imported records get new IDs; repeated imports are not automatically deduplicated.

 PDFs are text-extracted in the browser with `pdfjs-dist`, then the extracted text, `termStart`, and optional tutorial weekday are sent as JSON to `/api/extract-syllabus`. The endpoint validates a strict `Assessment[]` response from the server-side LLM. Configure `OPENAI_API_KEY` and optionally `OPENAI_MODEL` in the Vercel environment; no API key belongs in the feature or browser bundle. Image-only/scanned PDFs remain out of scope. TXT, JSON, and pasted-text imports continue to work locally. Extension-request drafting is not included because no server endpoint exists.

The original Desktop repository was not modified by the build chat. This is a feature handoff pending installation, full build and visual checks in the user's authorized VS Code repository.

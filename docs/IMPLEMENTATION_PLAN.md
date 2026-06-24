# World Cup Management Simulation — Implementation Plan

**Status:** Phase 0 plan approved for implementation sequencing

**Plan date:** 2026-06-24

**Repository state at planning:** Empty Git repository on `main`, with no commits, source files, package manifest, lockfile, environment files, tests, or remote

**Scope of this document:** Architecture and phased delivery plan only. No Phase 1+ product code has been started.

## 1. Product and delivery principles

The product will be a deterministic, data-driven management simulation for the 48-team 2026 men's international tournament. The match engine, tournament engine, probability models, data pipeline, and UI will be separate modules with explicit schemas and version boundaries.

The implementation will follow these rules:

1. Complete phases in order and do not begin a later phase until the current phase gate is green.
2. Keep official tournament facts separate from generated ratings, model parameters, and save-state data.
3. Treat the simulation event log as the source of truth for scores and match statistics.
4. Use seeded, named pseudo-random streams so past events cannot be rerolled by future tactical changes.
5. Use immutable, versioned tournament/data/model snapshots in saves.
6. Never import real tournament results, cards, injuries, or standings into a new tournament.
7. Mark every estimated data value and retain field-level provenance.
8. Prefer official documents for competition facts and legally reusable sources for derived attributes.
9. Make all validation commands scriptable and CI-compatible.
10. Record incomplete work and failed checks in `docs/IMPLEMENTATION_STATUS.md`.

## 2. Phase 0 architecture decisions

### Application boundary

- Next.js App Router, React, and strict TypeScript will host the browser application and read-only methodology views.
- Domain logic will live in framework-independent TypeScript packages/modules, not React components or route handlers.
- Zustand will own ephemeral active-match UI state; TanStack Query will own cacheable server state.
- Zod schemas will validate all external data, API payloads, configuration, imports, and save files.
- PostgreSQL via Prisma will be the operational database. A SQLite adapter may be added only for local development and cannot define production behavior.
- Guest saves will use IndexedDB, with local storage limited to small preferences or a save index. The cloud-save schema will share the same versioned domain contract.
- Expensive headless simulations and calibration runs will use a worker-compatible engine. Rendering cadence will never advance simulation time.

### Data boundary

The project will maintain four distinct layers:

1. `raw`: cached source artifacts plus retrieval metadata; never consumed directly by the game.
2. `normalized`: canonical identities, positions, fixtures, squads, and source relationships.
3. `derived`: reproducible player/team ratings and simulation inputs tied to model versions.
4. `runtime`: database records and versioned save snapshots.

CSV and Excel exports are products of validated normalized/derived data, not alternate sources of truth. Raw copyrighted documents will not be committed unless redistribution is explicitly permitted.

### Tournament snapshot boundary

The official schedule, regulations, squads, and ranking fallback must be captured as a versioned pre-opening snapshot. FIFA's live tournament pages now include results, so ingestion must explicitly whitelist pre-tournament fields and reject score, standing, card, injury, and result data.

The group list in the brief agrees with FIFA's current official group listing. The Round-of-32 numbering in the brief does **not** agree with FIFA's current official schedule. For example, FIFA lists Match 73 as `2A v 2B`, Match 74 as `1E v third-place A/B/C/D/F`, Match 75 as `1F v 2C`, and Match 76 as `1C v 2F`. Phase 2 must transcribe and independently verify the complete official bracket rather than encode the prompt's conflicting map.

Primary official references identified during Phase 0:

- [FIFA match schedule, fixtures, and stadiums](https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/match-schedule-fixtures-results-teams-stadiums)
- [FIFA group qualification and tie-breakers](https://www.fifa.com/en/articles/groups-how-teams-qualify-tie-breakers)
- [FIFA final squads announcement](https://inside.fifa.com/organisation/media-releases/world-cup-2026-48-squads-confirmed)
- [FIFA Council regulations amendment of 8 May 2026](https://inside.fifa.com/organisation/fifa-council/news/council-update-regulations-world-cup-2026)

Every extracted official fact will retain source URL, publication/retrieval dates, and a source-artifact checksum where lawful.

## 3. Proposed final folder structure

```text
.
├── .github/
│   └── workflows/                 # CI: checks, tests, build, data validation
├── data/
│   ├── raw/                       # Git-ignored/licence-reviewed source cache
│   ├── normalized/                # Validated intermediate records
│   ├── tournament/                # Rules, fixtures, bracket and allocation matrix
│   ├── model/                     # Versioned simulation/rating parameters
│   ├── reports/                   # Data-quality and calibration reports
│   ├── *.csv                      # Required validated seed products
│   └── README.md                  # Data ownership and refresh workflow
├── docs/
│   ├── decisions/                 # Architecture decision records
│   ├── sources/                   # Source register and licensing review
│   ├── ARCHITECTURE.md
│   ├── DATA_DICTIONARY.md
│   ├── DATA_PIPELINE.md
│   ├── DEPLOYMENT.md
│   ├── IMPLEMENTATION_PLAN.md
│   ├── IMPLEMENTATION_STATUS.md
│   ├── KNOWN_LIMITATIONS.md
│   ├── PROBABILITY_MODEL.md
│   ├── RATING_MODEL.md
│   ├── SIMULATION_ENGINE.md
│   ├── TACTICS_MODEL.md
│   ├── TESTING.md
│   └── TOURNAMENT_RULES.md
├── exports/                       # Generated workbook; provenance manifest adjacent
├── prisma/
│   ├── migrations/
│   ├── schema.prisma
│   └── seed.ts
├── public/
│   ├── flags/                     # Approved licensed/public-domain assets only
│   └── patterns/                  # Original visual assets
├── scripts/
│   ├── data/                      # Fetch, normalize, validate, seed, export
│   ├── simulation/                # Match/tournament runners and calibration
│   └── verify/                    # Dataset and tournament integrity checks
├── src/
│   ├── app/                       # App Router pages, layouts, route handlers
│   ├── components/                # Shared accessible UI
│   ├── features/                  # Country, squad, tactics, match, bracket, saves
│   ├── domain/
│   │   ├── match/                 # Event model, state machine, invariants
│   │   ├── probability/           # Prematch/live probability modules
│   │   ├── ratings/               # Player, lineup, and team ratings
│   │   ├── saves/                 # Schemas, migrations, serialization
│   │   ├── tactics/               # Formations, roles, matchup modifiers
│   │   └── tournament/            # Standings, qualification, bracket progression
│   ├── infrastructure/            # Prisma, IndexedDB, workers, repositories
│   ├── i18n/                      # next-intl-compatible message architecture
│   ├── lib/                       # Small cross-cutting utilities
│   ├── stores/                    # Zustand stores and selectors
│   ├── styles/
│   └── workers/                   # Browser worker entry points
├── tests/
│   ├── fixtures/                  # Synthetic, licensed-safe deterministic fixtures
│   ├── integration/
│   ├── property/
│   └── unit/
├── e2e/                           # Playwright journeys and visual snapshots
├── .env.example
├── eslint.config.*
├── next.config.*
├── package.json
├── playwright.config.ts
├── prettier.config.*
├── README.md
├── tsconfig.json
└── vitest.config.ts
```

The exact filenames generated by framework tooling may differ, but the domain boundaries must remain intact.

## 4. Phase plan and acceptance gates

### Phase 0 — Repository audit and plan

Deliverables:

- Audit repository, Git, package manager, environment templates, runtime tools, and existing tests.
- Record current official-source and licensing risks.
- Establish architecture, folder structure, phased gates, and known conflicts in the brief.
- Create `docs/IMPLEMENTATION_PLAN.md` and `docs/IMPLEMENTATION_STATUS.md`.

Gate:

- Both documents exist and accurately reflect the empty repository.
- Existing tests have been discovered and run where possible.
- No Phase 1+ code or dependencies have been introduced.

### Phase 1 — Project foundation

Deliverables:

- Initialize a current stable Next.js App Router application using npm (npm is the only installed package manager detected in Phase 0).
- Configure strict TypeScript, Tailwind, ESLint, Prettier, Vitest, React Testing Library, Playwright, fast-check, Prisma, Zod, Zustand, TanStack Query, Recharts, Framer Motion, Lucide, and accessible UI primitives.
- Add environment validation, `.env.example`, CI, original visual tokens, responsive shell, navigation, and initial accessibility checks.
- Add PostgreSQL development instructions; do not require authentication for guest MVP flow.

Gate:

- Typecheck, lint, formatting check, unit/component test, Playwright shell smoke test, Prisma validation, and production build all pass.
- Application is run and inspected at desktop and narrow widths with keyboard navigation and reduced motion.

### Phase 2 — Tournament data model

Deliverables:

- Create the versioned pre-opening official tournament snapshot: 48 teams, groups, 72 group fixtures, venues, dates, match numbers, 32-team knockout bracket, regulations, and ranking fallback snapshot.
- Implement isolated standings, head-to-head reapplication, fair-play/team-conduct scoring, third-place ranking, third-place allocation matrix, and bracket progression.
- Store configuration as schemas/data, never scattered UI constants.
- Document discrepancies between the prompt and official sources.

Gate:

- Unit, integration, and property tests prove exactly 32 unique Round-of-32 teams, exactly eight third-place qualifiers, no duplicate knockout entrants, ordered tie-break behavior, and exactly one champion.
- Exhaustively test every supported official third-place group combination against the official matrix.
- Manually inspect group/table/bracket diagnostic UI.

### Phase 3 — Data-ingestion pipeline

Deliverables:

- Build idempotent, cached, rate-limited ingestion with provenance and stable external identities.
- Ingest official 26-player final squads only after the source license/usage review is recorded.
- Normalize countries, players, clubs, positions, and source records; reject unknown or conflicting identities.
- Produce all required CSVs, the formatted Excel workbook, data-quality reports, Prisma migrations, and PostgreSQL seed.

Gate:

- All 48 teams have validated official squad membership and expected squad sizes; no duplicate canonical players or unstable IDs.
- Re-running ingestion/import changes no records when inputs are unchanged.
- Source coverage, estimated-field counts, validation failures, and licenses are reportable.

### Phase 4 — Ratings engine

Deliverables:

- Implement reproducible position-aware attributes, age-at-start calculation, rating formulas, uncertainty/confidence, and versioned parameters.
- Implement lineup/formation/role-fit team strengths and recomputation triggers.
- Document every formula and estimated input.

Gate:

- Golden tests, monotonicity/property tests, and sensitivity tests demonstrate sensible positional and lineup relationships.
- No overall rating is used as the sole match input.

### Phase 5 — Headless match engine

Deliverables:

- Implement a deterministic discrete-event engine, possession state machine, named random streams, cards, injuries, substitutions, tactical changes, extra time, shootouts, AI managers, commentary records, and event-derived statistics/ratings.
- Separate engine clock from UI/animation clock.

Gate:

- All required simulation invariants pass under unit, integration, and property tests.
- Same state/seed/version reproduces the same event log.
- Headless performance supports tournament batches without blocking the UI architecture.

### Phase 6 — Probability and calibration

Deliverables:

- Implement analytical prematch Poisson score matrices, live remaining-time probabilities, red-card/player-impact adjustments, and Monte Carlo calibration reports.
- Record historical calibration sources, targets, fit metrics, and limitations.

Gate:

- Probability sums/bounds and required monotonic event relationships pass.
- Analytical and simulated outcomes agree within documented tolerances across strength bands.
- Football distribution reports are generated and reviewed.

### Phase 7 — Core game flow

Deliverables:

- Implement country selection, tournament creation, squad/legal-lineup validation, tactics, headless match launch, postmatch update, simultaneous fixture resolution, qualification, knockout progression, and versioned IndexedDB save/import/export.

Gate:

- A Playwright test completes an accelerated tournament from country selection to one champion.
- Autosave, manual save, resume, schema migration, invalid import rejection, and reset are tested.

### Phase 8 — Match-center UI

Deliverables:

- Implement the three-column match center, SVG pitch, player/ball state projection, commentary, live statistics/probabilities, halftime review, substitutions, tactics, pause, and 0.5x/1x/2x controls.

Gate:

- UI actions mutate only future engine state and never rewrite past events.
- A 1x match completes in approximately two to three real minutes.
- Keyboard, screen-reader, reduced-motion, and long-session performance checks pass.

### Phase 9 — Visual polish

Deliverables:

- Complete original tournament-inspired visual system, all requested screens, bracket zoom/pan, empty/loading/error states, methodology views, responsive behavior, and accessibility pass.

Gate:

- Automated accessibility checks and manual keyboard/contrast/reduced-motion review pass.
- Desktop match-management view and key responsive widths are visually inspected.

### Phase 10 — Deployment and final QA

Deliverables:

- Configure hosted PostgreSQL, production migrations/seed, Vercel deployment, security headers, observability/error boundaries, performance budgets, release documentation, and final known limitations.

Gate:

- Full local and CI suites pass from a clean checkout.
- Production build, migrations, seed, and deployed browser journeys pass.
- Public methodology/provenance pages expose sources, estimation, model/data versions, and limitations without leaking secrets.

## 5. Validation protocol for every implementation phase

From Phase 1 onward, each phase must run the canonical scripts established in `package.json`:

```bash
npm run typecheck
npm run lint
npm run format:check
npm run test:unit
npm run test:integration
npm run test:property
npm run test:e2e
npm run validate:data
npx prisma validate
npm run build
```

Only phase-relevant expensive suites may be deferred during iteration; all applicable checks and the production build must be green at the phase gate. The application must also be run and the changed interface manually inspected. The status document will record exact commands, exit status, and any skipped check with a reason.

## 6. Data-source and licensing risks

| Risk                                                                            | Consequence                                                             | Planned control                                                                                                              |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Live FIFA pages now contain real results                                        | New games could start with leaked results or real cards/injuries        | Capture an explicit pre-opening schema; whitelist fixture/squad/rule fields; reject result-like fields; add zero-state tests |
| FIFA schedule in the brief conflicts with the current official schedule         | Incorrect Round-of-32 participants and progression                      | Official source hierarchy, double-entry verification, checksummed snapshot, exhaustive bracket tests                         |
| Official pages/documents are authoritative but copyrighted                      | Republishing source documents or protected presentation may be unlawful | Store citations and extracted factual fields; do not redistribute source documents without permission; retain license notes  |
| Terms/robots/API behavior can change                                            | Pipeline breakage or prohibited collection                              | Per-source adapter, rate limit, cache, descriptive user agent where allowed, terms review, manual import fallback            |
| FBref and similar sites may restrict automated extraction or reuse              | Attributes may be unavailable or non-redistributable                    | Do not scrape by default; obtain explicit permission/license or choose an open dataset/API                                   |
| Kaggle dataset license varies by dataset                                        | “Public” does not mean redistributable                                  | Require a compatible, recorded license and original-source traceability before ingestion                                     |
| National federation pages differ in reliability and structure                   | Squad identity conflicts and brittle parsing                            | FIFA final list is membership authority; federation sources supplement metadata only; confidence/conflict reports            |
| Player names are factual but identity matching is ambiguous                     | Duplicate or merged players                                             | Stable source IDs, normalized aliases, DOB/country checks, and manual-review queue                                           |
| Club, caps, goals, injury, and position data change                             | Anachronistic or fabricated tournament snapshots                        | Apply explicit as-of dates; never fill unknown facts without a cited source; estimates only for model attributes             |
| Flags, logos, player photos, fonts, and broadcast graphics have separate rights | Takedown or visual-identity infringement                                | License manifest; public-domain/MIT-compatible flags; original icons/patterns/silhouettes; no protected tournament marks     |
| Historical match data can have database rights                                  | Calibration data may not be shippable                                   | Use clearly licensed datasets; ship parameters/aggregate reports when raw redistribution is prohibited                       |
| Excel/CSV exports amplify redistribution exposure                               | Restricted data could be republished                                    | Export allowlist, source/license columns, automated restricted-field audit                                                   |

Before Phase 3, each source must be approved in a source register with owner, URL, access method, retrieved-at/as-of dates, license/terms note, permitted uses, redistribution status, rate limit, confidence, and fallback.

## 7. Most technically difficult parts

1. **Official third-place allocation and corrected bracket.** The 495 possible sets of eight groups require a source-backed allocation table and exhaustive deterministic tests. A greedy matcher is unacceptable.
2. **Multi-team head-to-head tie-break reapplication.** Circular ties require careful isolation and reapplication to the subset that remains tied, with team-conduct and ranking fallbacks frozen to the correct date.
3. **Licensed, complete 1,248-player dataset.** Official membership is available, but legally reusable, consistently scoped performance data with field-level provenance will be the largest data-engineering risk.
4. **Calibrated deterministic event simulation.** Tactical effects, player roles, discipline, injuries, score state, and time must interact without hidden scripting while remaining reproducible and fast.
5. **Live probability conditional on match state.** Remaining-time score distributions must incorporate score, time, manpower, player importance, tactics, and event evidence smoothly without fixed red-card bonuses.
6. **Causality-preserving live management.** A tactical edit must fork only future random consumption/state, keep past events immutable, and remain reproducible across save/resume.
7. **Simultaneous fixtures and tournament orchestration.** Group-final games must resolve without information leakage and feed standings/brackets exactly once.
8. **Save schema evolution.** Engine, data, model, and parameter versions must remain compatible or migrate/reject explicitly.
9. **Two-to-three-minute visualization.** Twenty-two markers, commentary, statistics, probability charts, and controls must stay synchronized with an independent engine clock and accessible under reduced motion.
10. **Calibration at scale.** Thousands of simulations must run off the main thread, produce statistically useful reports, and distinguish engine mismatch from sampling noise.

## 8. Architecture diagrams to produce in later phases

The required Mermaid diagrams will be added to their owning documents when those systems are implemented and test evidence exists:

- Data ingestion → `docs/DATA_PIPELINE.md` (Phase 3)
- Database relationships → `docs/ARCHITECTURE.md` (Phase 2–3)
- Tournament progression → `docs/TOURNAMENT_RULES.md` (Phase 2)
- Match simulation → `docs/SIMULATION_ENGINE.md` (Phase 5)
- Live probability recalculation → `docs/PROBABILITY_MODEL.md` (Phase 6)
- Save-state architecture → `docs/ARCHITECTURE.md` (Phase 7)

## 9. Phase reporting template

Every phase completion entry in `docs/IMPLEMENTATION_STATUS.md` must include:

- What was implemented
- Files added or modified
- Tests performed, including exact commands
- Test results and failures fixed
- Manual interface inspection performed
- Remaining limitations and known risks
- Next phase and its entry criteria

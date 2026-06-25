# World Stage

World Stage is a browser-based management simulation for the 48-team 2026 men's international football tournament. The project is being built from verified tournament data and deterministic simulation systems outward; it does not import real tournament results into a new game.

## Current status

Phase 7 establishes the verified tournament, official-squad, estimated ratings,
headless match-engine, probability/calibration, and core game-flow layer:

- Next.js 16 App Router, React 19, strict TypeScript, and Tailwind CSS 4
- Original responsive application shell with keyboard and reduced-motion support
- TanStack Query, Zustand, Zod, next-intl-compatible messages, Recharts, Lucide, and Framer Motion dependencies
- Prisma 7 configured for PostgreSQL
- Vitest, React Testing Library, fast-check, Playwright, ESLint, Prettier, and GitHub Actions
- Frozen result-free data for 48 teams, 12 groups, 16 venues, and all 104 fixture slots
- Official head-to-head-first standings rules and complete 495-option Annex C allocation
- Data-driven knockout progression with a 32-unique-entrant invariant
- A responsive `/tournament-model` diagnostic screen
- All 48 official 26-player squads with provenance and deterministic identities
- Read-only roster backend services and API routes for teams and players
- Cached, checksum-pinned ingestion with CSV, Excel, and quality-report products
- Prisma migration and idempotent PostgreSQL seed for 1,248 players
- A responsive `/data-quality` inspection screen
- Independent estimated player attributes, position-specific role ratings, team
  strengths, and default lineups
- CSV, Excel, Prisma seed, validation, and `/ratings` diagnostics for the
  ratings model
- Deterministic seeded headless match engine with possession, shots, goals,
  cards, injuries, substitutions, tactical changes, extra time, shootouts, and
  derived statistics
- Live match clock domain with elapsed-time timing, pause/resume, speed control,
  event-pause queueing, and full-time capping
- A responsive `/match-engine` diagnostic screen
- Backend/domain prematch and live probabilities, red-card adjustments, and
  internal calibration reports
- Player-facing `/play` route for country selection, hidden random seed
  generation, selected-team match pacing, weighted odds/results, updated group
  tables/results, knockout bracket/results, IndexedDB saves, import/export,
  continue, and reset

Detailed match-center controls are still reserved for later phases.

## Requirements

- Node.js 20.19 or later (the project is validated with 20.20.2)
- npm 10 or later
- PostgreSQL for future data phases; Phase 1 checks do not connect to a database
- Chromium for Playwright (`npx playwright install chromium`)

## Setup

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000` for local development.

## Validation

```bash
npm run typecheck
npm run lint
npm run format:check
npm run test:unit
npm run test:integration
npm run test:property
npm run validate:data
npm run db:validate
npm run db:smoke
npm run build
npm run test:e2e
```

`npm run check` runs every check above except Playwright. E2E tests start their own development server.

## Documentation

- [Implementation plan](docs/IMPLEMENTATION_PLAN.md)
- [Implementation status](docs/IMPLEMENTATION_STATUS.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Testing](docs/TESTING.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Known limitations](docs/KNOWN_LIMITATIONS.md)
- [Tournament rules](docs/TOURNAMENT_RULES.md)
- [Data dictionary](docs/DATA_DICTIONARY.md)
- [Data pipeline](docs/DATA_PIPELINE.md)
- [Player data pipeline](docs/PLAYER_DATA_PIPELINE.md)
- [Rating model](docs/RATING_MODEL.md)
- [Selected-lineup team rating model](docs/TEAM_RATING_MODEL.md)
- [Simulation engine](docs/SIMULATION_ENGINE.md)
- [Match timing](docs/MATCH_TIMING.md)
- [Probability model](docs/PROBABILITY_MODEL.md)
- [Core game flow](docs/GAME_FLOW.md)

## Product identity

The project uses an original visual identity and is not affiliated with FIFA, EA, or their competitions and products. Protected logos, broadcast packages, proprietary ratings, player photographs, and fonts are not used.

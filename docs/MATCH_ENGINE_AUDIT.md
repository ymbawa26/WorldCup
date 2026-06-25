# Match Engine Audit

**Date:** 2026-06-25  
**Stage:** 1 — audit and timing-test target  
**Scope:** Existing architecture only; no major match-center implementation yet.

## Executive summary

The project already has a solid data and simulation foundation: official
tournament data, all 48 official squads, player/team rating datasets, Prisma
models, a deterministic synchronous headless match engine, probability models,
and a playable `/play` tournament loop. The missing system is not basic data
loading; it is the live interactive match layer requested by the product brief.

The current engine generates a complete match result immediately. It does not
run a wall-clock-driven live match where one real second equals one simulated
minute, it does not expose a manager-controlled lineup/formation/substitution
screen, and it does not update probabilities from live tactical changes.

## Repository areas inspected

| Area                       | Current implementation                                                                                                                   | Key files                                                             |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Headless simulation engine | Synchronous deterministic event-log generator. Loops integer minutes from 1–90, then optional extra time/shootout.                       | `src/domain/simulation/engine.ts`, `src/domain/simulation/schema.ts`  |
| Match clock                | Simulated minute is an integer on events. No real-time authoritative clock exists yet.                                                   | `src/domain/simulation/engine.ts`                                     |
| Frontend match screen      | Diagnostic-only `/match-engine` page shows a sample immutable event log. No live match controls.                                         | `src/app/match-engine/page.tsx`                                       |
| Player-facing game flow    | `/play` advances selected-team tournament fixtures and shows results, group tables, and knockout bracket. It is not a live match screen. | `src/app/play/play-client.tsx`, `src/domain/game/engine.ts`           |
| Team data                  | Frozen 48-team tournament snapshot, groups, fixtures, knockout bracket, third-place matrix.                                              | `data/tournament/*.json`, `src/domain/tournament/*`                   |
| Player data                | 1,248 official squad players with provenance; 26 per team.                                                                               | `data/normalized/official-squads.json`, `src/domain/data-ingestion/*` |
| Database schema            | Prisma PostgreSQL schema already includes Team, Player, TournamentSquadPlayer, PlayerRating, TeamRating, TeamLineupPlayer, Fixture, etc. | `prisma/schema.prisma`                                                |
| State management           | Zustand exists only for a small interface preference. No match-state store.                                                              | `src/stores/interface-store.ts`                                       |
| Probability model          | Prematch/live Poisson model from team ratings, FIFA ranking context, and red-card adjustments. Not lineup/formation/tactics aware yet.   | `src/domain/probability/model.ts`                                     |
| Current lineup logic       | Default 4-3-3 lineups generated in ratings data; no user lineup selection or bench selection UI.                                         | `src/domain/ratings/model.ts`, `src/domain/ratings/schema.ts`         |
| Formation logic            | Only `defaultFormation: "4-3-3"` exists in ratings. No structured formation catalog or matchup data.                                     | `src/domain/ratings/model.ts`                                         |

## Baseline validation before Stage 1 changes

These checks were run before adding the failing timing tests:

| Check                      | Result                                           |
| -------------------------- | ------------------------------------------------ |
| `npm run typecheck`        | Passed                                           |
| `npm run lint`             | Passed                                           |
| `npm run test:unit`        | 8 files, 26 tests passed                         |
| `npm run test:integration` | 9 files, 21 tests passed                         |
| `npm run test:property`    | 5 files, 5 tests passed                          |
| `npm run validate:data`    | Passed: 48 teams, 1,248 players, 48 team ratings |
| `npm run db:validate`      | Passed                                           |
| `npm run build`            | Passed; 11 static app routes generated           |
| `npm run test:e2e`         | 7 Chromium tests passed                          |
| `npm run db:smoke`         | Passed twice; idempotent seed smoke green        |
| `npm audit --json`         | 0 vulnerabilities                                |

## Current strengths

- Official tournament structure, squads, and ratings are already normalized and
  validated.
- The database schema already has most roster/rating persistence concepts.
- The headless engine already emits chronological events with player IDs,
  stats, cards, injuries, substitutions, tactical changes, extra time, shootout,
  and deterministic seeding.
- Probability models already provide prematch and live score-matrix outputs.
- The `/play` flow now shows tournament-level results, standings, and bracket
  progress.

## Problems found against the new brief

### 1. Live timing does not exist yet

The current engine has an internal simulated minute loop, but it completes
synchronously in milliseconds. There is no authoritative wall-clock object using
`performance.now()`/elapsed milliseconds, no pause/resume state, and no speed
control. Therefore the product cannot yet guarantee:

- 90 simulated minutes in about 90 real seconds at 1x;
- 90 simulated minutes in about 45 real seconds at 2x;
- 90 simulated minutes in about 180 real seconds at 0.5x;
- no drift from browser timer delay or React rendering.

### 2. Event presentation queue does not exist

Important events are recorded in the immutable log, but there is no presentation
queue that pauses/slows playback for goals, cards, injuries, substitutions,
halftime, or full time. Multiple close events currently have no queueing model
because there is no live presentation runtime.

### 3. Match phases are too coarse

Current phases are `REGULATION`, `EXTRA_TIME`, `SHOOTOUT`, and `COMPLETE`.
The requested product phases are more explicit:

- `PRE_MATCH`
- `FIRST_HALF`
- `HALFTIME`
- `SECOND_HALF`
- `STOPPAGE_TIME`
- `EXTRA_TIME_FIRST_HALF`
- `EXTRA_TIME_BREAK`
- `EXTRA_TIME_SECOND_HALF`
- `PENALTY_SHOOTOUT`
- `FULL_TIME`

### 4. Manager substitutions are not interactive

The headless AI can create substitution events, but the user cannot choose
outgoing/incoming players, validate substitution rules, or update live lineups.

### 5. Player data is present, but not fully wired into interactive backend APIs

All 48 squads exist and seed into Prisma, but there are no player/team API
routes for live match setup, no shared lineup validation service, and no
server-resolved tactical state. The current app mostly consumes static
domain-data imports.

### 6. Formation selection is absent

The default lineup is hard-coded to a 4-3-3 role list during rating generation.
There is no `data/formations.json`, no formation definitions, no formation
position slots, no matchup matrix, and no manager formation screen.

### 7. Formation/tactical matchup effects are absent

Probability and match-event generation use team ratings and limited tactical
intent (`BALANCED`, `PROTECT_LEAD`, `CHASE_GOAL`), but not detailed formation,
mentality, pressing, defensive line, width, tempo, or matchup modifiers.

### 8. Ratings exist, but are not selected-lineup reactive

Team ratings include attack, midfield, defense, goalkeeping, depth, set pieces,
and overall. However, they are generated from default lineups and static team
context, not recalculated from a user-selected starting eleven, bench,
formation fit, or in-match substitutions.

### 9. UI is not the requested match center

The `/match-engine` route is an audit page and `/play` is tournament-level
progress. The requested live UI requires scoreboard, formation-aware pitch,
manager controls, statistics, live probabilities, and event timeline.

## Stage 1 timing tests added

Stage 1 adds a minimal target module and failing unit tests:

- `src/domain/live-match/clock.ts`
- `tests/unit/match-clock.test.ts`

The tests define the next-stage clock contract:

- one real second advances one simulated minute at 1x;
- 2x reaches 90 simulated minutes in 45 real seconds;
- 0.5x reaches 90 simulated minutes in 180 real seconds;
- user pause stops simulated time;
- event pauses freeze simulated time;
- overlapping event pauses queue rather than stacking broken timers.

The clock implementation intentionally throws for now. This keeps Stage 1 honest:
the project has a red test target before Stage 2 begins.

## Stage 1 status

Stage 1 has not implemented the clock. It has documented the gap and created
the failing timing tests requested by the brief.

# Match Engine Fix Plan

**Stage:** Ordered implementation plan for live match timing, squads,
formations, tactical probability, substitutions, and full match UI.

This plan follows the requested order. Do not skip ahead while an earlier stage
has failing gates.

## Stage 1 — Audit and timing tests

- [x] Inspect repository architecture.
- [x] Identify current simulation engine, clock, UI, data, database, state,
      probability, lineup, and formation systems.
- [x] Run current tests, typecheck, lint, build, E2E, data validation, database
      validation, database smoke, and audit.
- [x] Document findings in `docs/MATCH_ENGINE_AUDIT.md`.
- [x] Write this implementation checklist.
- [x] Add failing clock-contract tests.

Exit condition:

- Existing baseline is documented.
- Clock tests fail for the expected reason: the live match clock is not yet
  implemented.

## Stage 2 — Reliable simulation clock

- [x] Implement `src/domain/live-match/clock.ts`.
- [x] Use elapsed real milliseconds rather than fixed interval increments.
- [x] Support speed `0.5x`, `1x`, and `2x`.
- [x] Support user pause/resume.
- [x] Support event-pause queue.
- [x] Ensure event pauses do not skip simulated time.
- [x] Ensure overlapping event pauses process serially.
- [x] Add full-time transition/capping to clock state.
- [ ] Add halftime runtime transition once the live match UI can require “Start
      Second Half.”
- [x] Add documentation in `docs/MATCH_TIMING.md`.
- [x] Pass all clock tests without weakening assertions.

Exit condition:

- `tests/unit/match-clock.test.ts` passes.
- TypeScript, lint, unit tests, and build pass.

## Stage 3 — Player backend and roster services

- [x] Audit existing Prisma player/team models against the requested fields.
- [x] Add only missing fields or normalized companion tables; avoid duplicating
      existing Player/Team/Rating concepts.
- [x] Confirm all 48 teams and 1,248 players seed idempotently.
- [x] Add or adapt data scripts to the requested command names if needed:
  - [x] `scripts/fetch-squads.ts`
  - [x] `scripts/normalize-players.ts`
  - [x] `scripts/validate-rosters.ts`
  - [x] `scripts/seed-player-database.ts`
- [x] Create `reports/missing-player-data.json` if any fallback players are
      introduced.
- [x] Add API/domain services for teams and team players.
- [ ] Add formation services during Stage 5 with formation definitions.
- [x] Document in `docs/PLAYER_DATA_PIPELINE.md`.

Exit condition:

- Player-data tests pass.
- Seed remains idempotent.
- No duplicate players or shirt numbers within teams.

## Stage 4 — Team ratings from selected lineups

- [x] Define selected-lineup rating input schema.
- [x] Calculate attack, midfield, defense, goalkeeping, bench strength,
      pressing, counterattacking, set pieces, and discipline from selected
      starters/bench.
- [x] Ensure starting lineup dominates active rating influence.
- [x] Ensure bench strength is a smaller influence.
- [x] Exclude non-selected players from direct in-match influence.
- [x] Add position-fit and tactical-role-fit calculations.
- [x] Document formulas in `docs/TEAM_RATING_MODEL.md`.

Exit condition:

- Rating tests show ratings change when starters/formation/bench change.
- Weak bench players do not heavily distort starting defensive/attacking rating.

## Stage 5 — Prematch lineup, formations, and tactical setup

- [ ] Add `data/formations.json` with at least:
  - [ ] `4-3-3`
  - [ ] `4-2-3-1`
  - [ ] `4-4-2`
  - [ ] `4-1-4-1`
  - [ ] `4-3-2-1`
  - [ ] `3-4-3`
  - [ ] `3-4-2-1`
  - [ ] `3-5-2`
  - [ ] `5-3-2`
  - [ ] `5-4-1`
- [ ] Add `data/formation-matchups.json`.
- [ ] Add Zod schemas for formation definitions and matchup modifiers.
- [ ] Add lineup validation:
  - [ ] exactly eleven starters;
  - [ ] exactly one goalkeeper;
  - [ ] no duplicates;
  - [ ] required slots filled;
  - [ ] unavailable players rejected;
  - [ ] bench rules enforced;
  - [ ] out-of-position warnings.
- [ ] Add prematch lineup/tactics UI before match start.
- [ ] Add captain, penalty taker, free-kick taker, and corner takers.
- [ ] Add mentality, pressing, line, tempo, and width controls.
- [ ] Recalculate prematch probabilities when lineup or formation changes.
- [ ] Document formation assumptions in `docs/FORMATION_MODEL.md`.

Exit condition:

- Lineup/formation/probability tests pass.
- Formation effects are bounded and do not overpower player-quality extremes.

## Stage 6 — In-match management

- [ ] Add live match state that preserves previous events.
- [ ] Add substitution commands and validation.
- [ ] Add formation-change commands during active play, event pauses, halftime,
      and extra-time break.
- [ ] Recalculate active ratings and live probabilities after each change.
- [ ] Add event records for substitutions and tactical changes.
- [ ] Add documentation in `docs/SUBSTITUTION_SYSTEM.md`.

Exit condition:

- Substitution and formation-change tests pass.
- Switching formation at minute 60 does not mutate minutes 1–59.

## Stage 7 — Full match UI integration

- [ ] Build live match route/screen.
- [ ] Add scoreboard with teams, flags, score, minute, phase, added time, speed.
- [ ] Add formation-aware pitch and player markers.
- [ ] Add manager controls:
  - [ ] pause;
  - [ ] 0.5x / 1x / 2x;
  - [ ] substitution;
  - [ ] formation;
  - [ ] mentality;
  - [ ] pressing;
  - [ ] defensive line;
  - [ ] width;
  - [ ] tempo;
  - [ ] time-wasting.
- [ ] Add statistics panel.
- [ ] Add event timeline.
- [ ] Add important-event presentation queue.
- [ ] Add halftime screen requiring “Start Second Half.”
- [ ] Add extra-time and penalty shootout presentation.

Exit condition:

- A normal match completes in approximately 90 real seconds at 1x excluding
  event pauses.
- Important events pause or slow presentation without corrupting clock state.

## Stage 8 — End-to-end verification

- [ ] Add shortened-clock Playwright test:
  - [ ] select team;
  - [ ] open squad selection;
  - [ ] select formation;
  - [ ] select legal starting eleven;
  - [ ] start match;
  - [ ] confirm clock advances;
  - [ ] pause;
  - [ ] change speed;
  - [ ] substitute;
  - [ ] change formation;
  - [ ] resume;
  - [ ] complete match;
  - [ ] confirm result/statistics stored.
- [ ] Run full validation:
  - [ ] typecheck;
  - [ ] lint;
  - [ ] format check;
  - [ ] unit;
  - [ ] integration;
  - [ ] property;
  - [ ] data validation;
  - [ ] db validate;
  - [ ] db smoke;
  - [ ] production build;
  - [ ] Playwright;
  - [ ] audit.
- [ ] Manually test favorite/underdog, even game, formation change,
      substitution, red-card scenario, and defensive tactics scenario.

Exit condition:

- Completion report can honestly include timing measurements, player counts,
  fallback counts, schema changes, formation system, probability formula,
  substitution implementation, tests added, and remaining limitations.

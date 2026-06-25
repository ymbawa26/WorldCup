# Core Game Flow

**Game-flow version:** `game-flow-2026.06.25-v2`

Phase 7 adds the first playable spine of World Stage. It is not yet the full
match-center experience; it is the complete tournament lifecycle from country
selection to one champion, with saves and selected-team pacing.

## User-facing scope

- `/play` is the primary player route.
- Users can select a nation and start a tournament. The seed is generated
  privately by the browser and persisted only in save data.
- The visible loop is now “play next match”: the selected team’s next fixture is
  resolved first, then all other fixtures are simulated in the background until
  the selected team’s following fixture is ready.
- Users see concise match odds and the latest selected-team result. Raw seed,
  model factors, calibration reports, and diagnostic internals remain backend
  data.
- Autosave, manual save, export, import, invalid-import rejection, migrated
  legacy saves, continue, and reset are implemented.

## Backend-only/internal scope

The following remain intentionally hidden from primary navigation:

- tournament model diagnostics;
- raw data-quality diagnostics;
- rating model diagnostics;
- match-engine diagnostics;
- probability calibration internals.

Those routes and reports remain useful for development and audit, but they are
not part of the ordinary player journey.

## Domain flow

1. Create a versioned tournament game state from selected country and an
   internally generated seed.
2. Validate that the country exists in the official tournament snapshot.
3. Preview the selected team’s next match using backend probability odds.
4. Resolve the selected team’s match from a weighted score matrix.
5. Simulate other fixtures in order until the next selected-team match is
   available.
6. Resolve official group standings, best third-place allocation, and knockout
   progression while preserving already-played save-state results.
7. Persist the save to IndexedDB and allow export/import/reset from a secondary
   save-transfer drawer.

## Current simplifications

- Tactics are represented by the underlying AI/headless engine, but user tactics
  editing is deferred to the match-center phase.
- Simultaneous group fixtures are tracked as batches; richer presentation comes
  later.
- The player-facing match screen is still a concise result/odds surface. Full
  tactics, substitutions, animation, and commentary controls are deferred to the
  match-center phase.

# Core Game Flow

**Game-flow version:** `game-flow-2026.06.25-v1`

Phase 7 adds the first playable spine of World Stage. It is not yet the full
match-center experience; it is the complete tournament lifecycle from country
selection to one champion, with saves.

## User-facing scope

- `/play` is the primary player route.
- Users can select a nation, set a deterministic seed, run an accelerated
  tournament, see the champion, and understand whether their nation won,
  reached knockouts, or exited in the group stage.
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

1. Create a versioned tournament game state from selected country and seed.
2. Validate that the country exists in the official tournament snapshot.
3. Simulate all 72 group fixtures with the headless engine.
4. Resolve official group standings and best third-place allocation.
5. Resolve the full knockout bracket through Match 104.
6. Persist the save to IndexedDB.
7. Allow export/import/reset from the browser.

## Current simplifications

- Tactics are represented by the underlying AI/headless engine, but user tactics
  editing is deferred to the match-center phase.
- The accelerated flow simulates the tournament immediately rather than stepping
  fixture by fixture.
- Simultaneous group fixtures are tracked as batches; richer presentation comes
  later.

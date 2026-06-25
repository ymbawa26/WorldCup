# Simulation Engine

**Engine version:** `match-engine-2026.06.25-v1`

Phase 5 adds a framework-independent, headless match engine. The engine is not a
visual animation loop. It advances its own deterministic clock and returns an
immutable event log plus derived statistics.

## Contract

- Same input state, seed, and engine version reproduce the same event log.
- Named random streams isolate event families such as possession, shots, cards,
  injuries, substitutions, and shootouts.
- UI rendering never advances match time. The first kickoff event explicitly
  records `engineClock: "simulation"` and `animationClock: "external"`.
- Scores and match statistics derive from the event log.
- The engine consumes rating vectors and role-specific player ratings. It does
  not use a single overall rating as the only match input.

## Implemented systems

- Regulation-time possession state machine.
- Shot, shot-on-target, goal, and xG events.
- Yellow/red card events, including second-yellow red behavior.
- Injury interruptions and forced substitutions.
- AI-manager substitutions and tactical changes.
- Extra time and shootout support for knockout configurations.
- Commentary strings attached to every event.
- Derived team statistics: goals, shots, shots on target, xG, possession,
  yellow cards, red cards, injuries, and substitutions.

## Current simplifications

- Tactical profiles, fatigue curves, discipline profiles, injury-risk profiles,
  and calibrated historical distributions are not implemented yet.
- Extra time is available for knockout calls, but the app still does not expose
  playable tournament flow.
- Probability calibration belongs to Phase 6.

## Validation

The engine is covered by unit, integration, and property tests:

- deterministic replay from seed;
- changed seed changes the event log;
- event sequence and monotonic clock invariants;
- score equals goal-event count;
- shots-on-target never exceed shots;
- possession sums to approximately one;
- maximum five substitutions per team;
- tournament-sized batch performance.

Run:

```bash
npm run test:unit
npm run test:integration
npm run test:property
```

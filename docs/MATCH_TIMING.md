# Match Timing

**Stage:** 2 — reliable simulation clock  
**Implemented in:** `src/domain/live-match/clock.ts`

## Timing contract

The live match clock is a pure domain object. It does not depend on React
rendering, `setInterval` accuracy, animation frames, or browser paint cadence.
Callers provide the authoritative real timestamp in milliseconds, normally from
`performance.now()` in the future match runtime.

At `1x` speed:

```text
1,000 real milliseconds = 1 simulated match minute
```

Therefore, excluding event pauses:

| Speed  | Real duration for 90 simulated minutes |
| ------ | -------------------------------------- |
| `0.5x` | 180 seconds                            |
| `1x`   | 90 seconds                             |
| `2x`   | 45 seconds                             |

The formula is:

```ts
simulatedMinutesAdvanced = (realElapsedMilliseconds * speed) / 1000;
```

## Public clock operations

`createMatchClock()` returns a clock with:

- `start(nowMs)` — starts or restarts running time from the supplied timestamp.
- `tick(nowMs)` — advances from elapsed real time and returns a snapshot.
- `pause(nowMs)` — settles elapsed time and enters `USER_PAUSED`.
- `resume(nowMs)` — resumes from the same simulated minute.
- `setSpeed(speed, nowMs)` — settles elapsed time at the old speed, then applies
  `0.5`, `1`, or `2`.
- `enqueueEventPause(durationMs, nowMs)` — settles elapsed time and queues an
  event-presentation pause.
- `snapshot()` — returns the current simulated minute, speed, and presentation
  state.

## Presentation states

The clock currently supports:

- `RUNNING`
- `USER_PAUSED`
- `EVENT_PAUSED`
- `HALFTIME`
- `FULLTIME`

Stage 2 implements reliable running, user pause, event pause, and full-time
capping at minute 90. `HALFTIME` remains reserved for the later match runtime
because halftime needs user-facing statistics, tactics controls, and a “Start
Second Half” action.

## Event pauses

Important events can call `enqueueEventPause(durationMs, nowMs)`.

While the clock is in `EVENT_PAUSED`:

- simulated time does not move;
- the current simulated minute remains stable;
- queued pauses are processed serially;
- overlapping/nearby event pauses do not create stacked timers;
- once the queue is empty, the clock returns to `RUNNING` unless full time has
  been reached.

The tests use two-second pauses for important events such as goals, cards,
injuries, substitutions, halftime/full-time presentation, and penalty moments.
The future match UI may use shorter durations for smaller events such as corners
or major saves.

## Drift resistance

The clock never assumes a timer callback fires exactly on schedule. A delayed
tick simply produces a larger `realElapsedMilliseconds`; an early or repeated
tick advances less or not at all.

The clock also rejects backwards time to prevent corrupted state.

## Current limitations

- The clock is not yet wired to a live match UI.
- The headless event generator is still synchronous.
- `HALFTIME`, stoppage time, extra time, and shootout phase orchestration still
  need the higher-level live match runtime planned for later stages.
- Event pause durations are supported, but event classification and UI
  presentation are not yet connected.

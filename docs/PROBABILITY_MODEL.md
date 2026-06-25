# Probability Model

**Model version:** `probability-model-2026.06.25-v1`

Phase 6 adds the probability and calibration layer behind the simulation. This
is mostly backend/domain infrastructure. Raw calibration bands, fit errors, and
parameter assumptions are kept in reports/docs rather than exposed as a public
odds screen.

## Implemented scope

- Prematch Poisson score matrices.
- Win/draw/loss probabilities derived from normalized score matrices.
- Live remaining-time probabilities conditional on current score and minute.
- Red-card manpower adjustments that reduce the penalized side's expected goals
  and increase the opponent's attacking expectation.
- Internal Monte Carlo calibration report comparing analytical probabilities
  with deterministic Phase 5 simulations.

## Inputs

- Phase 4 team strength vectors.
- Phase 5 deterministic match engine for internal simulation comparison.
- Current live state: minute, score, and red-card counts.

No external historical results corpus is bundled in this phase. The generated
report is therefore an internal consistency report, not historical validation.

## Score matrix

The model computes expected goals for each side from attack, midfield,
set-pieces, depth, defense, and goalkeeping. It then creates a Poisson score
matrix from 0–10 goals for both teams and normalizes the matrix to sum to one.

Outcome probabilities are sums across the matrix:

- home win if `home_goals > away_goals`;
- draw if `home_goals == away_goals`;
- away win if `home_goals < away_goals`.

## Live probabilities

Live probabilities reuse the same score matrix, scaled by remaining match time.
The current score is added to each future-score cell before outcome aggregation.
This means a team leading late receives a monotonic win-probability increase
without any special-case scripting.

## Calibration report

Generate:

```bash
npm run probability:calibrate
```

Outputs:

- `data/reports/probability-calibration.json`
- `data/reports/probability-calibration.md`

The report compares analytical probabilities against repeated deterministic
simulations across five strength bands. It records sources, limitations,
tolerance, and mean absolute error.

## User-surface rule

Probability internals should remain backend/report data until the game has a
designed match-center UI. Future user-facing probability displays should show
clear, concise summaries and uncertainty language rather than exposing raw model
parameters or calibration diagnostics.

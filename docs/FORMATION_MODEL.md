# Formation and Prematch Setup Model

Stage 5 adds a formation-aware prematch layer on top of the selected-lineup
rating model.

## Data sources

The formation catalog lives in `data/formations.json`. It currently includes:

- `4-3-3`
- `4-2-3-1`
- `4-4-2`
- `4-1-4-1`
- `4-3-2-1`
- `3-4-3`
- `3-4-2-1`
- `3-5-2`
- `5-3-2`
- `5-4-1`

Each formation has 11 slots. A slot declares a tactical role such as `GK`,
`CB`, `FB`, `DM`, `CM`, `AM`, `WG`, or `ST`.

Formation matchup modifiers live in `data/formation-matchups.json`. They are
small bounded adjustments by formation family, not large magic multipliers.

## Validation

Prematch setup validation checks:

- exactly 11 starters
- exactly one goalkeeper
- no duplicate starters
- no duplicate bench players
- no starter/bench overlap
- selected players belong to the selected team
- set-piece roles are assigned to starters
- out-of-position warnings when role fit is weak

## Tactics

The prematch setup supports:

- mentality: defensive, balanced, attacking
- pressing: low, medium, high
- defensive line: deep, standard, high
- tempo: slow, balanced, fast
- width: narrow, balanced, wide

These controls shift active strengths slightly. They are intentionally bounded
so player quality remains more important than a tactical toggle.

## Probability integration

The selected lineup is first converted into an active team rating. Formation
matchup and tactic modifiers are then applied to the active rating, and the
prematch probability model recalculates expected goals and outcome odds from
those active ratings.

Only the user-managed next match receives the selected setup override in the
current game flow. Background matches continue to use automatic default setups.

## Current boundary

Stage 5 adds backend setup validation, formation-aware active ratings, adjusted
prematch odds, and a compact prematch setup UI. Full manual player swapping,
in-match tactical changes, substitutions, and the live match screen remain
deferred to later stages.

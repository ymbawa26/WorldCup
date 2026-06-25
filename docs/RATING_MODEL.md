# Rating Model

**Model version:** `rating-model-2026.06.24-v1`

Phase 4 creates an independent, deterministic rating layer for the simulator. It
does not copy proprietary football-game ratings. It turns the official squad
facts already in the repository into transparent estimated attributes,
position-specific role ratings, default lineups, and team strength vectors.

All Phase 4 outputs are estimates. They are marked with `is_estimated = true`,
carry confidence and uncertainty values, and are safe to regenerate from the
same inputs.

## Inputs

- `data/normalized/official-squads.json`: player membership, coarse position,
  date of birth, height, caps, goals, club name, and club association.
- `data/tournament/snapshot.json`: FIFA team ranking rank and points context.
- Formula weights in `src/domain/ratings/model.ts`.

Preferred foot, secondary positions, detailed league quality, injury state, and
current tactical roles are not present in the official source. Phase 4 does not
invent those as factual fields.

## Player attributes

Every player receives eight 1–99 attributes: `pace`, `shooting`, `passing`,
`defending`, `goalkeeping`, `physical`, `mentality`, and `form`.

The formulas combine position baselines with age curves, bounded logarithmic
caps/goals transforms, height, and FIFA ranking context. Outfield age peaks at
27; goalkeeper age peaks at 30.

## Role ratings

Every player receives role ratings for `GK`, `CB`, `FB`, `DM`, `CM`, `AM`, `WG`,
and `ST`. Roles are weighted blends of the eight attributes plus a role-fit
multiplier based on the official coarse position.

`overall_estimate` is the maximum role rating and exists for sorting and review.
It is not the sole match input.

## Team ratings and lineup recomputation

The default team shape is `4-3-3`:

`GK, FB, CB, CB, FB, DM, CM, AM, WG, ST, WG`

For each role slot, the model selects the best remaining squad player by role
rating and role fit. The team strength vector is then derived from the selected
lineup and bench depth: `attack`, `midfield`, `defense`, `goalkeeping`, `depth`,
`setPieces`, and display-only `overall`.

Changing player availability or squad ratings and rerunning `buildTeamRating`
recomputes the lineup and team strengths.

## Confidence and uncertainty

Confidence is lower than official factual data because ratings are modeled
outputs. It increases with ranking context and international experience, and it
is reduced when optional details such as preferred foot and secondary positions
are missing. `uncertainty = 1 - confidence`.

## Generated products

- `data/ratings/ratings.json`
- `data/player_attributes.csv`
- `data/team_attributes.csv`
- `exports/world-cup-simulation-data.xlsx`

Generate and validate:

```bash
npm run ratings:generate
npm run data:validate
npm run data:export
```

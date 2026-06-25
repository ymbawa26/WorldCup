# Selected-Lineup Team Rating Model

This document describes the active team rating used after a user selects a
matchday lineup. It is intentionally separate from the generated baseline team
rating in `docs/RATING_MODEL.md`.

## Purpose

The baseline rating answers: “How strong is this national team from its full
squad?”

The selected-lineup rating answers: “How strong is this team with these eleven
starters and this bench?”

Only selected players influence this active rating. Non-selected squad members
do not directly affect matchday strengths.

## Input

`SelectedLineupRatingInputSchema` requires:

- `teamId`
- exactly 11 starters
- one tactical role per starter
- up to 15 bench player IDs

Validation rejects:

- duplicate starters
- duplicate bench players
- players appearing as both starter and bench
- players from another team
- lineups without exactly one goalkeeper

## Role fit

Each starter has:

- `roleRating`: the player's estimated rating for the assigned tactical role
- `roleFit`: the positional fit between primary position and tactical role
- `effectiveRating`: `roleRating * (0.9 + roleFit * 0.1)`, clamped to 1–99

This preserves player quality as the main signal while still penalizing
out-of-position selections.

## Strength formulas

Starter groups dominate each active strength:

- `attack`: wide forwards, strikers, and attacking midfielders
- `midfield`: defensive, central, and attacking midfielders
- `defense`: centre backs, full backs, and defensive midfielders
- `goalkeeping`: the selected goalkeeper

Bench strength is calculated from the best seven selected bench players by
overall estimate. It acts as a small stabilizer:

- attack uses 92% starter signal and 8% bench signal
- midfield uses 93% starter signal and 7% bench signal
- defense uses 94% starter signal and 6% bench signal
- goalkeeping uses 96% starter signal and 4% bench signal

Additional tactical strengths are estimated from selected starters:

- `pressing`: physical, mentality, form, and effective role rating
- `counterattacking`: pace, passing, shooting, and effective role rating from
  transition-relevant roles
- `setPieces`: weighted blend of attack, midfield, defense, and goalkeeping
- `discipline`: mentality plus role-fit stability

The final `overall` combines attack, midfield, defense, goalkeeping,
bench strength, pressing, counterattacking, set pieces, and discipline.

## Current boundary

Stage 4 creates the backend calculation and tests. Formation slot definitions,
formation matchup modifiers, unavailable-player state, and probability
recalculation are deferred to Stage 5 and Stage 6.

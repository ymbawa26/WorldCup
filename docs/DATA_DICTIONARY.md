# Data Dictionary

## Versioning contract

Tournament data is an immutable, source-pinned pre-opening snapshot. Every
consumer must retain `schemaVersion` and `dataVersion`; later corrections create
a new version rather than silently rewriting a saved tournament.

## Snapshot files

| File                                          | Purpose                                             | Primary keys                                     |
| --------------------------------------------- | --------------------------------------------------- | ------------------------------------------------ |
| `data/tournament/snapshot.json`               | Teams, groups, venues, and 72 group fixtures        | team `id`, group `id`, venue `id`, `matchNumber` |
| `data/tournament/knockout-bracket.json`       | Matches 73–104 and progression slots                | `matchNumber`                                    |
| `data/tournament/third-place-allocation.json` | All Annex C allocations                             | sorted eight-group key                           |
| `data/tournament/rules.json`                  | Ordered rule identifiers and discipline constants   | `schemaVersion`                                  |
| `data/tournament/sources.json`                | Provenance, retrieval, integrity, and license notes | source `id`                                      |
| `data/normalized/official-squads.json`        | Canonical official players and field provenance     | player `id`, `externalIdentity`                  |
| `data/players.csv`                            | Portable denormalized player seed product           | `id`, `external_identity`                        |
| `data/ratings/ratings.json`                   | Estimated player/team ratings and lineups           | `playerId`, `teamId`, `modelVersion`             |
| `data/player_attributes.csv`                  | Denormalized player attributes and role ratings     | `player_id`, `model_version`                     |
| `data/team_attributes.csv`                    | Denormalized team strengths and default lineups     | `team_id`, `model_version`                       |
| `data/reports/squad-data-quality.json`        | Per-team Phase 3 validation evidence                | `dataVersion`, team `fifaCode`                   |
| `exports/world-cup-simulation-data.xlsx`      | Human-readable validated data workbook              | sheet-specific keys                              |

CSV exports mirror the snapshot's team, group-membership, and group-fixture
facts for inspection. JSON is the runtime source of truth.

## Core fields

| Entity         | Field                  | Meaning                                                     |
| -------------- | ---------------------- | ----------------------------------------------------------- |
| Snapshot       | `stateAt`              | Instant represented by the frozen data                      |
| Snapshot       | `resultsIncluded`      | Must be `false` for a new-game dataset                      |
| Team           | `id`                   | Stable lowercase slug, independent of display name          |
| Team           | `fifaCode`             | Three-character FIFA association code                       |
| Team           | `groupPosition`        | Official draw position from 1–4                             |
| Team           | `fifaRanking`          | Rank, prior rank, points, prior points, and effective date  |
| Fixture        | `matchNumber`          | Official number from 1–104                                  |
| Fixture        | `simultaneousKey`      | Shared key for a group's two final fixtures; otherwise null |
| Knockout match | `homeSlot`, `awaySlot` | Group finish or preceding-match progression reference       |
| Allocation     | `option`               | Annex C row number from the regulations                     |
| Allocation     | `assignments`          | Group winner to qualifying third-place group map            |
| Player         | `externalIdentity`     | Stable source/team/birth-date/name identity                 |
| Player         | `primaryPosition`      | Official coarse position: GK, DF, MF, or FW                 |
| Player         | `dateOfBirth`          | ISO date normalized from the official list                  |
| Player         | `ageAtTournamentStart` | Complete years on 11 June 2026                              |
| Player         | `clubCountryCode`      | Association code published beside the club                  |
| Player         | `fieldProvenance`      | Imported-field to source-record reference map               |
| Player rating  | `attributes`           | Eight estimated 1–99 player facets                          |
| Player rating  | `roleRatings`          | Position-specific estimates for GK/CB/FB/DM/CM/AM/WG/ST     |
| Player rating  | `overallEstimate`      | Display-only maximum role estimate                          |
| Team rating    | `lineup`               | Default 4-3-3 role assignment with no duplicate players     |
| Team rating    | `strengths`            | Attack/midfield/defense/goalkeeping/depth/set-pieces vector |
| Source         | `confidenceScore`      | 0–1 confidence in the imported factual record               |
| Source         | `isEstimated`          | Whether a value was modeled rather than observed            |

Preferred foot and secondary positions are deliberately blank as factual fields
because the official squad source does not publish them. Player and team rating
products are Phase 4 estimated outputs with confidence/uncertainty fields.
Tactical profiles, discipline profiles, and injury profiles still contain
schemas only until their owning later phases create documented values.

## Database identities

Prisma uses UUID primary keys for internal records and stable unique external
keys (`slug`, `code`, `matchNumber`, and source external IDs) for import and
save compatibility. Tournament membership and group membership are explicit
join models so a future edition can reuse a team without rewriting identity.

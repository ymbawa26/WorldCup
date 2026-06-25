# Player Data Pipeline

**Stage:** Match engine remediation Stage 3 — player backend and roster services

## Current data source

The project already contains the official 48-team tournament squad dataset from
the Phase 3 ingestion pipeline:

- `data/normalized/official-squads.json`
- `data/reports/squad-data-quality.json`
- `src/domain/data-ingestion/*`
- `prisma/schema.prisma`

The normalized dataset contains 1,248 players: 48 teams × 26 players. The
current Stage 3 work does not replace that pipeline or duplicate player models.
It adds a roster service/API layer over the existing data.

## Backend/service layer

Roster services live in:

- `src/domain/rosters/service.ts`

They expose:

- `listRosterTeams()`
- `getRosterTeam(teamId)`
- `getTeamPlayers(teamId)`
- `getTeamRoster(teamId)`
- `validateRosterServices()`
- `buildMissingPlayerDataReport()`

The service combines:

- tournament team metadata;
- official squad players;
- generated team ratings;
- existing squad quality reports.

## API routes

The new read-only API routes are:

- `GET /api/teams`
- `GET /api/teams/:teamId`
- `GET /api/teams/:teamId/players`

These routes resolve teams and players by ID from trusted backend data. They do
not trust client-submitted ratings or player data.

## Script aliases

The original data scripts remain under `scripts/data/`. Stage 3 adds requested
root-level aliases:

- `scripts/fetch-squads.ts`
- `scripts/normalize-players.ts`
- `scripts/validate-rosters.ts`
- `scripts/seed-player-database.ts`

Package scripts:

```bash
npm run rosters:fetch
npm run rosters:normalize
npm run rosters:validate
npm run rosters:seed
```

`npm run rosters:validate` writes:

- `reports/missing-player-data.json`

## Missing player data

Current report:

- fallback players: `0`
- unresolved teams: `0`

Fallback players are allowed only if a real player identity cannot be resolved.
If introduced later, each fallback must have a unique ID, valid team, valid
position, squad number, and report entry.

## Validation rules

Stage 3 validates that:

- all 48 teams are exposed;
- every team has 26 players;
- every team has enough players for an eleven;
- every team has at least two goalkeepers;
- every player has a unique ID;
- every player belongs to one tournament team;
- duplicate squad numbers are detected;
- fallback identities are reported.

## Current limitations

- This stage is read-only roster service work. It does not yet add live lineup
  selection, formation slots, unavailable-player state, suspensions, injuries,
  or substitution commands.
- Formation definitions and formation matchup services are reserved for Stage 5.
- The Prisma schema already contains player, squad, rating, and lineup tables,
  so no schema migration was required for this stage.

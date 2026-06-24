# Architecture

**Current scope:** Phase 2 tournament model

**Last updated:** 2026-06-24

## Design direction

World Stage is organized so tournament and simulation rules remain independent of Next.js and React. The UI will orchestrate domain modules through typed application services; it will not own football logic.

```mermaid
flowchart LR
    UI["Next.js UI"] --> APP["Application services"]
    APP --> DOMAIN["Framework-independent domain"]
    APP --> SAVE["Versioned save adapters"]
    APP --> DATA["Validated data repositories"]
    DOMAIN --> EVENTS["Immutable match event log"]
    DATA --> PG["PostgreSQL via Prisma"]
    SAVE --> IDB["IndexedDB guest saves"]
```

The UI shell and tournament domain now exist. Rating, match, probability, and save domains remain reserved for their owning phases.

## Tournament domain

`src/domain/tournament` is framework-independent. Zod parses the immutable JSON
snapshot at the boundary; standings, qualification, allocation, and bracket
modules consume typed values and make no React, network, or database calls.

```mermaid
erDiagram
    DATA_SOURCE ||--o{ TOURNAMENT_SOURCE : referenced_by
    TOURNAMENT ||--o{ TOURNAMENT_SOURCE : supported_by
    TOURNAMENT ||--o{ TOURNAMENT_TEAM : contains
    TEAM ||--o{ TOURNAMENT_TEAM : enters
    TOURNAMENT ||--o{ TOURNAMENT_GROUP : defines
    TOURNAMENT_GROUP ||--o{ GROUP_MEMBERSHIP : contains
    TOURNAMENT_TEAM ||--|| GROUP_MEMBERSHIP : assigned
    TOURNAMENT ||--o{ FIXTURE : schedules
    STADIUM ||--o{ FIXTURE : hosts
    TEAM ||--o{ FIXTURE : home_team
    TEAM ||--o{ FIXTURE : away_team
```

The JSON snapshot is currently the executable repository. Prisma models the
same durable identities for the ingestion work in Phase 3; no database seed or
runtime connection is introduced prematurely.

## Foundation boundaries

- `src/app`: routes, layouts, metadata, and global styles
- `src/components`: reusable application and accessible UI components
- `src/i18n`: English messages and locale contracts compatible with future `next-intl` routing
- `src/lib`: narrow cross-cutting utilities and environment parsing
- `src/stores`: ephemeral client interface state only
- `prisma`: PostgreSQL provider and future migrations
- `data/tournament`: source-pinned normalized tournament facts
- `src/domain/tournament`: parsing, validation, standings, qualification, and bracket logic
- `tests`: unit, integration, and property tests
- `e2e`: browser journeys

TanStack Query is initialized once in the client provider. Zustand currently holds one interface preference as a proof of the state boundary. Neither should contain tournament truth.

## Runtime and environment

- Next.js requires Node 20.9 or later; Prisma 7 requires Node 20.19 or later. The repository pins `>=20.19.0` and CI uses 20.20.2.
- `DATABASE_URL` is optional while Phase 1 has no database operations. Prisma CLI validation uses a non-connecting local fallback URL.
- `NEXT_PUBLIC_APP_URL` defaults to `http://localhost:3000` and controls metadata URL resolution.

## Security posture

- No secrets are exposed to client components.
- Environment files are ignored except `.env.example`.
- Next.js's `poweredByHeader` is disabled.
- No authentication, uploads, database writes, or external APIs exist in Phase 1.

Additional database, simulation, probability, and save-state diagrams will be added when those systems exist and can be documented from tested behavior.

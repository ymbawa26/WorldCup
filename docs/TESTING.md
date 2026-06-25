# Testing

## Test layers

| Layer       | Tool                          | Current purpose                                                                            |
| ----------- | ----------------------------- | ------------------------------------------------------------------------------------------ |
| Static      | TypeScript, ESLint, Prettier  | Strict types, Next.js rules, consistent source                                             |
| Unit        | Vitest, React Testing Library | Components, standings, normalization, ratings, simulation, probability, saves              |
| Integration | Vitest, ExcelJS               | Qualification, squads, ratings, simulation, probability, game flow, presentation, workbook |
| Property    | fast-check                    | Bracket, rating, simulation, and probability invariants                                    |
| End-to-end  | Playwright Chromium           | Navigation, desktop/mobile diagnostic routes, and playable progress views                  |
| Data        | TypeScript validation scripts | Reject invalid tournament, squad, or rating data                                           |
| Database    | Prisma CLI and PGlite socket  | Validate migrations and run the PostgreSQL seed twice                                      |
| Build       | Next.js production build      | Route compilation, server/client boundaries, and static generation                         |

## Commands

Run the non-browser gate:

```bash
npm run check
```

Run the browser gate after installing Chromium:

```bash
npx playwright install chromium
npm run test:e2e
npm run db:smoke
```

Simulation tests use deterministic random seeds and validate replayability,
monotonic event time, event-derived scores, and batch performance. Every phase
status entry records exact results and any intentionally unavailable check.
Probability tests validate normalization, bounds, live-state monotonicity,
red-card directional effects, and analytical-vs-simulated calibration tolerance.
Game-flow tests validate tournament creation, selected-team pacing, accelerated
completion to one champion, simultaneous-batch tracking, group/bracket
presentation snapshots, save migration, invalid import rejection, and browser
save/export/reset behavior.

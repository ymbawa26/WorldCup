# Testing

## Test layers

| Layer       | Tool                          | Current purpose                                                    |
| ----------- | ----------------------------- | ------------------------------------------------------------------ |
| Static      | TypeScript, ESLint, Prettier  | Strict types, Next.js rules, consistent source                     |
| Unit        | Vitest, React Testing Library | Components, standings, and data normalization                      |
| Integration | Vitest, ExcelJS               | Qualification, squads, seed plans, and workbook products           |
| Property    | fast-check                    | Complete bracket invariants and shared utility properties          |
| End-to-end  | Playwright Chromium           | Navigation and desktop/mobile diagnostic routes                    |
| Data        | TypeScript validation scripts | Reject invalid tournament or squad data                            |
| Database    | Prisma CLI and PGlite socket  | Validate migration and run the PostgreSQL seed twice               |
| Build       | Next.js production build      | Route compilation, server/client boundaries, and static generation |

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

Tests must use deterministic random seeds once simulation randomness is introduced. Every phase status entry records exact results and any intentionally unavailable check.

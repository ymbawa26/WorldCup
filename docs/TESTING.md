# Testing

## Test layers

| Layer       | Tool                          | Phase 1 purpose                                                       |
| ----------- | ----------------------------- | --------------------------------------------------------------------- |
| Static      | TypeScript, ESLint, Prettier  | Strict types, Next.js rules, consistent source                        |
| Unit        | Vitest, React Testing Library | Accessible component behavior                                         |
| Integration | Vitest, React Testing Library | Landing-page state and responsive navigation disclosure               |
| Property    | fast-check                    | Establish property-test execution before simulation invariants arrive |
| End-to-end  | Playwright Chromium           | Navigation, disabled product actions, mobile menu, skip link          |
| Data        | TypeScript validation script  | Reject a partially introduced Phase 2 dataset                         |
| Database    | Prisma CLI                    | Validate PostgreSQL schema/configuration without connecting           |
| Build       | Next.js production build      | Route compilation, server/client boundaries, and static generation    |

## Commands

Run the non-browser gate:

```bash
npm run check
```

Run the browser gate after installing Chromium:

```bash
npx playwright install chromium
npm run test:e2e
```

Tests must use deterministic random seeds once simulation randomness is introduced. Every phase status entry records exact results and any intentionally unavailable check.

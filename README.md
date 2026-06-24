# World Stage

World Stage is a browser-based management simulation for the 48-team 2026 men's international football tournament. The project is being built from verified tournament data and deterministic simulation systems outward; it does not import real tournament results into a new game.

## Current status

Phase 1 establishes the application foundation only:

- Next.js 16 App Router, React 19, strict TypeScript, and Tailwind CSS 4
- Original responsive application shell with keyboard and reduced-motion support
- TanStack Query, Zustand, Zod, next-intl-compatible messages, Recharts, Lucide, and Framer Motion dependencies
- Prisma 7 configured for PostgreSQL
- Vitest, React Testing Library, fast-check, Playwright, ESLint, Prettier, and GitHub Actions

Tournament creation is intentionally disabled until the official tournament structure and qualification engine pass Phase 2 validation.

## Requirements

- Node.js 20.19 or later (the project is validated with 20.20.2)
- npm 10 or later
- PostgreSQL for future data phases; Phase 1 checks do not connect to a database
- Chromium for Playwright (`npx playwright install chromium`)

## Setup

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000` for local development.

## Validation

```bash
npm run typecheck
npm run lint
npm run format:check
npm run test:unit
npm run test:integration
npm run test:property
npm run validate:data
npm run db:validate
npm run build
npm run test:e2e
```

`npm run check` runs every check above except Playwright. E2E tests start their own development server.

## Documentation

- [Implementation plan](docs/IMPLEMENTATION_PLAN.md)
- [Implementation status](docs/IMPLEMENTATION_STATUS.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Testing](docs/TESTING.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Known limitations](docs/KNOWN_LIMITATIONS.md)

## Product identity

The project uses an original visual identity and is not affiliated with FIFA, EA, or their competitions and products. Protected logos, broadcast packages, proprietary ratings, player photographs, and fonts are not used.

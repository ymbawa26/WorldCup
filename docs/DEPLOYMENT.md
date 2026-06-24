# Deployment

## Phase 1 readiness

The application is structured for Vercel but has not been deployed. No production database is provisioned and no deployment claim has been made.

## Required environment variables

| Variable              | Scope       | Purpose                                                        |
| --------------------- | ----------- | -------------------------------------------------------------- |
| `DATABASE_URL`        | Server only | PostgreSQL connection; required once database operations begin |
| `NEXT_PUBLIC_APP_URL` | Public      | Canonical application origin for metadata                      |

## Future production sequence

1. Provision a supported hosted PostgreSQL database.
2. Configure preview and production environment variables separately.
3. Run validated migrations rather than `db push`.
4. Run the idempotent production seed against the versioned dataset.
5. Execute typecheck, lint, tests, Prisma validation, and production build.
6. Deploy to Vercel and run public browser smoke tests.

Production migration, seed, rollback, security, and Vercel verification instructions will be completed in Phase 10.

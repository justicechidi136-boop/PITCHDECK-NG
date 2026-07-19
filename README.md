# PitchDeck Nigeria

PitchDeck Nigeria connects young Nigerian innovators, startups, students, researchers, inventors, and community organisations with government agencies, corporate organisations, angel investors, VC firms, NGOs, universities, incubators, philanthropists, and Nigerian diaspora sponsors.

This repository contains the platform foundation: monorepo infrastructure, application shells, shared packages, local development services, and CI workflows.

## Tech stack

- Node.js 22 LTS
- pnpm (via Corepack)
- TypeScript (strict mode)
- Turborepo
- Next.js App Router (`apps/web`, `apps/admin-web`)
- NestJS (`apps/api`)
- PostgreSQL + Prisma ORM
- Redis
- MinIO (local S3-compatible storage)
- Docker Compose
- ESLint, Prettier, Jest, Supertest, Playwright, Zod

## Repository structure

```
apps/
  web/           Public innovator/sponsor platform shell
  admin-web/     Admin operations console shell
  api/           NestJS REST API
packages/
  database/      Prisma schema, migrations, seed scripts
  contracts/     Shared enums, API types, Zod validation
  ui/            Accessible shared UI components
  config/        Shared TS, ESLint, Tailwind, Prettier configs
  testing/       Reusable test factories and helpers
infrastructure/
  docker/        Local PostgreSQL, Redis, MinIO
  nginx/         Reverse proxy placeholder
docs/            Product, architecture, security, deployment docs
```

## Prerequisites

- Node.js 22+
- Corepack enabled
- Docker Desktop (for local PostgreSQL, Redis, MinIO)
- Windows users: use `pnpm.cmd` if PowerShell execution policy blocks `pnpm`

## Quick start (Windows)

```powershell
# Enable Corepack and pnpm
corepack enable
corepack prepare pnpm@9.15.4 --activate

# Install dependencies
pnpm.cmd install

# Copy environment template
copy .env.example .env

# Start local services
pnpm.cmd docker:up  # host ports default to 15432/16379/19000/19001 via `.env.example`

# Generate Prisma client and run migrations
pnpm.cmd db:generate
pnpm.cmd db:migrate
pnpm.cmd db:seed

# Start all apps in development
pnpm.cmd dev
```

## Quick start (macOS/Linux)

```bash
corepack enable
corepack prepare pnpm@9.15.4 --activate
pnpm install
cp .env.example .env
pnpm docker:up
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

## Development URLs

| Service    | URL                          |
| ---------- | ---------------------------- |
| Web        | http://localhost:3000        |
| Admin Web  | http://localhost:3001        |
| API        | http://localhost:4000/v1     |
| Swagger    | http://localhost:4000/v1/docs |
| MinIO Console | http://localhost:19001 (see `MINIO_CONSOLE_HOST_PORT`) |

## Common commands

```powershell
pnpm.cmd lint
pnpm.cmd typecheck
pnpm.cmd test
pnpm.cmd build
pnpm.cmd docker:down
```

## Scope of this foundation

Implemented:

- Monorepo scaffolding and shared configuration
- Public landing page shell with Nigerian innovation branding
- Admin console shell with protected route group placeholder
- API health endpoints with PostgreSQL and Redis readiness checks
- Prisma schema for core reference entities (users, roles, states, sectors, audit logs)
- Idempotent seed data for 37 states (36 + FCT) and 16 sectors
- Docker Compose for local dependencies
- CI workflow for lint, typecheck, tests, and production builds

Not implemented (future milestones):

- Authentication and authorization
- Pitch submission and review workflows
- Sponsorship, funding, payments, messaging, and challenges

## Documentation

- [AGENTS.md](./AGENTS.md) â€” AI agent and contributor guidance
- [docs/PRODUCT_REQUIREMENTS.md](./docs/PRODUCT_REQUIREMENTS.md)
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- [docs/SECURITY.md](./docs/SECURITY.md)
- [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)

## License

Proprietary â€” PitchDeck Nigeria.


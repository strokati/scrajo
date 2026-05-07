# Scrajo

Self-hosted job search automation. Add job board URLs, scrape listings on a schedule with AI-powered parsing, and track everything from a dashboard.

## What it does

1. **Add job boards** — LinkedIn, Indeed, StepStone, any site with job listings
2. **Scrape on schedule** — Playwright handles the browser, Claude AI parses the messy HTML into structured data
3. **Review and filter** — Dashboard shows listings with search, tags, and status tracking
4. **Apply** — (Phase 2) Auto-submit applications using your profile

## Tech stack

| Layer | Tech |
|---|---|
| API | Fastify, TypeScript, Prisma, PostgreSQL |
| Web | React 18, Vite, shadcn/ui, Tailwind CSS |
| Scraper | Playwright, Anthropic SDK |
| Worker | BullMQ, Redis |
| Shared | Zod schemas, TypeScript types |
| Deploy | Docker Compose, Coolify on Hetzner |

## Monorepo structure

```
apps/api          Fastify REST API + Prisma ORM
apps/web          React SPA (not yet implemented)
packages/scraper  Playwright + Claude AI parsing (not yet implemented)
packages/worker   BullMQ job processor (not yet implemented)
packages/shared   Zod schemas + shared TypeScript types
agent_docs/       Architecture, API reference, deployment guides
```

## Getting started

### Prerequisites

- Node.js 22+
- pnpm 10+
- Docker (for PostgreSQL and Redis)

### Setup

```bash
# Install dependencies
pnpm install

# Start PostgreSQL and Redis
pnpm db:up

# Configure environment
cp apps/api/.env.example apps/api/.env

# Run initial migration
pnpm --filter @scrajo/api exec prisma migrate dev --name init

# Start the API
pnpm --filter @scrajo/api run dev
```

The API runs at `http://localhost:3000`. Check health:

```bash
curl http://localhost:3000/health
```

### Run tests

```bash
pnpm --filter @scrajo/api test
```

## API endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check + DB status |
| GET | `/api/v1/sites` | List job sites (paginated) |
| POST | `/api/v1/sites` | Add a job site |
| PATCH | `/api/v1/sites/:id` | Update site config |
| DELETE | `/api/v1/sites/:id` | Soft-delete a site |
| POST | `/api/v1/sites/:id/scrape` | Enqueue a scrape job |
| GET | `/api/v1/jobs` | List jobs (cursor-paginated, filterable) |
| GET | `/api/v1/jobs/:id` | Get full job details |
| PATCH | `/api/v1/jobs/:id/status` | Update job status |
| GET | `/api/v1/queue/status` | BullMQ queue stats |
| DELETE | `/api/v1/queue/failed` | Clear failed jobs |

All endpoints accept/return JSON. Errors follow `{ error: string, code: string, statusCode: number }`.

Full details in [`agent_docs/api-reference.md`](agent_docs/api-reference.md).

## Useful commands

```bash
pnpm dev            # Start Docker services + all workspaces
pnpm build          # Build all packages
pnpm lint           # Biome lint + format check
pnpm lint:fix       # Auto-fix lint/format issues
pnpm typecheck      # TypeScript check across all packages
pnpm db:up          # Start PostgreSQL + Redis
pnpm db:down        # Stop Docker services
```

## Documentation

- [`agent_docs/architecture.md`](agent_docs/architecture.md) — Service topology, data flow
- [`agent_docs/database-schema.md`](agent_docs/database-schema.md) — Prisma models and relations
- [`agent_docs/api-reference.md`](agent_docs/api-reference.md) — All endpoints with types
- [`agent_docs/scraping-patterns.md`](agent_docs/scraping-patterns.md) — Playwright + Claude AI patterns
- [`agent_docs/deployment.md`](agent_docs/deployment.md) — Coolify/Hetzner deployment guide

## License

Private

# Architecture

## Service Topology

```
                         ┌───────────┐
                         │  Browser  │
                         │  (User)   │
                         └─────┬─────┘
                               │
                         ┌─────▼─────┐
                         │  apps/web  │
                         │ React SPA  │
                         │ Vite+Tail  │
                         └─────┬─────┘
                               │ HTTP (REST API)
                         ┌─────▼─────┐
                         │  apps/api  │
                         │  Fastify   │
                         │  Prisma    │
                         └──┬─────┬──┘
                            │     │
              ┌─────────────┘     └──────────────┐
              │                                  │
      ┌───────▼────────┐                ┌────────▼───────┐
      │   PostgreSQL    │                │ packages/worker │
      │   (Prisma ORM)  │                │    BullMQ       │
      └───────┬────────┘                └────────┬───────┘
              │                                  │
              │                           ┌──────▼───────┐
              │                           │ packages/    │
              │                           │ scraper      │
              │                           │ Playwright + │
              │                           │ Claude AI    │
              │                           └──────┬───────┘
              │                                  │
              │                           ┌──────▼───────┐
              │                           │  Job Boards   │
              │                           │ LinkedIn,     │
              │                           │ Indeed, etc.  │
              │                           └──────────────┘
              │                                  │
              └──────── parsed listing data ─────┘

              ┌──────────────┐
              │    Redis     │
              │ (BullMQ      │◄── apps/api enqueues jobs
              │  backend)    │──► packages/worker dequeues
              └──────────────┘
```

## Service Responsibilities

| Service | Owns | Calls | Reads/Writes |
|---------|------|-------|-------------|
| **apps/web** | React SPA, UI state, client-side routing | apps/api via REST | None (stateless) |
| **apps/api** | REST endpoints, auth, business logic | PostgreSQL, Redis (enqueue) | All DB tables |
| **packages/worker** | Job queue processing, scheduling | packages/scraper, apps/api | ScrapeJob status updates |
| **packages/scraper** | Browser automation, AI parsing | Job boards (external), Claude API | Returns parsed data |
| **packages/shared** | Zod schemas, TypeScript types | None | None (library) |

## Data Flows

### Flow 1: Scrape Job Lifecycle

1. User adds a job site URL via Web UI
2. User creates a ScrapeJob (selects site, enters query/location)
3. API validates input with Zod, writes `ScrapeJob` to PostgreSQL
4. API enqueues job in BullMQ (Redis)
5. Worker dequeues job, sets status to `RUNNING`
6. Worker calls `packages/scraper` with site config + query
7. Scraper launches Playwright, navigates job board pages
8. For each page: fetch HTML → send to Claude API → receive structured JSON
9. Scraper returns parsed listings to worker
10. Worker writes `JobListing` records to DB, sets ScrapeJob to `COMPLETED`
11. Web UI polls or receives listings via API

### Flow 2: Application Tracking

1. User reviews JobListings in dashboard (filter by status, tags, salary)
2. User marks listings as SAVED or REJECTED
3. For Phase 2: user selects a listing + profile → API creates Application
4. Worker processes application (auto-fill, submit)
5. Application status tracked through pipeline: DRAFT → SUBMITTED → INTERVIEWING → OFFERED/REJECTED

## Inter-Service Communication

| From | To | Protocol | Purpose |
|------|----|----------|---------|
| web | api | REST (HTTP) | All CRUD operations |
| api | Redis | BullMQ | Enqueue scrape jobs |
| worker | Redis | BullMQ | Dequeue jobs, report progress |
| worker | scraper | Function call | Execute scrape |
| scraper | Job boards | HTTPS | Fetch job listings |
| scraper | Claude API | HTTPS | Parse HTML to structured data |
| api | PostgreSQL | Prisma (TCP) | All data persistence |

## Key Design Decisions

- **BullMQ for job queue**: Reliable, Redis-backed, supports retries/delays/priorities
- **Prisma for ORM**: Type-safe queries, migration management, generated client
- **Playwright over Puppeteer**: Better cross-browser, auto-wait, network interception
- **Claude AI for parsing**: Adapts to any job board HTML without custom selectors per site
- **Monorepo**: Shared types, atomic changes, single CI pipeline

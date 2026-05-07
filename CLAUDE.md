# Scrajo

## WHY
Self-hosted job search automation: scrape job boards, parse listings with AI, auto-apply based on user profiles. Eliminates manual job hunting.

## WHAT (monorepo layout)
```
apps/api          - Fastify REST API + Prisma ORM + PostgreSQL
apps/web          - React 18 SPA with shadcn/ui + Tailwind CSS + Vite
packages/scraper  - Playwright browser automation + Claude AI parsing
packages/worker   - BullMQ job queue processor + Redis
packages/shared   - Zod schemas, shared TypeScript types
```

## HOW (data flow)
1. User adds job board URLs via Web UI
2. API creates ScrapeJob → Worker picks from BullMQ queue
3. Scraper fetches pages with Playwright → Claude AI parses structured data
4. API stores JobListings → User reviews/filters/applies

## Commands
```
pnpm dev           Start docker services + all workspaces in dev mode
pnpm build         Build all packages
pnpm lint          Biome check across all packages
pnpm lint:fix      Auto-fix lint/format issues
pnpm typecheck     TypeScript check all packages
pnpm db:up         Start postgres + redis only
pnpm db:down       Stop docker services
```

## Key Conventions
- PostgreSQL schema managed via Prisma (see agent_docs/database-schema.md)
- API routes validated with Zod schemas from packages/shared (see agent_docs/api-reference.md)
- All scraping goes through packages/scraper (see agent_docs/scraping-patterns.md)
- Deployment via Docker Compose + Coolify (see agent_docs/deployment.md)
- No `any` types — use Zod schemas for all runtime validation
- Error format: `{ error: string, code: string, details?: unknown }`

## Documentation
Full architecture, API reference, and deployment guides in **agent_docs/**

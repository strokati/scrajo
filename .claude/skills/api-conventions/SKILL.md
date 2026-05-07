---
name: REST API Design Rules
description: >
  Use when the user asks to "create an API endpoint", "add a route", "design a REST endpoint",
  "define request/response types", or "build an API feature".
version: 0.1.0
---

# REST API Design Rules

## Route organization

- One file per resource in `apps/api/src/routes/`
- Register routes in `apps/api/src/routes/index.ts`
- Example: `routes/job-sites.ts`, `routes/scrape-jobs.ts`, `routes/job-listings.ts`

## URL conventions

- Plural nouns for resources: `/api/job-sites`, `/api/scrape-jobs`, `/api/job-listings`
- Kebab-case for multi-word resources: `/api/job-listings` (not `/api/jobListings`)
- Use standard HTTP methods: `GET` read, `POST` create, `PATCH` update, `DELETE` remove

## Request/response format

- JSON body for POST/PATCH requests
- camelCase for JSON field names: `{ jobSiteId: "...", maxPages: 5 }`
- Response wrapper for single items: `{ data: T }`
- Response wrapper for lists: `{ data: T[], total: number, page: number, limit: number }`

## Validation

All inputs must be validated with Zod schemas from `packages/shared/src/schemas/`:

```typescript
import { createJobSiteSchema } from '@scrajo/shared';

app.post('/api/job-sites', {
  schema: {
    body: zodToJsonSchema(createJobSiteSchema),
  },
}, async (request, reply) => { ... });
```

Zod schemas are the single source of truth — derive TypeScript types and Fastify schemas from them.

## Pagination

All list endpoints accept `?page=1&limit=20` with defaults:
- `page`: defaults to 1, minimum 1
- `limit`: defaults to 20, minimum 1, maximum 100

Response shape:
```json
{
  "data": [...],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

## Error format

All errors follow this shape:
```json
{
  "error": "Human-readable message",
  "code": "ERROR_CODE_SNAKE_CASE"
}
```

Common error codes:
- `VALIDATION_ERROR` (400) — request body/params failed Zod validation
- `NOT_FOUND` (404) — resource not found
- `CONFLICT` (409) — duplicate resource
- `INTERNAL_ERROR` (500) — unexpected server error

## Filtering and search

- Filter by query params: `GET /api/job-listings?status=NEW&jobSiteId=abc`
- Text search via `?search=query` parameter
- Sort via `?sortBy=createdAt&sortOrder=desc`

See `agent_docs/api-reference.md` for the complete endpoint catalog.

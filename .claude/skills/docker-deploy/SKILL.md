---
name: Coolify Deploy Workflow
description: >
  Use when the user asks to "deploy to production", "deploy to staging", "push to Coolify",
  "update the server", "check deployment status", or "configure Coolify".
version: 0.1.0
---

# Coolify Deploy Workflow

## Pre-deploy checks

### 1. Verify local services

```bash
docker compose up -d
docker compose ps  # confirm postgres + redis are healthy
```

### 2. Run full quality gate

```bash
pnpm typecheck && pnpm lint && pnpm build
```

All three must pass with zero errors.

### 3. Verify environment variables

Check that all required env vars are set in Coolify UI:
- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string
- `ANTHROPIC_API_KEY` — Claude API key
- `NODE_ENV` — set to `production`

See `agent_docs/deployment.md` for the complete env var list.

## Deploy

### 4. Commit and push

```bash
git add .
git commit -m "descriptive message"
git push origin main
```

Coolify auto-detects the push via webhook and starts building.

### 5. Monitor deployment

- Check Coolify dashboard for build progress
- Verify health check endpoint: `GET https://scrajo.com/health` returns `{ status: "ok" }`
- Check container logs for startup errors

## Rollback

If deployment fails:
1. Check Coolify logs for the error
2. Verify environment variables in Coolify UI
3. If database migration failed, check `apps/api/prisma/migrations/` status
4. Use Coolify's rollback feature to revert to previous image
5. If needed, manually revert: `git revert HEAD && git push origin main`

## Post-deploy

- Verify `/health` endpoint returns 200
- Check that worker is processing jobs (monitor BullMQ queue in Redis)
- Confirm scheduled scraping is running

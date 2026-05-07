# Deployment Guide

## Infrastructure

**Server**: Hetzner CX22
- 2 vCPU (shared), 4GB RAM, 40GB SSD
- Located in Falkenstein (FSN1) or Nuremberg (NBG1)
- IPv4 + IPv6

**Platform**: Coolify (self-hosted PaaS)
- Runs on the same Hetzner server
- Manages Docker containers, SSL, domains, env vars

## Coolify Setup

### Initial Installation

1. Install Coolify on fresh Hetzner server:
   ```bash
   curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
   ```
2. Access Coolify UI at `http://<server-ip>:8000`
3. Set admin password and register

### Project Configuration

1. **Connect GitHub repo**: Link `strokati/scrajo` repository
2. **Set build type**: Docker Compose
3. **Configure services**:
   - `apps/api`: Node.js service, expose port 3000
   - `apps/web`: Static build, serve via Caddy/nginx
   - `packages/worker`: Node.js service, no external port
4. **Domain**: Point `scrajo.com` DNS A record to Hetzner IP
5. **SSL**: Coolify auto-provisions Let's Encrypt certificates

## Environment Variables

Set these in Coolify UI → Project → Environment Variables:

### Required (all environments)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://scrajo:***@db:5432/scrajo` |
| `REDIS_URL` | Redis connection string | `redis://redis:6379` |
| `ANTHROPIC_API_KEY` | Claude API key | `sk-ant-***` |
| `NODE_ENV` | Environment | `production` |

### API Service

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | API server port | `3000` |
| `LOG_LEVEL` | Pino log level | `info` |

### Worker Service

| Variable | Description | Default |
|----------|-------------|---------|
| `CONCURRENCY` | Parallel job processors | `2` |
| `SCRAPE_TIMEOUT_MS` | Max scrape duration | `300000` |

## Dockerfiles

### apps/api (multi-stage)

```dockerfile
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter @scrajo/api build

FROM base AS runner
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/generated ./generated
COPY --from=build /app/apps/api/package.json ./
COPY --from=deps /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### apps/web (static build)

```dockerfile
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter @scrajo/web build

FROM nginx:alpine AS runner
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

## Health Checks

Configure in Coolify for each service:

| Service | Health Check URL | Expected | Interval |
|---------|-----------------|----------|----------|
| API | `GET http://api:3000/health` | `{ "status": "ok" }` + 200 | 30s |
| Web | `GET http://web:80/` | 200 | 30s |
| Worker | Internal BullMQ queue check | Not externally reachable | — |
| PostgreSQL | `pg_isready -U scrajo` | Exit 0 | 10s |
| Redis | `redis-cli ping` | `PONG` | 10s |

## Volumes

Persistent data volumes for production:

| Volume | Mount Point | Purpose |
|--------|------------|---------|
| `pgdata` | `/var/lib/postgresql/data` | PostgreSQL data |
| `redisdata` | `/data` | Redis persistence (AOF) |

## Backup Strategy

### PostgreSQL

Daily dump via cron job on the server:

```bash
# /etc/cron.d/scrajo-backup
0 3 * * * docker exec scrajo-postgres pg_dump -U scrajo scrajo | gzip > /backups/scrajo-$(date +\%Y\%m\%d).sql.gz
# Keep last 30 days
0 4 * * * find /backups -name "scrajo-*.sql.gz" -mtime +30 -delete
```

Optional: sync backups to Hetzner Storage Box via SFTP.

### Redis

Redis uses AOF persistence (append-only file). Data is job queue state — not critical if lost (jobs can be re-enqueued).

## Monitoring

- **Coolify built-in**: Container status, CPU/RAM usage, restart counts
- **Application logs**: `docker compose logs -f api worker`
- **BullMQ dashboard**: Consider adding `@bull-board/api` for queue visualization

## Scaling Considerations

Hetzner CX22 has limited resources (4GB RAM):

| Service | RAM Estimate | Scaling |
|---------|-------------|---------|
| Coolify | ~500MB | Fixed |
| PostgreSQL | ~500MB | Vertical only |
| Redis | ~100MB | Not needed |
| API | ~200MB | Vertical only |
| Worker | ~300MB | Horizontal (if RAM allows) |
| Scraper (Playwright) | ~500MB per instance | Bottleneck — max 2 concurrent |

Key constraint: Playwright browsers are memory-heavy. Limit `CONCURRENCY` to 2 on CX22. For higher throughput, upgrade to CX32 (8GB RAM).

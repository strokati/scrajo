---
name: db-migrations
description: >
    Use when the user asks to "create a migration", "run migrations", "update the database schema",
    "add a Prisma model", "reset the database", or "generate Prisma client".
version: 0.1.0
---

# Database Migrations

## Steps

### 1. Edit the schema

Edit `apps/api/prisma/schema.prisma` to add or modify models.
Refer to `agent_docs/database-schema.md` for model definitions and conventions.

### 2. Validate the schema

```bash
pnpm --filter @scrajo/api exec prisma validate
```

Fix any validation errors before proceeding.

### 3. Create the migration

```bash
pnpm --filter @scrajo/api exec prisma migrate dev --name <descriptive_name>
```

Use a descriptive name like `add_application_status_index` or `create_job_sites_table`.

### 4. Generate the client

```bash
pnpm --filter @scrajo/api exec prisma generate
```

The generated client outputs to `apps/api/generated/` (configured in schema.prisma).

### 5. Verify

Run the API dev server briefly to confirm the client imports work:

```bash
pnpm --filter @scrajo/api run dev
```

### Production migrations

```bash
pnpm --filter @scrajo/api exec prisma migrate deploy
```

This applies pending migrations without prompts. Run this in CI/CD or Coolify post-deploy hook.

## Naming conventions

- Use PascalCase for model names: `JobSite`, `ScrapeJob`, `JobListing`
- Use camelCase for field names: `jobSiteId`, `externalId`
- Use UPPER_SNAKE_CASE for enums: `PENDING`, `RUNNING`, `COMPLETED`
- Migration names: snake_case, descriptive: `add_index_on_job_site_id`

## Safety rules

- Never run `prisma migrate reset` in production
- Always review generated SQL before applying
- Add indexes for foreign keys and frequently queried fields
- Use `@default(uuid())` for primary keys

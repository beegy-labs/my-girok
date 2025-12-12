# Database Migration Guide

## Overview

This project uses **Prisma Migrate** for database schema management.

## Prerequisites

- PostgreSQL 16+ running
- `.env` file configured with `DATABASE_URL`

## Common Commands

### 1. Initialize First Migration

```bash
cd services/auth-service
pnpm prisma migrate dev --name init
```

This will:
- Create `prisma/migrations` directory
- Generate migration SQL files
- Apply migration to database
- Generate Prisma Client

### 2. Create New Migration (After Schema Changes)

```bash
pnpm prisma migrate dev --name <migration_name>
```

Example:
```bash
pnpm prisma migrate dev --name add_user_phone_field
```

### 3. Apply Migrations (Production)

```bash
pnpm prisma migrate deploy
```

Use this in production/staging environments.

### 4. Reset Database (Development Only)

```bash
pnpm prisma migrate reset
```

⚠️ **WARNING**: This will:
- Drop the database
- Create a new database
- Apply all migrations
- Run seed scripts (if any)

### 5. View Migration Status

```bash
pnpm prisma migrate status
```

Shows which migrations have been applied.

### 6. Generate Prisma Client

```bash
pnpm prisma generate
```

Run this after any schema changes or when setting up the project.

### 7. Open Prisma Studio (Database GUI)

```bash
pnpm prisma studio
```

Opens a web GUI at `http://localhost:5555` to view/edit data.

## Workflow

### Development Workflow

1. Edit `prisma/schema.prisma`
2. Run `pnpm prisma migrate dev --name <description>`
3. Prisma will:
   - Generate migration SQL
   - Apply to database
   - Regenerate Prisma Client

### Production Deployment Workflow

1. Commit migration files to Git
2. In production environment:
   ```bash
   pnpm prisma migrate deploy
   ```

## Migration File Structure

```
prisma/
├── schema.prisma
└── migrations/
    ├── 20250106_init/
    │   └── migration.sql
    ├── 20250107_add_user_phone/
    │   └── migration.sql
    └── migration_lock.toml
```

## Best Practices

1. **Always commit migration files** - They are part of your codebase
2. **Test migrations locally first** - Before deploying to production
3. **Use descriptive migration names** - e.g., `add_user_phone` not `update`
4. **Never edit migration files manually** - Let Prisma generate them
5. **Backup production database** - Before running migrations

## Troubleshooting

### Migration failed

```bash
# Check current status
pnpm prisma migrate status

# If needed, mark as rolled back
pnpm prisma migrate resolve --rolled-back <migration_name>

# Or mark as applied (if manually fixed)
pnpm prisma migrate resolve --applied <migration_name>
```

### Schema drift detected

If your database schema doesn't match `schema.prisma`:

```bash
# Development: Reset and re-apply
pnpm prisma migrate reset

# Production: Create a migration to fix drift
pnpm prisma migrate dev --name fix_schema_drift
```

## Environment Variables

Ensure these are set in `.env`:

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/auth_db?schema=public"
```

For production, use connection pooling:

```bash
DATABASE_URL="postgresql://user:password@host:5432/auth_db?schema=public&connection_limit=10&pool_timeout=20"
```

## Alternative Tools (Not Recommended for This Project)

While Prisma Migrate is recommended, here are alternatives:

1. **Flyway** - Java-based, SQL file migrations
2. **Liquibase** - XML/SQL based, enterprise features
3. **TypeORM Migrations** - If using TypeORM instead of Prisma
4. **node-pg-migrate** - Programmatic migrations for PostgreSQL
5. **Knex.js Migrations** - SQL query builder with migrations

**Why Prisma Migrate?**
- Already using Prisma ORM
- Type-safe database access
- Automatic migration generation
- Better developer experience

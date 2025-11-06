# Database Migration Guide

## Initial Migration

This is the initial migration for the auth-service database schema.

### Tables Created

1. **users** - User accounts with multi-provider authentication
2. **sessions** - Refresh token sessions
3. **domain_access_tokens** - Time-limited domain access tokens
4. **oauth_provider_configs** - OAuth provider on/off configuration

### Running Migrations

#### Development Environment

```bash
# Navigate to auth-service
cd services/auth-service

# Generate Prisma client
pnpm prisma:generate

# Create and run migration
pnpm prisma migrate dev --name init

# This will:
# 1. Create migration SQL file in prisma/migrations/
# 2. Apply migration to development database
# 3. Regenerate Prisma client
```

#### Staging Environment

```bash
# Deploy migrations (no prompt)
pnpm prisma migrate deploy

# This applies pending migrations to staging database
```

#### Production Environment

```bash
# IMPORTANT: Always test in staging first!
# Deploy migrations
pnpm prisma migrate deploy

# Monitor application after deployment
```

### Migration Workflow (Git Flow)

```
feature/oauth-config → develop
  ├── Create migration in dev
  └── Commit migration files

develop → release/v1.0.0
  └── Apply migration to staging

release/v1.0.0 → main
  └── Apply migration to production
```

### Database Connection Strings

#### Development
```
postgresql://dev_girok_user:dev_girok_user@db-postgres-001.beegy.net:5432/dev_girok?schema=public
```

#### Staging/Release
```
postgresql://girok_user:girok_user@db-postgres-001.beegy.net:5432/girok?schema=public
```

#### Production
```
postgresql://${SEALED_DB_USER}:${SEALED_DB_PASSWORD}@db-postgres-001.beegy.net:5432/girok_prod?schema=public
```

### Rollback Strategy

If migration fails:

```bash
# Rollback last migration (if possible)
# Prisma doesn't support automatic rollback
# You must manually write a down migration

# 1. Create rollback migration
pnpm prisma migrate dev --name rollback_oauth_config

# 2. Write SQL to reverse changes
# Edit the generated migration file

# 3. Apply rollback
pnpm prisma migrate deploy
```

### Schema Changes in This Migration

```sql
-- Create users table
CREATE TABLE "users" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" TEXT UNIQUE NOT NULL,
  "password" TEXT,
  "name" TEXT,
  "avatar" TEXT,
  "role" TEXT NOT NULL DEFAULT 'USER',
  "provider" TEXT NOT NULL DEFAULT 'LOCAL',
  "providerId" TEXT,
  "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL
);

-- Create sessions table
CREATE TABLE "sessions" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "refreshToken" TEXT UNIQUE NOT NULL,
  "expiresAt" TIMESTAMP NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create domain_access_tokens table
CREATE TABLE "domain_access_tokens" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "domain" TEXT NOT NULL,
  "token" TEXT UNIQUE NOT NULL,
  "expiresAt" TIMESTAMP NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create oauth_provider_configs table
CREATE TABLE "oauth_provider_configs" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "provider" TEXT UNIQUE NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "displayName" TEXT NOT NULL,
  "description" TEXT,
  "clientId" TEXT,
  "clientSecret" TEXT,
  "callbackUrl" TEXT,
  "updatedAt" TIMESTAMP NOT NULL,
  "updatedBy" TEXT
);

-- Create indexes
CREATE INDEX "users_email_idx" ON "users"("email");
CREATE INDEX "users_provider_providerId_idx" ON "users"("provider", "providerId");
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");
CREATE INDEX "sessions_refreshToken_idx" ON "sessions"("refreshToken");
CREATE INDEX "domain_access_tokens_userId_idx" ON "domain_access_tokens"("userId");
CREATE INDEX "domain_access_tokens_domain_idx" ON "domain_access_tokens"("domain");
CREATE INDEX "domain_access_tokens_token_idx" ON "domain_access_tokens"("token");
```

### Seeding OAuth Provider Configs (Optional)

After migration, you can seed default OAuth providers:

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Seed OAuth providers
  await prisma.oAuthProviderConfig.createMany({
    data: [
      {
        provider: 'GOOGLE',
        enabled: true,
        displayName: 'Google',
        description: 'Login with Google',
      },
      {
        provider: 'KAKAO',
        enabled: true,
        displayName: 'Kakao',
        description: 'Login with Kakao',
      },
      {
        provider: 'NAVER',
        enabled: true,
        displayName: 'Naver',
        description: 'Login with Naver',
      },
    ],
    skipDuplicates: true,
  });

  console.log('OAuth providers seeded');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Run seed:
```bash
pnpm prisma db seed
```

### Verification

After migration, verify tables:

```sql
-- Connect to database
psql $DATABASE_URL

-- List tables
\dt

-- Check users table
\d users

-- Check oauth_provider_configs table
\d oauth_provider_configs

-- Verify indexes
\di
```

### Troubleshooting

#### Issue: Migration fails with "relation already exists"

```bash
# Reset database (CAUTION: Deletes all data)
pnpm prisma migrate reset

# Then rerun migration
pnpm prisma migrate dev
```

#### Issue: Prisma client out of sync

```bash
# Regenerate Prisma client
pnpm prisma:generate
```

#### Issue: Cannot connect to database

Check:
1. Database URL in .env file
2. Database server is running
3. Firewall allows connection
4. Credentials are correct

### Next Steps

1. ✅ Run migration in development
2. ⏳ Test all auth endpoints
3. ⏳ Seed OAuth provider configs
4. ⏳ Deploy to staging
5. ⏳ QA testing
6. ⏳ Deploy to production

## References

- [Prisma Migrate](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Prisma Client](https://www.prisma.io/docs/concepts/components/prisma-client)
- [Migration Troubleshooting](https://www.prisma.io/docs/guides/migrate/troubleshooting)

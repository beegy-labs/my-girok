-- Migration: snake_case naming convention for all columns
-- This migration renames all camelCase columns to snake_case to follow PostgreSQL best practices

-- ========== USERS TABLE ==========

-- Drop indexes that reference old columns
DROP INDEX IF EXISTS "users_provider_providerId_idx";

-- Add new columns with snake_case names, copy data, then drop old columns
ALTER TABLE "users" ADD COLUMN "created_at" TIMESTAMP(3);
UPDATE "users" SET "created_at" = "createdAt";
ALTER TABLE "users" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "users" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "users" DROP COLUMN "createdAt";

ALTER TABLE "users" ADD COLUMN "updated_at" TIMESTAMP(3);
UPDATE "users" SET "updated_at" = "updatedAt";
ALTER TABLE "users" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "users" DROP COLUMN "updatedAt";

ALTER TABLE "users" ADD COLUMN "email_verified" BOOLEAN DEFAULT false;
UPDATE "users" SET "email_verified" = "emailVerified";
ALTER TABLE "users" ALTER COLUMN "email_verified" SET NOT NULL;
ALTER TABLE "users" DROP COLUMN "emailVerified";

ALTER TABLE "users" ADD COLUMN "provider_id" TEXT;
UPDATE "users" SET "provider_id" = "providerId";
ALTER TABLE "users" DROP COLUMN "providerId";

-- Create new index with snake_case columns
CREATE INDEX "users_provider_provider_id_idx" ON "users"("provider", "provider_id");

-- ========== SESSIONS TABLE ==========

-- Drop foreign keys and indexes
ALTER TABLE "sessions" DROP CONSTRAINT IF EXISTS "sessions_userId_fkey";
DROP INDEX IF EXISTS "sessions_userId_idx";
DROP INDEX IF EXISTS "sessions_refreshToken_idx";
DROP INDEX IF EXISTS "sessions_refreshToken_key";

-- Rename columns
ALTER TABLE "sessions" ADD COLUMN "user_id" TEXT;
UPDATE "sessions" SET "user_id" = "userId";
ALTER TABLE "sessions" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "sessions" DROP COLUMN "userId";

ALTER TABLE "sessions" ADD COLUMN "refresh_token" TEXT;
UPDATE "sessions" SET "refresh_token" = "refreshToken";
ALTER TABLE "sessions" ALTER COLUMN "refresh_token" SET NOT NULL;
ALTER TABLE "sessions" DROP COLUMN "refreshToken";

ALTER TABLE "sessions" ADD COLUMN "expires_at" TIMESTAMP(3);
UPDATE "sessions" SET "expires_at" = "expiresAt";
ALTER TABLE "sessions" ALTER COLUMN "expires_at" SET NOT NULL;
ALTER TABLE "sessions" DROP COLUMN "expiresAt";

ALTER TABLE "sessions" ADD COLUMN "created_at" TIMESTAMP(3);
UPDATE "sessions" SET "created_at" = "createdAt";
ALTER TABLE "sessions" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "sessions" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "sessions" DROP COLUMN "createdAt";

-- Recreate indexes and foreign keys
CREATE UNIQUE INDEX "sessions_refresh_token_key" ON "sessions"("refresh_token");
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");
CREATE INDEX "sessions_refresh_token_idx" ON "sessions"("refresh_token");
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ========== DOMAIN_ACCESS_TOKENS TABLE ==========

-- Drop foreign keys and indexes
ALTER TABLE "domain_access_tokens" DROP CONSTRAINT IF EXISTS "domain_access_tokens_userId_fkey";
DROP INDEX IF EXISTS "domain_access_tokens_userId_idx";

-- Rename columns
ALTER TABLE "domain_access_tokens" ADD COLUMN "user_id" TEXT;
UPDATE "domain_access_tokens" SET "user_id" = "userId";
ALTER TABLE "domain_access_tokens" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "domain_access_tokens" DROP COLUMN "userId";

ALTER TABLE "domain_access_tokens" ADD COLUMN "expires_at" TIMESTAMP(3);
UPDATE "domain_access_tokens" SET "expires_at" = "expiresAt";
ALTER TABLE "domain_access_tokens" ALTER COLUMN "expires_at" SET NOT NULL;
ALTER TABLE "domain_access_tokens" DROP COLUMN "expiresAt";

ALTER TABLE "domain_access_tokens" ADD COLUMN "created_at" TIMESTAMP(3);
UPDATE "domain_access_tokens" SET "created_at" = "createdAt";
ALTER TABLE "domain_access_tokens" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "domain_access_tokens" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "domain_access_tokens" DROP COLUMN "createdAt";

-- Recreate indexes and foreign keys
CREATE INDEX "domain_access_tokens_user_id_idx" ON "domain_access_tokens"("user_id");
ALTER TABLE "domain_access_tokens" ADD CONSTRAINT "domain_access_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ========== OAUTH_PROVIDER_CONFIGS TABLE ==========

-- Rename columns
ALTER TABLE "oauth_provider_configs" ADD COLUMN "display_name" TEXT;
UPDATE "oauth_provider_configs" SET "display_name" = "displayName";
ALTER TABLE "oauth_provider_configs" ALTER COLUMN "display_name" SET NOT NULL;
ALTER TABLE "oauth_provider_configs" DROP COLUMN "displayName";

ALTER TABLE "oauth_provider_configs" ADD COLUMN "client_id" TEXT;
UPDATE "oauth_provider_configs" SET "client_id" = "clientId";
ALTER TABLE "oauth_provider_configs" DROP COLUMN "clientId";

ALTER TABLE "oauth_provider_configs" ADD COLUMN "client_secret" TEXT;
UPDATE "oauth_provider_configs" SET "client_secret" = "clientSecret";
ALTER TABLE "oauth_provider_configs" DROP COLUMN "clientSecret";

ALTER TABLE "oauth_provider_configs" ADD COLUMN "callback_url" TEXT;
UPDATE "oauth_provider_configs" SET "callback_url" = "callbackUrl";
ALTER TABLE "oauth_provider_configs" DROP COLUMN "callbackUrl";

ALTER TABLE "oauth_provider_configs" ADD COLUMN "updated_at" TIMESTAMP(3);
UPDATE "oauth_provider_configs" SET "updated_at" = "updatedAt";
ALTER TABLE "oauth_provider_configs" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "oauth_provider_configs" DROP COLUMN "updatedAt";

ALTER TABLE "oauth_provider_configs" ADD COLUMN "updated_by" TEXT;
UPDATE "oauth_provider_configs" SET "updated_by" = "updatedBy";
ALTER TABLE "oauth_provider_configs" DROP COLUMN "updatedBy";

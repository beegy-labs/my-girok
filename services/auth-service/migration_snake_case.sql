-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- DropForeignKey
ALTER TABLE "public"."sessions" DROP CONSTRAINT "sessions_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."domain_access_tokens" DROP CONSTRAINT "domain_access_tokens_user_id_fkey";

-- DropIndex
DROP INDEX "public"."users_provider_provider_id_idx";

-- DropIndex
DROP INDEX "public"."sessions_refresh_token_key";

-- DropIndex
DROP INDEX "public"."sessions_user_id_idx";

-- DropIndex
DROP INDEX "public"."sessions_refresh_token_idx";

-- DropIndex
DROP INDEX "public"."domain_access_tokens_user_id_idx";

-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "created_at",
DROP COLUMN "email_verified",
DROP COLUMN "provider_id",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "providerId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."sessions" DROP COLUMN "created_at",
DROP COLUMN "expires_at",
DROP COLUMN "refresh_token",
DROP COLUMN "user_id",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "expiresAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "refreshToken" TEXT NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."domain_access_tokens" DROP COLUMN "created_at",
DROP COLUMN "expires_at",
DROP COLUMN "user_id",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "expiresAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."oauth_provider_configs" DROP COLUMN "callback_url",
DROP COLUMN "client_id",
DROP COLUMN "client_secret",
DROP COLUMN "display_name",
DROP COLUMN "updated_at",
DROP COLUMN "updated_by",
ADD COLUMN     "callbackUrl" TEXT,
ADD COLUMN     "clientId" TEXT,
ADD COLUMN     "clientSecret" TEXT,
ADD COLUMN     "displayName" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updatedBy" TEXT;

-- CreateIndex
CREATE INDEX "users_provider_providerId_idx" ON "public"."users"("provider" ASC, "providerId" ASC);

-- CreateIndex
CREATE INDEX "sessions_refreshToken_idx" ON "public"."sessions"("refreshToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refreshToken_key" ON "public"."sessions"("refreshToken" ASC);

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "public"."sessions"("userId" ASC);

-- CreateIndex
CREATE INDEX "domain_access_tokens_userId_idx" ON "public"."domain_access_tokens"("userId" ASC);

-- AddForeignKey
ALTER TABLE "public"."domain_access_tokens" ADD CONSTRAINT "domain_access_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AlterTable: Add username column to users table
-- Username must be unique and used for public profile URLs (/:username)

-- Step 1: Add username column as nullable first
ALTER TABLE "users" ADD COLUMN "username" TEXT;

-- Step 2: Generate unique usernames for existing users (email prefix + random suffix)
UPDATE "users" SET "username" = CONCAT(
  LOWER(SPLIT_PART("email", '@', 1)),
  '_',
  SUBSTR(MD5(RANDOM()::text), 1, 6)
) WHERE "username" IS NULL;

-- Step 3: Make username NOT NULL and UNIQUE
ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- Step 4: Create index for faster username lookups
CREATE INDEX "users_username_idx" ON "users"("username");

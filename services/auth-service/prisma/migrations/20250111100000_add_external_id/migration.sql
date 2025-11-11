-- AlterTable: Add external_id column to users table
-- This ID is used for external partners (e.g., advertisers) to track users

-- Step 1: Add column as nullable first
ALTER TABLE "users" ADD COLUMN "external_id" VARCHAR(10);

-- Step 2: Create unique index
CREATE UNIQUE INDEX "users_external_id_key" ON "users"("external_id");

-- Step 3: Create regular index for faster lookups
CREATE INDEX "users_external_id_idx" ON "users"("external_id");

-- Note: Existing users will have NULL external_id
-- The application will generate external_id for new users automatically
-- Existing users will get external_id on first login (can be implemented later if needed)

-- AlterTable: Change skills.items from TEXT[] to JSONB
-- Migration: Convert existing string array data to JSON format

-- Step 1: Create a temporary column for new JSONB data
ALTER TABLE "skills" ADD COLUMN "items_new" JSONB;

-- Step 2: Migrate existing data from TEXT[] to JSONB
-- Convert each string in the array to a JSON object with 'name' field
UPDATE "skills"
SET "items_new" = (
  SELECT jsonb_agg(jsonb_build_object('name', item, 'description', ''))
  FROM unnest(items) AS item
);

-- Step 3: Drop the old column
ALTER TABLE "skills" DROP COLUMN "items";

-- Step 4: Rename the new column
ALTER TABLE "skills" RENAME COLUMN "items_new" TO "items";

-- Step 5: Set NOT NULL constraint (since items should always exist)
ALTER TABLE "skills" ALTER COLUMN "items" SET NOT NULL;

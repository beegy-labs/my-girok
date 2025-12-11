-- Convert all TIMESTAMP WITHOUT TIME ZONE columns to TIMESTAMP WITH TIME ZONE (TIMESTAMPTZ)
-- This ensures all timestamps are stored with timezone information (UTC)

-- Users table
ALTER TABLE "users"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(6) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(6) USING "updated_at" AT TIME ZONE 'UTC';

-- Sessions table
ALTER TABLE "sessions"
  ALTER COLUMN "expires_at" TYPE TIMESTAMPTZ(6) USING "expires_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(6) USING "created_at" AT TIME ZONE 'UTC';

-- Domain access tokens table
ALTER TABLE "domain_access_tokens"
  ALTER COLUMN "expires_at" TYPE TIMESTAMPTZ(6) USING "expires_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(6) USING "created_at" AT TIME ZONE 'UTC';

-- OAuth provider configs table
ALTER TABLE "oauth_provider_configs"
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(6) USING "updated_at" AT TIME ZONE 'UTC';

-- Note: Existing timestamp values are assumed to be in UTC
-- The AT TIME ZONE 'UTC' clause ensures proper conversion without changing the actual time value

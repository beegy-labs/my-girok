-- +goose Up
-- +goose StatementBegin

-- Add metadata column for extensible profile data
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Add soft delete support
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ(6);

-- Index for soft delete queries
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at
    ON profiles (deleted_at)
    WHERE deleted_at IS NULL;

-- Index for metadata queries (GIN for efficient JSONB lookups)
CREATE INDEX IF NOT EXISTS idx_profiles_metadata_gin
    ON profiles USING GIN (metadata jsonb_path_ops)
    WHERE metadata IS NOT NULL;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP INDEX IF EXISTS idx_profiles_metadata_gin;
DROP INDEX IF EXISTS idx_profiles_deleted_at;
ALTER TABLE profiles DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE profiles DROP COLUMN IF EXISTS metadata;

-- +goose StatementEnd

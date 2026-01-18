-- DRAFT: Do NOT execute - Design document only
-- Phase 2.1: Extend accounts table per Global User Schema
-- Target: identity_db.accounts

-- +goose Up

-- 1. SCIM 2.0 Core fields
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'user';
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS given_name TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS family_name TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS middle_name TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS nickname TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en';
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS profile_url TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS birthdate DATE;

-- 2. Identity Resolution fields
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS identity_graph_id UUID;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS linked_identities JSONB DEFAULT '[]';
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS device_fingerprints JSONB DEFAULT '[]';

-- 3. Service-specific extensions (JSONB)
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS commerce_profile JSONB;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS social_profile JSONB;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS content_profile JSONB;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS enterprise_profile JSONB;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS service_profiles JSONB DEFAULT '{}';

-- 4. Preferences
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{
  "email": true,
  "push": true,
  "sms": false,
  "in_app": true
}';
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS privacy_settings JSONB DEFAULT '{
  "profile_visibility": "public",
  "activity_visibility": "friends",
  "data_sharing": false
}';

-- 5. Metadata
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS schema_version INT DEFAULT 1;

-- 6. JSONB indexes
CREATE INDEX IF NOT EXISTS idx_accounts_enterprise_dept
  ON accounts USING BTREE ((enterprise_profile->>'department'));
CREATE INDEX IF NOT EXISTS idx_accounts_enterprise_emp_number
  ON accounts USING BTREE ((enterprise_profile->>'employee_number'));
CREATE INDEX IF NOT EXISTS idx_accounts_commerce_tier
  ON accounts USING BTREE ((commerce_profile->>'customer_tier'));
CREATE INDEX IF NOT EXISTS idx_accounts_linked_identities
  ON accounts USING GIN (linked_identities);

-- +goose Down
DROP INDEX IF EXISTS idx_accounts_linked_identities;
DROP INDEX IF EXISTS idx_accounts_commerce_tier;
DROP INDEX IF EXISTS idx_accounts_enterprise_emp_number;
DROP INDEX IF EXISTS idx_accounts_enterprise_dept;

ALTER TABLE accounts DROP COLUMN IF EXISTS schema_version;
ALTER TABLE accounts DROP COLUMN IF EXISTS privacy_settings;
ALTER TABLE accounts DROP COLUMN IF EXISTS notification_settings;
ALTER TABLE accounts DROP COLUMN IF EXISTS service_profiles;
ALTER TABLE accounts DROP COLUMN IF EXISTS enterprise_profile;
ALTER TABLE accounts DROP COLUMN IF EXISTS content_profile;
ALTER TABLE accounts DROP COLUMN IF EXISTS social_profile;
ALTER TABLE accounts DROP COLUMN IF EXISTS commerce_profile;
ALTER TABLE accounts DROP COLUMN IF EXISTS device_fingerprints;
ALTER TABLE accounts DROP COLUMN IF EXISTS linked_identities;
ALTER TABLE accounts DROP COLUMN IF EXISTS identity_graph_id;
ALTER TABLE accounts DROP COLUMN IF EXISTS birthdate;
ALTER TABLE accounts DROP COLUMN IF EXISTS gender;
ALTER TABLE accounts DROP COLUMN IF EXISTS bio;
ALTER TABLE accounts DROP COLUMN IF EXISTS cover_image_url;
ALTER TABLE accounts DROP COLUMN IF EXISTS avatar_url;
ALTER TABLE accounts DROP COLUMN IF EXISTS profile_url;
ALTER TABLE accounts DROP COLUMN IF EXISTS preferred_language;
ALTER TABLE accounts DROP COLUMN IF EXISTS nickname;
ALTER TABLE accounts DROP COLUMN IF EXISTS middle_name;
ALTER TABLE accounts DROP COLUMN IF EXISTS family_name;
ALTER TABLE accounts DROP COLUMN IF EXISTS given_name;
ALTER TABLE accounts DROP COLUMN IF EXISTS display_name;
ALTER TABLE accounts DROP COLUMN IF EXISTS user_type;
ALTER TABLE accounts DROP COLUMN IF EXISTS external_id;

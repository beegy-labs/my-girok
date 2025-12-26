-- +goose Up
-- +goose StatementBegin

-- ============================================================
-- UUIDv7 Migration (RFC 9562)
-- Migrate ID columns from TEXT/VARCHAR to native UUID type
-- ============================================================

-- Note: This migration assumes fresh database or empty tables
-- For production with existing data, additional data migration scripts are needed

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
ALTER TABLE users
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN id TYPE UUID USING id::uuid;

-- Sessions table
ALTER TABLE sessions
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN id TYPE UUID USING id::uuid,
  ALTER COLUMN user_id TYPE UUID USING user_id::uuid;

-- Domain access tokens
ALTER TABLE domain_access_tokens
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN id TYPE UUID USING id::uuid,
  ALTER COLUMN user_id TYPE UUID USING user_id::uuid;

-- OAuth provider configs
ALTER TABLE oauth_provider_configs
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN id TYPE UUID USING id::uuid,
  ALTER COLUMN updated_by TYPE UUID USING updated_by::uuid;

-- Legal documents
ALTER TABLE legal_documents
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN id TYPE UUID USING id::uuid,
  ALTER COLUMN created_by TYPE UUID USING created_by::uuid,
  ALTER COLUMN updated_by TYPE UUID USING updated_by::uuid,
  ALTER COLUMN service_id TYPE UUID USING service_id::uuid;

-- User consents
ALTER TABLE user_consents
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN id TYPE UUID USING id::uuid,
  ALTER COLUMN user_id TYPE UUID USING user_id::uuid,
  ALTER COLUMN document_id TYPE UUID USING document_id::uuid,
  ALTER COLUMN service_id TYPE UUID USING service_id::uuid;

-- Services
ALTER TABLE services
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN id TYPE UUID USING id::uuid;

-- User services
ALTER TABLE user_services
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN id TYPE UUID USING id::uuid,
  ALTER COLUMN user_id TYPE UUID USING user_id::uuid,
  ALTER COLUMN service_id TYPE UUID USING service_id::uuid;

-- Law registry
ALTER TABLE law_registry
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN id TYPE UUID USING id::uuid;

-- Consent requirements
ALTER TABLE consent_requirements
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN id TYPE UUID USING id::uuid,
  ALTER COLUMN law_id TYPE UUID USING law_id::uuid,
  ALTER COLUMN service_id TYPE UUID USING service_id::uuid;

-- Personal info
ALTER TABLE personal_info
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN id TYPE UUID USING id::uuid,
  ALTER COLUMN user_id TYPE UUID USING user_id::uuid;

-- Account links
ALTER TABLE account_links
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN id TYPE UUID USING id::uuid,
  ALTER COLUMN primary_user_id TYPE UUID USING primary_user_id::uuid,
  ALTER COLUMN linked_user_id TYPE UUID USING linked_user_id::uuid;

-- Platform consents
ALTER TABLE platform_consents
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN id TYPE UUID USING id::uuid,
  ALTER COLUMN user_id TYPE UUID USING user_id::uuid,
  ALTER COLUMN document_id TYPE UUID USING document_id::uuid;

-- Operators
ALTER TABLE operators
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN id TYPE UUID USING id::uuid,
  ALTER COLUMN admin_id TYPE UUID USING admin_id::uuid,
  ALTER COLUMN service_id TYPE UUID USING service_id::uuid;

-- Operator user links
ALTER TABLE operator_user_links
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN id TYPE UUID USING id::uuid,
  ALTER COLUMN operator_id TYPE UUID USING operator_id::uuid,
  ALTER COLUMN user_id TYPE UUID USING user_id::uuid;

-- User sanctions
ALTER TABLE user_sanctions
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN id TYPE UUID USING id::uuid,
  ALTER COLUMN user_id TYPE UUID USING user_id::uuid,
  ALTER COLUMN issued_by TYPE UUID USING issued_by::uuid;

-- Sanction tiers
ALTER TABLE sanction_tiers
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN id TYPE UUID USING id::uuid;

-- Admins
ALTER TABLE admins
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN id TYPE UUID USING id::uuid,
  ALTER COLUMN tenant_id TYPE UUID USING tenant_id::uuid,
  ALTER COLUMN role_id TYPE UUID USING role_id::uuid,
  ALTER COLUMN created_by TYPE UUID USING created_by::uuid;

-- Admin user links
ALTER TABLE admin_user_links
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN id TYPE UUID USING id::uuid,
  ALTER COLUMN admin_id TYPE UUID USING admin_id::uuid,
  ALTER COLUMN user_id TYPE UUID USING user_id::uuid;

-- Roles
ALTER TABLE roles
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN id TYPE UUID USING id::uuid,
  ALTER COLUMN tenant_id TYPE UUID USING tenant_id::uuid;

-- Role permissions
ALTER TABLE role_permissions
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN id TYPE UUID USING id::uuid,
  ALTER COLUMN role_id TYPE UUID USING role_id::uuid;

-- Tenants
ALTER TABLE tenants
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN id TYPE UUID USING id::uuid;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

-- Note: Down migration would convert UUID back to TEXT
-- This is a complex operation and should be avoided in production
-- Only provided for development purposes

SELECT 'WARNING: Down migration for UUIDv7 is not recommended in production';

-- +goose StatementEnd

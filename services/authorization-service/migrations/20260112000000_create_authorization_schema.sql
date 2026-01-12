-- +goose Up
-- Authorization Service Database Schema
-- Zanzibar-style ReBAC Implementation

-- ============================================
-- Authorization Tuples
-- ============================================
-- Stores relationship tuples in the format (user, relation, object)
-- This is the core data structure for Zanzibar-style ReBAC

CREATE TABLE authorization_tuples (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

    -- User/Subject of the relationship
    user_type VARCHAR(64) NOT NULL,
    user_id VARCHAR(256) NOT NULL,
    user_relation VARCHAR(64),

    -- Relation
    relation VARCHAR(64) NOT NULL,

    -- Object/Resource of the relationship
    object_type VARCHAR(64) NOT NULL,
    object_id VARCHAR(256) NOT NULL,

    -- Conditional tuple support
    condition_name VARCHAR(128),
    condition_context JSONB,

    -- Transaction tracking for consistency (Zookie)
    created_txid BIGINT NOT NULL,
    deleted_txid BIGINT,

    -- Timestamps
    created_at TIMESTAMPTZ(6) DEFAULT NOW()
);

-- Unique constraint to prevent duplicate tuples
CREATE UNIQUE INDEX idx_authorization_tuples_unique
    ON authorization_tuples (user_type, user_id, COALESCE(user_relation, ''), relation, object_type, object_id, COALESCE(deleted_txid, 0));

-- Index for user-centric queries (find objects user can access)
CREATE INDEX idx_authorization_tuples_user ON authorization_tuples (user_type, user_id, relation, object_type);

-- Index for object-centric queries (find users with access to object)
CREATE INDEX idx_authorization_tuples_object_relation ON authorization_tuples (object_type, object_id, relation);

-- Index for finding all tuples for a specific object
CREATE INDEX idx_authorization_tuples_object ON authorization_tuples (object_type, object_id);

-- Index for changelog processing
CREATE INDEX idx_authorization_tuples_created_txid ON authorization_tuples (created_txid);
CREATE INDEX idx_authorization_tuples_deleted_txid ON authorization_tuples (deleted_txid);


-- ============================================
-- Authorization Models (DSL)
-- ============================================
-- Stores compiled authorization models (DSL)

CREATE TABLE authorization_models (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

    -- Version identifier (ULID for sortability)
    version_id VARCHAR(26) NOT NULL,

    -- Schema version (e.g., '1.1')
    schema_version VARCHAR(10) NOT NULL,

    -- Original DSL source code
    dsl_source TEXT NOT NULL,

    -- Compiled model as JSON (TypeDefinitions)
    compiled_model JSONB NOT NULL,

    -- Type definitions extracted for quick lookup
    type_definitions JSONB NOT NULL,

    -- Whether this model is currently active
    is_active BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMPTZ(6) DEFAULT NOW()
);

CREATE INDEX idx_authorization_models_active ON authorization_models (is_active);
CREATE INDEX idx_authorization_models_version ON authorization_models (version_id);


-- ============================================
-- Changelog for Cache Invalidation
-- ============================================
-- Tracks changes to tuples for cache invalidation and sync

CREATE TABLE authorization_changelog (
    id BIGSERIAL PRIMARY KEY,

    -- Operation type: 'WRITE' or 'DELETE'
    operation VARCHAR(10) NOT NULL,

    -- Reference to the affected tuple
    tuple_id TEXT NOT NULL,

    -- Transaction ID of the change
    txid BIGINT NOT NULL,

    -- When the change occurred
    timestamp TIMESTAMPTZ(6) DEFAULT NOW(),

    -- Whether this change has been processed
    processed BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_authorization_changelog_unprocessed ON authorization_changelog (processed, timestamp);
CREATE INDEX idx_authorization_changelog_txid ON authorization_changelog (txid);


-- ============================================
-- Permission Audit Log
-- ============================================
-- Audit log for permission changes

CREATE TABLE permission_audit_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

    -- Actor information
    actor_type VARCHAR(32) NOT NULL,
    actor_id VARCHAR(256) NOT NULL,

    -- Action performed: 'GRANT', 'REVOKE', 'MODEL_UPDATE'
    action VARCHAR(32) NOT NULL,

    -- Tuple information
    tuple_user VARCHAR(320) NOT NULL,
    tuple_relation VARCHAR(64) NOT NULL,
    tuple_object VARCHAR(320) NOT NULL,

    -- Additional context
    reason TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ(6) DEFAULT NOW()
);

CREATE INDEX idx_permission_audit_logs_actor ON permission_audit_logs (actor_type, actor_id);
CREATE INDEX idx_permission_audit_logs_object ON permission_audit_logs (tuple_object);
CREATE INDEX idx_permission_audit_logs_created ON permission_audit_logs (created_at);


-- ============================================
-- Teams (Application Metadata)
-- ============================================
-- Team/Policy set metadata for grouping permissions

CREATE TABLE teams (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

    -- Team identification
    name VARCHAR(128) NOT NULL,
    display_name VARCHAR(256) NOT NULL,

    -- Optional service scope
    service_id VARCHAR(64),

    -- Description
    description TEXT,

    -- Audit
    created_by VARCHAR(256) NOT NULL,

    -- Timestamps
    created_at TIMESTAMPTZ(6) DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) DEFAULT NOW()
);

-- Team name must be unique within a service (or globally if no service)
CREATE UNIQUE INDEX idx_teams_name_service ON teams (name, COALESCE(service_id, ''));
CREATE INDEX idx_teams_service ON teams (service_id);


-- ============================================
-- Helper Function for Transaction ID
-- ============================================
-- Returns the current transaction ID for tuple versioning

CREATE OR REPLACE FUNCTION get_current_txid()
RETURNS BIGINT AS $$
BEGIN
    RETURN txid_current();
END;
$$ LANGUAGE plpgsql;


-- +goose Down
DROP FUNCTION IF EXISTS get_current_txid();
DROP TABLE IF EXISTS teams;
DROP TABLE IF EXISTS permission_audit_logs;
DROP TABLE IF EXISTS authorization_changelog;
DROP TABLE IF EXISTS authorization_models;
DROP TABLE IF EXISTS authorization_tuples;

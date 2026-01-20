-- +goose Up
-- Add Departments table for Phase 4
-- Departments are used for hierarchical permission grouping

CREATE TABLE departments (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

    -- Department identification
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

-- Department name must be unique within a service (or globally if no service)
CREATE UNIQUE INDEX idx_departments_name_service ON departments (name, COALESCE(service_id, ''));
CREATE INDEX idx_departments_service ON departments (service_id);

-- +goose Down
DROP INDEX IF EXISTS idx_departments_service;
DROP INDEX IF EXISTS idx_departments_name_service;
DROP TABLE IF EXISTS departments;

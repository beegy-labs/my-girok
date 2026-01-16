-- +goose Up

-- Legal Entities
CREATE TABLE legal_entities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  parent_id UUID REFERENCES legal_entities(id),

  -- Basic Info
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  legal_name TEXT NOT NULL,

  -- Registration
  country_code TEXT NOT NULL,
  registration_number TEXT,
  tax_id TEXT,
  vat_number TEXT,

  -- Finance
  currency_code TEXT NOT NULL,
  fiscal_year_end_month INT DEFAULT 12,

  -- Contact
  address TEXT,
  city TEXT,
  postal_code TEXT,
  phone TEXT,
  email TEXT,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_holding BOOLEAN DEFAULT FALSE,

  -- Meta
  incorporation_date DATE,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- Offices
CREATE TABLE offices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  legal_entity_id UUID NOT NULL REFERENCES legal_entities(id) ON DELETE CASCADE,

  -- Basic Info
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  office_type office_type DEFAULT 'BRANCH',

  -- Location
  country_code TEXT NOT NULL,
  subdivision_code TEXT,
  city TEXT NOT NULL,
  address_line1 TEXT,
  address_line2 TEXT,
  postal_code TEXT,

  -- Coordinates
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  -- Timezone
  timezone TEXT NOT NULL,

  -- Contact
  phone TEXT,
  email TEXT,

  -- Operations
  capacity INT,
  current_headcount INT DEFAULT 0,
  is_24_hour BOOLEAN DEFAULT FALSE,

  -- Work Policy
  default_work_start TIME DEFAULT '09:00',
  default_work_end TIME DEFAULT '18:00',
  default_break_minutes INT DEFAULT 60,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_main_office BOOLEAN DEFAULT FALSE,

  -- Meta
  amenities TEXT[],
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

-- Buildings
CREATE TABLE buildings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,

  code TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  floor_count INT,
  is_accessible BOOLEAN DEFAULT TRUE,
  emergency_contact TEXT,

  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),

  UNIQUE(office_id, code)
);

-- Floors
CREATE TABLE floors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,

  floor_number INT NOT NULL,
  name TEXT,
  zone TEXT,
  capacity INT,
  amenities TEXT[],
  is_active BOOLEAN DEFAULT TRUE,

  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),

  UNIQUE(building_id, floor_number)
);

-- Indexes
CREATE INDEX idx_legal_entities_country ON legal_entities(country_code);
CREATE INDEX idx_legal_entities_parent ON legal_entities(parent_id);
CREATE INDEX idx_legal_entities_active ON legal_entities(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_offices_legal_entity ON offices(legal_entity_id);
CREATE INDEX idx_offices_country ON offices(country_code);
CREATE INDEX idx_offices_active ON offices(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_buildings_office ON buildings(office_id);
CREATE INDEX idx_floors_building ON floors(building_id);

-- Add FK to organization_units
ALTER TABLE organization_units
  ADD CONSTRAINT fk_org_units_legal_entity
  FOREIGN KEY (legal_entity_id) REFERENCES legal_entities(id);

-- +goose Down
ALTER TABLE organization_units DROP CONSTRAINT IF EXISTS fk_org_units_legal_entity;
DROP TABLE IF EXISTS floors;
DROP TABLE IF EXISTS buildings;
DROP TABLE IF EXISTS offices;
DROP TABLE IF EXISTS legal_entities;

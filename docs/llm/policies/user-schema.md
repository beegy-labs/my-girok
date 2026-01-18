# Global User Schema Design

> **Version**: 1.0 | **Last Updated**: 2026-01-18 | **Status**: Design Document

## Overview

Universal user schema compatible with 15+ service types, based on SCIM 2.0 and Unified Customer Profile patterns.

## Standards Compliance

| Standard                 | Application                       |
| ------------------------ | --------------------------------- |
| SCIM 2.0 (RFC 7643)      | Core user schema                  |
| OpenFGA                  | Relationship-based access control |
| Unified Customer Profile | 360° customer view                |
| PostgreSQL JSONB         | Extensible attributes             |

## Service Type Categories

### 1. Commerce

- **Marketplace**: BUYER, SELLER, SELLER_STAFF, MARKETPLACE_ADMIN
- **B2B Commerce**: PURCHASER, PURCHASE_MANAGER, SUPPLIER, SUPPLIER_ADMIN

### 2. Social

- **SNS**: USER, CREATOR, INFLUENCER, MODERATOR, ADMIN
- **Chat/Messaging**: MEMBER, CHANNEL_ADMIN, MODERATOR, SERVER_OWNER
- **Gaming**: PLAYER, PREMIUM_PLAYER, GUILD_MEMBER, GUILD_LEADER, GAME_ADMIN

### 3. Content

- **Blog/CMS**: READER, SUBSCRIBER, AUTHOR, EDITOR, CHIEF_EDITOR
- **Streaming/OTT**: VIEWER, SUBSCRIBER, CREATOR, CHANNEL_OWNER

### 4. Enterprise

- **LMS**: LEARNER, TEACHING_ASSISTANT, INSTRUCTOR, DEPARTMENT_HEAD
- **Fintech**: ACCOUNT_HOLDER, TELLER, ANALYST, BRANCH_MANAGER, COMPLIANCE_OFFICER
- **SaaS**: MEMBER, POWER_USER, TEAM_ADMIN, BILLING_ADMIN, OWNER

### 5. Operations

- **Logistics**: DRIVER, DISPATCHER, FLEET_MANAGER, SHIPPER
- **Booking**: GUEST, HOST, PROPERTY_MANAGER, SUPPORT_AGENT

### 6. Specialized

- **Healthcare**: PATIENT, CAREGIVER, NURSE, DOCTOR (HIPAA compliant)
- **Advertising**: ADVERTISER, AGENCY_MEMBER, PUBLISHER
- **IoT**: GUEST, FAMILY_MEMBER, HOME_OWNER, DEVICE_ADMIN
- **Partner Portal**: VENDOR_STAFF, VENDOR_ADMIN, SUPPLIER, PARTNER_MANAGER

## Database Schema

### accounts Table Extension (identity_db)

```sql
-- SCIM 2.0 Core
external_id           TEXT
user_type             TEXT DEFAULT 'user'
display_name          TEXT
given_name            TEXT
family_name           TEXT
middle_name           TEXT
nickname              TEXT
preferred_language    TEXT DEFAULT 'en'
profile_url           TEXT
avatar_url            TEXT
bio                   TEXT
gender                TEXT
birthdate             DATE

-- Identity Resolution
identity_graph_id     UUID
linked_identities     JSONB DEFAULT '[]'
device_fingerprints   JSONB DEFAULT '[]'

-- Service Extensions (JSONB)
commerce_profile      JSONB
social_profile        JSONB
content_profile       JSONB
enterprise_profile    JSONB
service_profiles      JSONB DEFAULT '{}'

-- Preferences
notification_settings JSONB
privacy_settings      JSONB

-- Metadata
schema_version        INT DEFAULT 1
```

### JSONB Profile Schemas

#### commerce_profile

```json
{
  "customer_tier": "GOLD",
  "lifetime_value": 15000.0,
  "total_orders": 47,
  "preferred_payment": "CARD",
  "default_shipping_address": {},
  "seller_profile": {
    "is_seller": true,
    "store_name": "My Store",
    "seller_tier": "PREMIUM",
    "rating": 4.8
  }
}
```

#### social_profile

```json
{
  "followers_count": 15000,
  "following_count": 500,
  "engagement_rate": 0.045,
  "verified": true,
  "creator_profile": {
    "is_creator": true,
    "creator_tier": "PARTNER",
    "monetization_enabled": true
  }
}
```

#### enterprise_profile (SCIM 2.0 Enterprise Extension)

```json
{
  "employee_number": "EMP-2024-001",
  "organization": "Engineering",
  "department": "Backend",
  "job_title": "Senior Developer",
  "manager": { "id": "uuid", "display_name": "Jane Smith" },
  "hire_date": "2024-01-15",
  "clearance_level": "CONFIDENTIAL"
}
```

### Service-Role Tables (auth_db)

#### service_role_definitions

```sql
CREATE TABLE service_role_definitions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  service_type      TEXT NOT NULL,
  role_name         TEXT NOT NULL,
  role_level        INT NOT NULL DEFAULT 0,
  display_name      TEXT NOT NULL,
  base_permissions  TEXT[] NOT NULL,
  inherits_from     TEXT[],
  UNIQUE(service_type, role_name)
);
```

#### user_service_roles

```sql
CREATE TABLE user_service_roles (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  user_id           UUID NOT NULL,
  service_id        UUID NOT NULL,
  service_type      TEXT NOT NULL,
  role_name         TEXT NOT NULL,
  role_level        INT NOT NULL,
  custom_permissions TEXT[] DEFAULT '{}',
  scope             JSONB DEFAULT '{}',
  expires_at        TIMESTAMPTZ,
  UNIQUE(user_id, service_id, role_name)
);
```

## Permission Format

```
{resource}:{action}[:{scope}]
```

### Examples

| Service     | Permission Examples                          |
| ----------- | -------------------------------------------- |
| Marketplace | `products:create`, `orders:manage:store-123` |
| LMS         | `courses:create`, `grades:manage:course-101` |
| Fintech     | `accounts:view`, `transfers:create:10000`    |
| Healthcare  | `records:view:own`, `prescriptions:create`   |

### Standard Actions

| Action | Level | Description            |
| ------ | ----- | ---------------------- |
| view   | 0     | Read single resource   |
| list   | 0     | List resources         |
| create | 1     | Create new resource    |
| update | 1     | Modify resource        |
| delete | 2     | Remove resource        |
| manage | 2     | Full CRUD              |
| admin  | 3     | Administrative actions |

## OpenFGA Model

Key type definitions for service-specific authorization:

```yaml
type marketplace
  relations
    define admin: [user, admin]
    define seller: [user, organization#member]
    define buyer: [user]

type store
  relations
    define marketplace: [marketplace]
    define owner: [user]
    define staff: [user]
    define can_manage_products: owner or staff

type lms_platform
  relations
    define instructor: [user]
    define learner: [user]

type course
  relations
    define platform: [lms_platform]
    define instructor: [user]
    define student: [user]
    define can_grade: instructor or platform->admin
```

## Implementation Notes

### JSONB Indexing Strategy

```sql
CREATE INDEX idx_accounts_commerce_tier
  ON accounts USING BTREE ((commerce_profile->>'customer_tier'));
CREATE INDEX idx_accounts_enterprise_dept
  ON accounts USING BTREE ((enterprise_profile->>'department'));
CREATE INDEX idx_accounts_linked_identities
  ON accounts USING GIN (linked_identities);
```

### Cross-Service Data Access

- Use gRPC for cross-database queries (no cross-DB JOINs)
- Cache frequently accessed profile data
- Use identity_graph_id for cross-platform identity resolution

## References

- [SCIM 2.0 Core Schema (RFC 7643)](https://datatracker.ietf.org/doc/html/rfc7643)
- [OpenFGA Documentation](https://openfga.dev/docs)
- [PostgreSQL JSONB](https://www.postgresql.org/docs/current/datatype-json.html)

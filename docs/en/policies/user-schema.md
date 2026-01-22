# Global User Schema Design

> Universal user schema compatible with 15+ service types

**Version**: 1.0 | **Status**: Design Document

## Overview

This document defines a universal user schema that supports 15+ different service types, from e-commerce marketplaces to healthcare systems. The schema is based on SCIM 2.0 standards and Unified Customer Profile patterns.

## Standards Compliance

| Standard                 | Application                       |
| ------------------------ | --------------------------------- |
| SCIM 2.0 (RFC 7643)      | Core user schema                  |
| OpenFGA                  | Relationship-based access control |
| Unified Customer Profile | 360° customer view                |
| PostgreSQL JSONB         | Extensible attributes             |

## Service Type Categories

### 1. Commerce

**Marketplace**: BUYER, SELLER, SELLER_STAFF, MARKETPLACE_ADMIN

**B2B Commerce**: PURCHASER, PURCHASE_MANAGER, SUPPLIER, SUPPLIER_ADMIN

### 2. Social

**SNS**: USER, CREATOR, INFLUENCER, MODERATOR, ADMIN

**Chat/Messaging**: MEMBER, CHANNEL_ADMIN, MODERATOR, SERVER_OWNER

**Gaming**: PLAYER, PREMIUM_PLAYER, GUILD_MEMBER, GUILD_LEADER, GAME_ADMIN

### 3. Content

**Blog/CMS**: READER, SUBSCRIBER, AUTHOR, EDITOR, CHIEF_EDITOR

**Streaming/OTT**: VIEWER, SUBSCRIBER, CREATOR, CHANNEL_OWNER

### 4. Enterprise

**LMS**: LEARNER, TEACHING_ASSISTANT, INSTRUCTOR, DEPARTMENT_HEAD

**Fintech**: ACCOUNT_HOLDER, TELLER, ANALYST, BRANCH_MANAGER, COMPLIANCE_OFFICER

**SaaS**: MEMBER, POWER_USER, TEAM_ADMIN, BILLING_ADMIN, OWNER

### 5. Operations

**Logistics**: DRIVER, DISPATCHER, FLEET_MANAGER, SHIPPER

**Booking**: GUEST, HOST, PROPERTY_MANAGER, SUPPORT_AGENT

### 6. Specialized

**Healthcare**: PATIENT, CAREGIVER, NURSE, DOCTOR (HIPAA compliant)

**Advertising**: ADVERTISER, AGENCY_MEMBER, PUBLISHER

**IoT**: GUEST, FAMILY_MEMBER, HOME_OWNER, DEVICE_ADMIN

**Partner Portal**: VENDOR_STAFF, VENDOR_ADMIN, SUPPLIER, PARTNER_MANAGER

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

## JSONB Profile Schemas

### commerce_profile

For marketplace and e-commerce users:

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

### enterprise_profile (SCIM 2.0 Enterprise Extension)

For enterprise/HR users:

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

### social_profile

For social platform users:

```json
{
  "follower_count": 1500,
  "following_count": 200,
  "verified": true,
  "creator_tier": "PARTNER",
  "content_categories": ["tech", "gaming"]
}
```

## Design Principles

### Extensibility

- Core fields in columns for indexing
- Service-specific data in JSONB for flexibility
- Schema version for migration support

### Multi-Tenancy

- All data scoped by tenant_id
- Service-specific roles per service instance
- Cross-service identity linking

### Privacy

- Minimal required fields
- Privacy settings per user
- GDPR/CCPA compliance ready

## Related Documentation

- Permissions & OpenFGA: `docs/en/policies/user-schema-permissions.md`
- [SCIM 2.0 Core Schema (RFC 7643)](https://datatracker.ietf.org/doc/html/rfc7643)

---

_This document is auto-generated from `docs/llm/policies/user-schema.md`_

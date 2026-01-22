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

## Related Documentation

- **Permissions & OpenFGA**: `user-schema-permissions.md`
- [SCIM 2.0 Core Schema (RFC 7643)](https://datatracker.ietf.org/doc/html/rfc7643)

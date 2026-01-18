# Data Migration: admins → accounts

> HR employee migration plan | Design only (NOT EXECUTED)

| Source         | Target               | Criteria                          |
| -------------- | -------------------- | --------------------------------- |
| auth_db.admins | identity_db.accounts | scope=TENANT, identity_type=HUMAN |

**Keep in admins**: System admins, Service accounts, NHI
**Move to accounts**: HR employees with enterprise_profile JSONB

**Phases**: Schema extend → Data migrate → FK update → Cleanup
**SSOT**: `docs/llm/policies/data-migration.md`

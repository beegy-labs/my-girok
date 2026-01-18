# Migration Script Drafts

> **Status**: DESIGN DOCUMENTS ONLY - Do NOT execute

These SQL files are **design documents** for planning the data migration from `auth_db.admins` to `identity_db.accounts`.

## Files

| File                             | Purpose                                     | Phase |
| -------------------------------- | ------------------------------------------- | ----- |
| `001_extend_accounts_schema.sql` | Extend accounts table with SCIM 2.0 + JSONB | 2.1   |
| `002_migrate_hr_employees.sql`   | Migrate HR data to accounts                 | 2.2   |
| `003_cleanup_admins_table.sql`   | Remove HR columns from admins               | 2.4   |

## Execution Order

1. **Phase 2.1**: Extend accounts schema
2. **Phase 2.2**: Migrate HR employees (via application code)
3. **Phase 2.3**: Update FK references (application-level)
4. **Phase 2.4**: Cleanup admins table

## Prerequisites Before Execution

- [ ] Full database backup
- [ ] Staging environment testing
- [ ] DBA review
- [ ] Security review
- [ ] Rollback rehearsal

## Notes

- Cross-database migrations require application-level orchestration
- goose cannot handle cross-database transactions
- Use migration tracking table for rollback capability

## Related Documents

- Design: `docs/llm/policies/data-migration.md`
- Schema: `docs/llm/policies/user-schema.md`
- Plan: `.tasks/phases/PHASE_2_DATA_CLEANUP_DESIGN.md`

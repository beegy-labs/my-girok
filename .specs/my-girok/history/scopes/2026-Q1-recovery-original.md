# Scope: 2026-Q1 Recovery

> L2: Human approval required | my-girok service recovery

## Target

Restore my-girok platform to fully functional state with Identity Platform integration and admin management.

## Period

2026-01-28 ~ 2026-03-31

## Items

| Priority | Feature                    | Status |
| -------- | -------------------------- | ------ |
| P0       | Authentication Integration | ⏳     |
| P0       | Resume CRUD Restoration    | ⏳     |
| P0       | Database Connection Fix    | ⏳     |
| P1       | PDF Export Restoration     | ⏳     |
| P1       | Public Sharing Fix         | ⏳     |
| P2       | Admin Service Management   | ⏳     |
| P2       | File Upload (MinIO) Fix    | ⏳     |
| P3       | Test Coverage to 80%       | ⏳     |

## Success Criteria

### Core Functionality (Must Have)

- [ ] Users can register and login via Identity Platform
- [ ] Session management working (cookie-based via BFF)
- [ ] Resume creation, editing, deletion functional
- [ ] All resume sections working (experience, education, skills)
- [ ] Database migrations applied successfully
- [ ] File uploads to MinIO working

### User Features (Should Have)

- [ ] PDF export functional (A4 and Letter sizes)
- [ ] PDF preview in browser working
- [ ] Public profile sharing via username
- [ ] Share link generation working
- [ ] User preferences saving
- [ ] Theme toggle (light/dark)

### Admin Features (Should Have)

- [ ] my-girok registered in app_registry
- [ ] Service management UI in web-admin (Settings > Service Config)
- [ ] Service status monitoring
- [ ] Basic user statistics dashboard

### Quality (Must Have)

- [ ] 80% test coverage (unit + integration + e2e)
- [ ] All critical user flows tested
- [ ] No critical bugs
- [ ] API response time < 200ms (p95)

## Dependencies

### Technical

- Identity Platform (identity-service, auth-service) - ✅ Available
- auth-bff - ✅ Available
- PostgreSQL database - ⚠️ Needs setup
- MinIO storage - ⚠️ Needs setup
- Valkey cache - ⚠️ Needs setup

### Documentation

- `docs/llm/solutions/my-girok.md` - ✅ Created
- `.ai/solutions/my-girok.md` - ✅ Created
- API documentation - ⚠️ Needs update

## Out of Scope

- Mobile apps (Phase 3)
- AI features (Phase 2)
- Advanced templates (Phase 2)
- Team accounts (Phase 4)

## Risks & Mitigation

| Risk                          | Impact | Mitigation                            |
| ----------------------------- | ------ | ------------------------------------- |
| Database schema changes       | High   | Review Prisma schema before migration |
| Identity Platform integration | High   | Follow existing auth-bff patterns     |
| File upload issues            | Medium | Test MinIO connection early           |
| PDF generation performance    | Medium | Implement caching, optimize rendering |

## References

- Roadmap: `../roadmap.md`
- Tasks: `../tasks/2026-Q1-recovery.md`
- Solution Spec: `docs/llm/solutions/my-girok.md`

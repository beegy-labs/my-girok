# HR Service

> **Status**: Structure Backup Only (Not Implemented)
> **Port**: 3006 (Reserved)
> **Database**: hr_db (Not Created)

## Overview

This service is a **structural placeholder** for future HR functionality migration from auth-service.

## Current Status

- [ ] Code migration from auth-service
- [ ] Database setup
- [ ] API implementation
- [ ] Tests
- [ ] Documentation

## Planned Modules

| Module     | Source                  | Description                            |
| ---------- | ----------------------- | -------------------------------------- |
| Attendance | auth-service/attendance | Clock in/out, overtime, work schedules |
| Leave      | auth-service/leave      | Leave requests, balances, approvals    |
| Delegation | auth-service/delegation | Authority delegation workflows         |
| Employee   | auth-service/employee   | Employee self-service portal           |

## Migration Plan

When ready to implement:

1. Copy code from auth-service modules
2. Update imports and dependencies
3. Create database migrations
4. Update Prisma schema
5. Implement gRPC communication with identity-service

## References

- Source: `services/auth-service/src/{attendance,leave,delegation,employee}`
- Policy: `docs/llm/policies/identity-platform.md`
- Architecture: `.ai/architecture.md`

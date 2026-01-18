# Employee Module

> **Status**: Structure Backup Only
> **Source**: `services/auth-service/src/employee`

## Planned Features

Employee Self-Service Portal (Phase 5 from auth-service):

- Profile management
- Attendance self-service
- Leave self-service
- Delegation self-service

## Sub-modules

| Sub-module | Description                    |
| ---------- | ------------------------------ |
| attendance | Employee attendance view       |
| leave      | Employee leave management      |
| delegation | Employee delegation management |
| profile    | Employee profile updates       |
| guards     | Employee authentication guards |
| types      | Employee type definitions      |

## Source Files to Migrate

From `auth-service/employee`:

- `employee.module.ts`
- `attendance/*` (4 files)
- `leave/*` (4 files)
- `delegation/*` (4 files)
- `profile/*` (6 files)
- `guards/*` (3 files)
- `types/*` (2 files)

Total: 25 files

## API Endpoints (Planned)

All endpoints prefixed with `/employee`:

- GET /employee/profile
- PATCH /employee/profile
- GET /employee/attendance
- GET /employee/leave
- GET /employee/delegations

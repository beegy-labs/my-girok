# Leave Module

> **Status**: Structure Backup Only
> **Source**: `services/auth-service/src/leave`

## Planned Features

- Multi-level approval workflow (first -> second -> final)
- Leave balance tracking with carryover (max 5 days)
- Tenure bonus calculation (3/5/10 years)
- Leave types: ANNUAL, SICK, PARENTAL, UNPAID, COMPENSATORY, STUDY, BEREAVEMENT

## Source Files to Migrate

From `auth-service/leave`:

- `leave.module.ts`
- `controllers/leave.controller.ts`
- `controllers/leave-balance.controller.ts`
- `dto/leave.dto.ts`
- `dto/leave-balance.dto.ts`
- `services/leave.service.ts`
- `services/leave-balance.service.ts`

## API Endpoints (Planned)

| Method | Endpoint                  | Description           |
| ------ | ------------------------- | --------------------- |
| POST   | /leaves                   | Create leave request  |
| POST   | /leaves/:id/submit        | Submit for approval   |
| POST   | /leaves/:id/approve       | Approve leave         |
| GET    | /leaves/pending-approvals | Get pending approvals |
| GET    | /leave-balances/me        | Get my balance        |

## Database Tables (Planned)

- `leave_requests`
- `leave_balances`
- `leave_types`

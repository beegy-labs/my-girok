# Leave Controllers

> **Status**: Structure Backup Only

## Planned Controllers

### LeaveController

- `POST /` - Create leave request
- `GET /` - List leave requests
- `GET /:id` - Get leave request details
- `POST /:id/submit` - Submit for approval
- `POST /:id/approve` - Approve leave request
- `POST /:id/reject` - Reject leave request
- `POST /:id/cancel` - Cancel leave request
- `GET /pending-approvals` - Get pending approvals

### LeaveBalanceController

- `GET /me` - Get my leave balance
- `GET /:userId` - Get user leave balance (admin)
- `POST /initialize` - Initialize balances for new year
- `POST /carryover` - Process carryover from previous year

## Source Files

From `auth-service/leave/controllers`:

- `leave.controller.ts`
- `leave-balance.controller.ts`

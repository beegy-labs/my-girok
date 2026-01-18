# Leave Services

> **Status**: Structure Backup Only

## Planned Services

### LeaveService

- `create(userId, dto)` - Create leave request
- `findAll(query)` - List leave requests
- `findOne(id)` - Get leave request by ID
- `submit(id)` - Submit for approval
- `approve(id, approverId, dto)` - Approve leave
- `reject(id, rejectorId, dto)` - Reject leave
- `cancel(id)` - Cancel leave request
- `getPendingApprovals(approverId)` - Get pending approvals

### LeaveBalanceService

- `getBalance(userId, year)` - Get user balance
- `initializeBalance(userId, year)` - Initialize balance
- `processCarryover(userId, year)` - Process carryover
- `deductBalance(userId, leaveType, days)` - Deduct from balance
- `restoreBalance(userId, leaveType, days)` - Restore balance
- `calculateTenureBonus(userId)` - Calculate tenure bonus

## Source Files

From `auth-service/leave/services`:

- `leave.service.ts`
- `leave.service.spec.ts`
- `leave-balance.service.ts`
- `leave-balance.service.spec.ts`

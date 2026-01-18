# Leave DTOs

> **Status**: Structure Backup Only

## Planned DTOs

### Leave Request DTOs

- `CreateLeaveRequestDto` - Create leave request
- `SubmitLeaveRequestDto` - Submit for approval
- `ApproveLeaveRequestDto` - Approve with comment
- `RejectLeaveRequestDto` - Reject with reason
- `LeaveRequestQueryDto` - Query parameters
- `LeaveRequestResponseDto` - Leave request response

### Leave Balance DTOs

- `LeaveBalanceQueryDto` - Query parameters
- `LeaveBalanceResponseDto` - Balance response
- `InitializeBalanceDto` - Initialize balance
- `CarryoverBalanceDto` - Carryover settings

## Source Files

From `auth-service/leave/dto`:

- `leave.dto.ts`
- `leave-balance.dto.ts`

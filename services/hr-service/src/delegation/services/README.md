# Delegation Services

> **Status**: Structure Backup Only

## Planned Services

### DelegationService

- `create(delegatorId, dto)` - Create delegation
- `findAll(query)` - List delegations
- `findOne(id)` - Get delegation by ID
- `approve(id, approverId, dto)` - Approve delegation
- `revoke(id, revokerId, dto)` - Revoke delegation
- `getActiveDelegations(userId)` - Get active delegations
- `getReceivedDelegations(userId)` - Get received delegations
- `checkExpiry()` - Check and expire delegations
- `logAction(delegationId, action, details)` - Log action
- `getLogs(delegationId)` - Get delegation logs

## Source Files

From `auth-service/delegation/services`:

- `delegation.service.ts`
- `delegation.service.spec.ts`

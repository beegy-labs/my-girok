# Delegation Controllers

> **Status**: Structure Backup Only

## Planned Controllers

### DelegationController

- `POST /` - Create delegation
- `GET /` - List delegations
- `GET /:id` - Get delegation details
- `POST /:id/approve` - Approve delegation
- `POST /:id/revoke` - Revoke delegation
- `GET /:id/logs` - Get delegation audit logs
- `GET /active` - Get active delegations for current user
- `GET /received` - Get received delegations

## Source Files

From `auth-service/delegation/controllers`:

- `delegation.controller.ts`

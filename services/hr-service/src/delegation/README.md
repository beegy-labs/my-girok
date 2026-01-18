# Delegation Module

> **Status**: Structure Backup Only
> **Source**: `services/auth-service/src/delegation`

## Planned Features

- Authority delegation with approval workflow
- Delegation logs for audit trail
- Constraints: allowed hours, IPs, max actions
- Auto-expiry and reminder notifications

## Source Files to Migrate

From `auth-service/delegation`:

- `delegation.module.ts`
- `controllers/delegation.controller.ts`
- `dto/delegation.dto.ts`
- `services/delegation.service.ts`

## API Endpoints (Planned)

| Method | Endpoint                 | Description         |
| ------ | ------------------------ | ------------------- |
| POST   | /delegations             | Create delegation   |
| POST   | /delegations/:id/approve | Approve delegation  |
| POST   | /delegations/:id/revoke  | Revoke delegation   |
| GET    | /delegations/:id/logs    | Get delegation logs |

## Database Tables (Planned)

- `delegations`
- `delegation_logs`
- `delegation_constraints`

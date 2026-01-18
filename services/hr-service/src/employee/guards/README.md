# Employee Guards

> **Status**: Structure Backup Only
> **Source**: `services/auth-service/src/employee/guards`

## Planned Guards

### EmployeeAuthGuard

- Validates employee JWT token
- Extracts employee context from request
- Checks employee status (active)

## Source Files to Migrate

From `auth-service/employee/guards`:

- `index.ts`
- `employee-auth.guard.ts`
- `employee-auth.guard.spec.ts`

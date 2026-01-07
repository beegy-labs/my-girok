# SSOT Strategy

Single Source of Truth for all packages and services

## Frontend: Design Tokens (Tailwind CSS 4)

```
tokens.css (@theme) -> Tailwind Utility Classes -> Components
```

| Utility            | Token                       | Value    |
| ------------------ | --------------------------- | -------- |
| `rounded-soft`     | `--radius-soft`             | 8px      |
| `font-serif-title` | `--font-family-serif-title` | Playfair |
| `tracking-brand`   | `--letter-spacing-brand`    | 0.3em    |
| `min-h-input`      | `--min-height-input`        | 48px     |

### 8pt Grid

| Class  | Value | Grid |
| ------ | ----- | ---- |
| `py-2` | 8px   | OK   |
| `py-3` | 12px  | NO   |
| `py-4` | 16px  | OK   |

### DO / DON'T

| DO               | DON'T                          |
| ---------------- | ------------------------------ |
| `rounded-soft`   | `rounded-lg`, `rounded-[24px]` |
| `tracking-brand` | `tracking-widest`              |
| `min-h-input`    | `min-h-[48px]`                 |

## Backend: Constants

```
@my-girok/nest-common (Shared)
  CacheTTL, ID, PaginationDefaults, RetryConfig

identity-service/common/constants (Service-specific)
  SESSION, RATE_LIMIT, MFA, ACCOUNT_SECURITY, DSR_DEADLINE_DAYS
```

### Decision Tree

```
Multi-service? -> @my-girok/nest-common
  |
  NO -> Domain-specific? -> service/common/constants/
          |
          NO -> Environment variable
```

## Types: @my-girok/types

| Category       | SSOT Location    |
| -------------- | ---------------- |
| Auth Enums     | @my-girok/types  |
| Identity Enums | Prisma generated |
| Legal Enums    | @my-girok/types  |

## Event Naming

```typescript
// SCREAMING_SNAKE_CASE
('USER_REGISTERED', 'ACCOUNT_CREATED', 'SESSION_STARTED');
```

## Files

```
packages/design-tokens/src/tokens.css
packages/types/src/
packages/nest-common/src/
services/identity-service/src/common/constants/
```

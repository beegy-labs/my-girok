# SSOT Strategy

> Single Source of Truth for all packages and services

---

## Frontend: Design Tokens (Tailwind CSS 4)

### Core Principle

```
tokens.css (@theme) → Tailwind Utility Classes → Components
```

### Key Tokens

| Utility            | Token                       | Value                    |
| ------------------ | --------------------------- | ------------------------ |
| `rounded-soft`     | `--radius-soft`             | 8px (default for ALL UI) |
| `font-serif-title` | `--font-family-serif-title` | Playfair Display         |
| `tracking-brand`   | `--letter-spacing-brand`    | 0.3em                    |
| `min-h-input`      | `--min-height-input`        | 48px (WCAG AAA)          |

### 8pt Grid

| Class  | Value | Grid |
| ------ | ----- | ---- |
| `py-2` | 8px   | ✅   |
| `py-3` | 12px  | ❌   |
| `py-4` | 16px  | ✅   |
| `px-6` | 24px  | ✅   |

### DO / DON'T

| ✅ DO            | ❌ DON'T                       |
| ---------------- | ------------------------------ |
| `rounded-soft`   | `rounded-lg`, `rounded-[24px]` |
| `tracking-brand` | `tracking-widest`              |
| `min-h-input`    | `min-h-[48px]`                 |

**Tokens**: `packages/design-tokens/src/tokens.css`
**Detailed docs**: `docs/DESIGN_SYSTEM.md`

---

## Backend: Constants & Utilities

### Package Hierarchy

```
@my-girok/nest-common (Shared across all services)
├── CacheTTL         # Cache duration constants
├── ID               # UUIDv7 generator
├── PaginationDefaults  # Default page size, max limit
└── RetryConfig      # Default retry settings

identity-service/common/constants (Service-specific)
├── SESSION          # Session expiry, refresh token days
├── RATE_LIMIT       # Login/registration limits
├── MFA              # TOTP window, backup codes
├── ACCOUNT_SECURITY # Lockout threshold, duration
├── DSR_DEADLINE_DAYS # Per-law deadlines (GDPR, CCPA, etc.)
├── OUTBOX           # Polling interval, batch size
├── SANCTION         # Default duration, appeal window
└── INVITATION       # Expiry days, token length
```

### DO / DON'T

| ✅ DO                                               | ❌ DON'T                           |
| --------------------------------------------------- | ---------------------------------- |
| Import `CacheTTL` from `@my-girok/nest-common`      | Define cache TTL in service        |
| Import `ID.generate()` from `@my-girok/nest-common` | Use `crypto.randomUUID()` directly |
| Use `SESSION.DEFAULT_EXPIRY_MINUTES`                | Hardcode `60` in service           |
| Define service-specific constants in `constants/`   | Duplicate constants across modules |

### Constants Location Decision Tree

```
Is it used by multiple services?
├─ YES → @my-girok/nest-common
│        (CacheTTL, ID, Pagination, Retry)
│
└─ NO → Is it domain-specific?
        ├─ YES → service/common/constants/
        │        (SESSION, MFA, DSR_DEADLINE_DAYS)
        │
        └─ NO → Consider if it should be configurable
                 via environment variables
```

---

## Types: @my-girok/types

### Enum SSOT Strategy

| Category       | SSOT Location     | Consumers        |
| -------------- | ----------------- | ---------------- |
| Auth Enums     | `@my-girok/types` | All services     |
| Identity Enums | Prisma generated  | identity-service |
| Legal Enums    | `@my-girok/types` | All services     |

### Why Prisma-Generated for Identity?

- Strict DB-TypeScript sync
- Compile-time validation
- No drift between schema and code

### When to Use @my-girok/types

- Shared DTOs across services
- API response types
- Event payload types
- Cross-service contracts

---

## Event Types

### SSOT Location

```
packages/types/src/events/
├── identity/events.ts   # IdentityEventType
├── auth/events.ts       # AuthEventType
└── legal/events.ts      # LegalEventType
```

### Event Naming Convention

```typescript
// ✅ SCREAMING_SNAKE_CASE
'USER_REGISTERED';
'ACCOUNT_CREATED';
'SESSION_STARTED';

// ❌ Don't use
'userRegistered';
'account.created';
'session-started';
```

---

**Types**: `packages/types/src/`
**nest-common**: `packages/nest-common/src/`
**identity-service constants**: `services/identity-service/src/common/constants/`

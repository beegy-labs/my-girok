# TypeScript Best Practices - 2026

This guide covers TypeScript best practices as of 2026, focusing on strict mode configuration, type safety patterns, and runtime validation with Zod.

## Strict Mode Configuration

### Essential tsconfig.json

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2024",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

### Strict Mode Flags Explained

| Flag                           | Effect                                         |
| ------------------------------ | ---------------------------------------------- |
| `noImplicitAny`                | Error on implicit `any` types                  |
| `strictNullChecks`             | Null and undefined must be explicitly handled  |
| `strictFunctionTypes`          | Contravariant function parameters              |
| `strictPropertyInitialization` | Class properties must be initialized           |
| `useUnknownInCatchVariables`   | Catch variables are `unknown` instead of `any` |
| `noImplicitThis`               | Error on implicit `this` type                  |

## Type Patterns

### Prefer `unknown` Over `any`

```typescript
// Bad: any bypasses all type checking
function processData(data: any) {
  return data.value; // No error, but unsafe at runtime
}

// Good: unknown forces proper type checking
function processData(data: unknown) {
  if (typeof data === 'object' && data !== null && 'value' in data) {
    return (data as { value: string }).value;
  }
  throw new Error('Invalid data');
}
```

### Custom Type Guards

```typescript
interface User {
  id: string;
  email: string;
}

function isUser(obj: unknown): obj is User {
  return typeof obj === 'object' && obj !== null && 'id' in obj && 'email' in obj;
}

// Usage - TypeScript now knows the type
if (isUser(data)) {
  console.log(data.email); // data is User
}
```

### Error Handling with unknown

```typescript
try {
  await fetchData();
} catch (error: unknown) {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error('Unknown error:', error);
  }
}
```

## Runtime Validation with Zod

### Schema Definition

```typescript
import { z } from 'zod';

const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: z.enum(['admin', 'user', 'guest']),
  createdAt: z.coerce.date(),
});

// Infer TypeScript type from schema
type User = z.infer<typeof UserSchema>;
```

### API Response Validation

```typescript
// Safe parsing (recommended for most cases)
const result = UserSchema.safeParse(apiResponse);

if (!result.success) {
  console.error('Validation failed:', result.error.flatten());
  return null;
}

const user = result.data; // Type-safe User

// Throwing parse (when validation failure is exceptional)
try {
  const user = UserSchema.parse(apiResponse);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error(error.issues);
  }
}
```

### Nested and Complex Schemas

```typescript
const AddressSchema = z.object({
  street: z.string(),
  city: z.string(),
  country: z.string(),
});

const CompanySchema = z.object({
  name: z.string(),
  employees: z.array(UserSchema),
  headquarters: AddressSchema,
  founded: z.number().int().min(1800).max(2100),
});

// Optional fields with defaults
const ConfigSchema = z.object({
  timeout: z.number().default(5000),
  retries: z.number().default(3),
  debug: z.boolean().optional(),
});
```

## Advanced Patterns

### Discriminated Unions

```typescript
type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };

function divide(a: number, b: number): Result<number, string> {
  if (b === 0) {
    return { success: false, error: 'Division by zero' };
  }
  return { success: true, data: a / b };
}

// Usage with exhaustive type narrowing
const result = divide(10, 2);
if (result.success) {
  console.log(result.data); // TypeScript knows data exists
} else {
  console.error(result.error); // TypeScript knows error exists
}
```

### Template Literal Types

```typescript
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type ApiRoute = `/api/${string}`;
type ApiEndpoint = `${HttpMethod} ${ApiRoute}`;

// Valid: "GET /api/users"
// Invalid: "PATCH /api/users" or "GET /users"
```

### Branded Types

Prevent accidentally mixing semantically different values:

```typescript
type UserId = string & { readonly __brand: 'UserId' };
type OrderId = string & { readonly __brand: 'OrderId' };

function createUserId(id: string): UserId {
  return id as UserId;
}

function getUser(id: UserId): User {
  // ...
}

const userId = createUserId('123');
const orderId = '456' as OrderId;

getUser(userId); // OK
getUser(orderId); // Error: OrderId is not assignable to UserId
```

## Performance Tips

### Type-Only Imports

```typescript
// Tree-shakeable, no runtime cost
import type { User, Config } from './types';
import { validateUser } from './validation';

// Inline type import
import { validateUser, type ValidationResult } from './validation';
```

### Const Assertions

```typescript
// Without as const: string[]
const routes = ['/', '/about', '/contact'];

// With as const: readonly ['/', '/about', '/contact']
const routes = ['/', '/about', '/contact'] as const;

// Object with as const
const config = {
  api: 'https://api.example.com',
  timeout: 5000,
} as const;
// Type: { readonly api: "https://api.example.com"; readonly timeout: 5000 }
```

## Project Configuration

### Path Aliases

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@utils/*": ["src/utils/*"]
    }
  }
}
```

### Monorepo References

```json
{
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "declarationMap": true
  },
  "references": [{ "path": "../packages/types" }, { "path": "../packages/utils" }]
}
```

## Anti-Patterns to Avoid

| Don't                  | Do                      | Reason                  |
| ---------------------- | ----------------------- | ----------------------- |
| Use `any` everywhere   | `unknown` + type guards | Preserves type safety   |
| Skip `strict` mode     | Enable all strict flags | Catches bugs early      |
| Trust API responses    | Validate with Zod       | Runtime safety          |
| `as` type assertions   | Type guards             | Actually verifies types |
| Non-null assertion `!` | Proper null checks      | Explicit error handling |

## Sources

- [TypeScript Strict Option Guide](https://betterstack.com/community/guides/scaling-nodejs/typescript-strict-option/)
- [TypeScript Best Practices 2025](https://medium.com/@nikhithsomasani/best-practices-for-using-typescript-in-2025-a-guide-for-experienced-developers-4fca1cfdf052)
- [TypeScript World - Strict Mode Guide](https://typescriptworld.com/the-ultimate-guide-to-typescript-strict-mode-elevating-code-quality-and-safety)
- [Zod Documentation](https://zod.dev/)

---

_Last Updated: 2026-01-22_

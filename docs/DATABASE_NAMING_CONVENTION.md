# Database Naming Convention

This document defines the naming conventions for all database schemas in the my-girok project.

## Overview

**Database Layer**: All database objects (tables, columns, indexes, constraints) use **snake_case** naming convention to follow PostgreSQL best practices.

**Application Layer**: All TypeScript/Node.js code uses **camelCase** naming convention to follow JavaScript conventions.

**Mapping**: Prisma `@map()` directive bridges the two conventions automatically.

## Rationale

1. **PostgreSQL Standard**: PostgreSQL internally converts unquoted identifiers to lowercase. Using snake_case avoids the need for quoted identifiers and potential confusion.
2. **JavaScript Convention**: camelCase is the standard for JavaScript/TypeScript variables and properties
3. **Best of Both Worlds**: Prisma ORM allows us to use idiomatic naming in each layer
4. **Developer Experience**: Developers work with camelCase in code, database stays in snake_case

## Naming Rules

### Tables

- **Format**: `snake_case`, plural nouns
- **Examples**:
  - ✅ `users`
  - ✅ `resume_sections`
  - ✅ `share_links`
  - ✅ `oauth_provider_configs`
  - ❌ `User` (PascalCase)
  - ❌ `resumeSection` (camelCase)

### Columns

- **Format**: `snake_case`
- **Boolean columns**: Prefix with `is_` or `has_` for clarity
- **Timestamp columns**: Use standard names `created_at`, `updated_at`, `deleted_at`
- **Foreign keys**: Use `{referenced_table_singular}_id` format
- **Examples**:
  - ✅ `user_id`
  - ✅ `email_verified`
  - ✅ `created_at`
  - ✅ `is_active`
  - ✅ `provider_id`
  - ❌ `userId` (camelCase)
  - ❌ `emailVerified` (camelCase)
  - ❌ `createdAt` (camelCase)

### Indexes

- **Format**: `{table_name}_{column_name(s)}_idx`
- **Unique indexes**: `{table_name}_{column_name(s)}_key`
- **Examples**:
  - ✅ `users_email_idx`
  - ✅ `users_provider_provider_id_idx`
  - ✅ `sessions_refresh_token_key`
  - ❌ `users_emailIdx` (camelCase)

### Constraints

- **Primary Key**: `{table_name}_pkey`
- **Foreign Key**: `{table_name}_{referenced_table}_fkey`
- **Unique**: `{table_name}_{column_name}_key`
- **Check**: `{table_name}_{column_name}_check`
- **Examples**:
  - ✅ `users_pkey`
  - ✅ `sessions_user_id_fkey`
  - ✅ `users_email_key`

## Prisma Schema Mapping

**KEY PRINCIPLE**: Prisma model field names use **camelCase** (for TypeScript), and `@map()` directive maps them to **snake_case** database columns.

### Correct Example ✅

```prisma
model User {
  id            String   @id @default(uuid())
  email         String   @unique
  emailVerified Boolean  @default(false) @map("email_verified")  // ✅ Field: camelCase, DB: snake_case
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  sessions Session[]

  @@map("users")
}

model Session {
  id           String   @id @default(uuid())
  userId       String   @map("user_id")          // ✅ Field: camelCase, DB: snake_case
  user         User     @relation(fields: [userId], references: [id])
  refreshToken String   @unique @map("refresh_token")
  expiresAt    DateTime @map("expires_at")
  createdAt    DateTime @default(now()) @map("created_at")

  @@index([userId])
  @@map("sessions")
}
```

### Incorrect Example ❌

```prisma
model User {
  id             String   @id @default(uuid())
  email          String   @unique
  email_verified Boolean  @default(false) @map("email_verified")  // ❌ Field is snake_case!
  created_at     DateTime @default(now()) @map("created_at")       // ❌ Wrong!

  @@map("users")
}
```

### How It Works

1. **Prisma Schema**: Define fields in camelCase
2. **Database**: Columns are created in snake_case via `@map()`
3. **TypeScript Code**: Use camelCase naturally
4. **Prisma Client**: Automatically handles the mapping

```typescript
// TypeScript code - uses camelCase naturally
const user = await prisma.user.create({
  data: {
    email: "test@example.com",
    emailVerified: false,  // ✅ camelCase in code
    createdAt: new Date()
  }
});

// Prisma generates SQL with snake_case:
// INSERT INTO users (email, email_verified, created_at) VALUES (...)
```

## Migration Guide

When creating new tables or altering existing ones:

1. **Prisma Model**: Use PascalCase for model names, camelCase for field names
2. **Use `@map()` directive** for every field that should be snake_case in DB
3. **Use `@@map()` directive** to map model names to snake_case table names
4. **Generate migration** and review the SQL before applying
5. **NO backend code changes needed** - Prisma handles everything!

### Bad Example (Don't do this) ❌

```prisma
model User {
  userId        String   @id @default(uuid())           // ❌ Missing @map()
  emailVerified Boolean  @default(false)                // ❌ Missing @map()
  createdAt     DateTime @default(now())                // ❌ Missing @map()
}  // ❌ Missing @@map("users")
```

### Good Example (Do this) ✅

```prisma
model User {
  userId        String   @id @default(uuid()) @map("user_id")        // ✅
  emailVerified Boolean  @default(false) @map("email_verified")      // ✅
  createdAt     DateTime @default(now()) @map("created_at")          // ✅

  @@map("users")  // ✅
}
```

### Backend Code - No Changes Needed! ✅

```typescript
// Just use camelCase naturally - Prisma handles DB mapping!
const user = await prisma.user.create({
  data: {
    userId: uuid(),
    emailVerified: false,  // ✅ camelCase in code
    createdAt: new Date()
  }
});

// Access fields with camelCase
console.log(user.emailVerified);  // ✅ Works perfectly
console.log(user.createdAt);      // ✅ TypeScript autocomplete works
```

## Applied Services

This convention is applied across all my-girok services:

- ✅ **auth-service**: Users, sessions, domain access tokens, OAuth configs
- ✅ **personal-service**: Resumes, skills, experiences, projects, educations, certificates, share links, budgets, transactions

## Exceptions

There are NO exceptions to this rule. All new tables and columns MUST follow snake_case convention.

## References

- [PostgreSQL Naming Conventions](https://www.postgresql.org/docs/current/sql-syntax-lexical.html#SQL-SYNTAX-IDENTIFIERS)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [PostgreSQL Style Guide](https://www.sqlstyle.guide/)

## Enforcement

- **Code Review**: All pull requests with database changes MUST be reviewed for naming convention compliance
- **Automated Checks**: CI/CD pipeline should validate Prisma schema naming conventions
- **Documentation**: This document is the source of truth for all database naming decisions

---

Last Updated: 2025-11-09
Author: Engineering Team

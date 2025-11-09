# Database Naming Convention

This document defines the naming conventions for all database schemas in the my-girok project.

## Overview

All database objects (tables, columns, indexes, constraints) MUST use **snake_case** naming convention to follow PostgreSQL best practices and industry standards.

## Rationale

1. **PostgreSQL Standard**: PostgreSQL internally converts unquoted identifiers to lowercase. Using snake_case avoids the need for quoted identifiers and potential confusion.
2. **Readability**: Snake_case is more readable in SQL queries compared to camelCase
3. **Consistency**: Aligns with most PostgreSQL ecosystem tools and ORMs
4. **Best Practice**: Widely adopted in the PostgreSQL community

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

Prisma models use camelCase in TypeScript but map to snake_case in the database using the `@map()` and `@@map()` directives.

### Example

```prisma
model User {
  id             String   @id @default(uuid())
  email          String   @unique
  email_verified Boolean  @default(false) @map("email_verified")
  created_at     DateTime @default(now()) @map("created_at")
  updated_at     DateTime @updatedAt @map("updated_at")

  sessions Session[]

  @@map("users")
}

model Session {
  id            String   @id @default(uuid())
  user_id       String   @map("user_id")
  user          User     @relation(fields: [user_id], references: [id])
  refresh_token String   @unique @map("refresh_token")
  expires_at    DateTime @map("expires_at")
  created_at    DateTime @default(now()) @map("created_at")

  @@index([user_id])
  @@map("sessions")
}
```

## Migration Guide

When creating new tables or altering existing ones:

1. **Always use snake_case** for table and column names
2. **Use `@map()` directive** in Prisma schema to map camelCase field names to snake_case columns
3. **Use `@@map()` directive** to map PascalCase model names to snake_case table names
4. **Generate migration** and review the SQL before applying
5. **Test thoroughly** before deploying to production

### Bad Example (Don't do this)

```prisma
model User {
  userId        String   @id @default(uuid())
  emailVerified Boolean  @default(false)
  createdAt     DateTime @default(now())
}
```

### Good Example (Do this)

```prisma
model User {
  user_id        String   @id @default(uuid()) @map("user_id")
  email_verified Boolean  @default(false) @map("email_verified")
  created_at     DateTime @default(now()) @map("created_at")

  @@map("users")
}
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

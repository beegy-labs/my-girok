# Identity Service

> A centralized service for managing user accounts and profiles in a multi-app environment.

## 1. Role

- Manages the creation and administration of global user accounts.
- Synchronizes user profile information across multiple applications.
- Handles account linking and social login integrations.

## 2. Tech Stack

- **Database**: PostgreSQL
- **Framework**: NestJS
- **ORM**: Prisma

## 3. Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Run in development mode
pnpm start:dev
```

## 4. Environment Variables

Please refer to the `.env.example` file for required environment variables.

## 5. API Specification

<!-- Last rebuild: 2026-01-14 15:18 -->

- `GET /health`: Checks the service status.
- `GET /users/:id`: Retrieves a specific user's information.
- `POST /users`: Creates a new user.
- `PATCH /users/:id`: Updates a user's information.

# Legal Service

> Manages legal notices and consent records, such as user terms of service and privacy policy agreements.

## 1. Role

- Version control for legal documents like Terms of Service and Privacy Policies.
- Records and retrieves user consent history for legal documents.
- Supports data-sovereignty-related requests, such as GDPR.

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

- `GET /health`: Checks the service status.
- `GET /terms/:type`: Retrieves the latest version of a specific type of legal term.
- `POST /consents`: Records a user's consent to a legal document.
- `GET /consents/:userId`: Retrieves all consent records for a specific user.

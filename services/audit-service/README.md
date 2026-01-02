# Audit Service

> Compliance logging service using ClickHouse for high-volume, immutable audit data.

## 1. Role

- Records audit logs for major system events and user activities.
- Provides data for regulatory compliance and security audits.
- Enables fast ingestion and querying of large-volume log data.

## 2. Tech Stack

- **Database**: ClickHouse
- **Framework**: NestJS

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
- `POST /audit`: Creates an audit log entry.
- `GET /audit`: Queries audit logs with filter support.

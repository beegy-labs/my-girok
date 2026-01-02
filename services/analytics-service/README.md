# Analytics Service

> Business intelligence and data analysis service using ClickHouse.

## 1. Role

- Collects user behavior data and business metrics.
- Provides aggregated statistical data for dashboards.
- Supports data analysis for marketing and product improvement.

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
- `POST /events`: Collects analytics event data.
- `GET /stats`: Retrieves key business metrics.

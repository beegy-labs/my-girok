# Personal Service

Personal data management microservice for My-Girok platform.

## Features

- **Resume Management**: Create, update, and share Korean-style developer resumes
  - Sections: Skills, Experience, Projects, Education, Certificates
  - Drag-and-drop ordering
  - Visibility toggles for each section
  - PDF export (A4 optimized)

- **Share Links**: Temporary public sharing with expiration
  - 1 week, 1 month, 3 months, or permanent
  - View count tracking
  - Activation/deactivation controls

- **Budget** (Future): Income/expense tracking

## Tech Stack

- NestJS 10
- TypeScript
- PostgreSQL 16 + Prisma 5
- Passport JWT

## Setup

```bash
# Install dependencies
pnpm install

# Setup environment
cp .env.example .env
# Edit .env with your database credentials

# Run Prisma migration
pnpm prisma:generate
pnpm prisma:migrate

# Start development server
pnpm dev
```

## API Documentation

Swagger docs available at: `http://localhost:4002/docs`

## Database

- **Database**: `girok_personal_dev`
- **Host**: `db-postgres-001.beegy.net`
- **Port**: `5432`

## Environment Variables

```bash
NODE_ENV=development
PORT=4002
DATABASE_URL="postgresql://..."
JWT_SECRET="your-secret"
FRONTEND_URL="http://localhost:3000"
```

## API Endpoints

### Resume
- `POST /v1/resume` - Create resume
- `GET /v1/resume` - Get my resume
- `PUT /v1/resume` - Update resume
- `DELETE /v1/resume` - Delete resume
- `PATCH /v1/resume/sections/order` - Update section order
- `PATCH /v1/resume/sections/visibility` - Toggle section visibility

### Share
- `POST /v1/share/resume` - Create share link
- `GET /v1/share` - Get my share links
- `GET /v1/share/:id` - Get share link by ID
- `PATCH /v1/share/:id` - Update share link
- `DELETE /v1/share/:id` - Delete share link
- `GET /v1/share/public/:token` - Get public resume (no auth)

### Health
- `GET /health` - Health check

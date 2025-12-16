# Architecture Patterns

> **Simple REST microservices architecture**

## Core Principle

**Direct client-to-service communication:**
- Web frontend directly calls backend services
- Each service has own database
- JWT authentication across services
- Shared packages for code reuse

## Project Structure

```
my-girok/
├── apps/                   # Frontend clients
│   └── web-main/          # React 19.2 + Vite (Main app)
│
├── services/               # Backend microservices
│   ├── auth-service/      # Authentication & authorization (NestJS, port 4001)
│   └── personal-service/  # Resume, Share, Preferences (NestJS, port 4002)
│
└── packages/              # Shared code (ALWAYS use these!)
    ├── types/             # TypeScript types
    ├── nest-common/       # NestJS utilities
    │   ├── decorators/    # @Public, @CurrentUser
    │   ├── guards/        # JwtAuthGuard
    │   ├── filters/       # HttpExceptionFilter
    │   ├── strategies/    # JwtStrategy
    │   ├── bootstrap/     # configureApp()
    │   └── health/        # HealthModule (K8s probes)
    └── ui-components/     # React components & hooks
        ├── components/    # TextInput, Button, Alert, SortableList, etc.
        └── hooks/         # useAsyncOperation, etc.
```

## Service Responsibilities

### auth-service (Port 4001)
- User registration & login
- JWT token management (Access + Refresh)
- OAuth providers (Google, GitHub)
- Password reset
- User profile management

### personal-service (Port 4002)
- Resume CRUD & management
- Share link generation & access
- User preferences (theme, section order)
- File attachments (MinIO storage)
- Async file copy operations (BullMQ)

## Service Communication

**Rules:**
- Services NEVER call each other directly
- Use HTTP APIs when cross-service calls needed
- Each service has own database
- No shared database tables

```typescript
// ❌ DON'T: Direct import
import { UsersService } from '../users/users.service';

// ✅ DO: HTTP call
async getUser(id: string) {
  return this.httpService.get(`${AUTH_SERVICE_URL}/api/v1/users/${id}`);
}
```

## Authentication Flow

```
1. User submits credentials to auth-service
2. Auth service validates (Local/OAuth)
3. JWT tokens issued (Access 15min + Refresh 7days)
4. Client stores tokens in localStorage
5. All requests include token in Authorization header
6. Services validate JWT using shared secret
```

## Data Flow Examples

### User Login
```
1. Client → POST auth-service/api/v1/auth/login
2. Auth service validates credentials
3. Returns access + refresh tokens
4. Client stores tokens
```

### Create Resume
```
1. Client → POST personal-service/api/v1/resume
2. JWT validated by JwtAuthGuard
3. Resume created in personal DB
4. Returns resume data
```

### Share Resume
```
1. Client → POST personal-service/api/v1/share/resume/:id
2. Creates share link with token
3. Public access via GET /share/public/:token
```

## Shared Packages Usage

### @my-girok/nest-common

```typescript
// main.ts - Bootstrap service with standard config
import { configureApp } from '@my-girok/nest-common';

const app = await NestFactory.create(AppModule);
await configureApp(app, {
  serviceName: 'Personal Service',
  description: 'Resume and share management',
  defaultPort: 4002,
});
```

```typescript
// Controller - Use decorators
import { Public, CurrentUser } from '@my-girok/nest-common';

@Controller('resume')
export class ResumeController {
  @Public()  // Skip JWT auth
  @Get('public/:username')
  getPublicResume(@Param('username') username: string) {}

  @Get()  // Requires JWT (default)
  getMyResumes(@CurrentUser() user: User) {}
}
```

### @my-girok/ui-components

```tsx
import { TextInput, Button, Alert, useAsyncOperation } from '@my-girok/ui-components';

const { execute, loading, error } = useAsyncOperation({
  onSuccess: () => navigate('/dashboard'),
});

return (
  <>
    {error && <Alert variant="error">{error}</Alert>}
    <TextInput label="Email" value={email} onChange={setEmail} />
    <Button loading={loading} onClick={() => execute(login)}>Submit</Button>
  </>
);
```

## Service Independence

**Each service:**
- Has own Prisma schema
- Manages own database
- Can be deployed independently
- Has health check endpoint (`/health`, `/health/live`, `/health/ready`)
- Uses shared packages (`@my-girok/nest-common`, `@my-girok/types`)

## Key Takeaways

1. **Simple REST** - Direct client-to-service calls
2. **Service independent** - Each service standalone with own DB
3. **Shared code** - Common utilities in packages/
4. **JWT everywhere** - Shared secret across services

**For specific service APIs, see `.ai/services/`**

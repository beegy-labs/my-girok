# Architecture Patterns

> **Flexible multi-pattern architecture - ALL patterns coexist**

## Core Principle

**Everything is optional and composable:**
- Routing: Client → Gateway → BFF → Services (or skip layers)
- Protocols: REST, GraphQL, or both (per service choice)
- Layers: Gateway and BFF are optional

## Routing Options

```
1. Client → BFF → Services                    (Recommended for most)
2. Client → API Gateway → BFF → Services      (If need centralized auth)
3. Client → API Gateway → Services            (Skip BFF if simple)
4. Client → Services                          (Direct for internal tools)
```

## Protocol Flexibility

**Each service chooses independently:**
- REST only
- GraphQL only
- REST + GraphQL (both coexist)

## Project Structure

```
my-girok/
├── apps/                   # Clients
│   ├── web-main/          # React 19 + Vite (Main app)
│   ├── web-admin/         # Next.js 15 (Admin)
│   └── mobile-flutter/    # Flutter (iOS + Android)
├── services/
│   ├── gateway/
│   │   ├── api-gateway/   # Optional shared gateway
│   │   ├── web-bff/       # REST + GraphQL
│   │   └── mobile-bff/    # REST + GraphQL
│   ├── auth-service/      # REST + GraphQL
│   ├── personal-service/  # REST + GraphQL (Resume, etc.)
│   └── llm-api/           # REST only (Python)
└── packages/              # Shared code (ALWAYS use these!)
    ├── types/             # TypeScript types
    ├── nest-common/       # ✨ NestJS utilities (NEW)
    │   ├── decorators/    # @Public, @CurrentUser
    │   ├── guards/        # JwtAuthGuard
    │   ├── filters/       # HttpExceptionFilter
    │   ├── strategies/    # JwtStrategy
    │   ├── bootstrap/     # configureApp()
    │   └── database/      # BasePrismaService
    └── ui-components/     # ✨ React components & hooks (NEW)
        ├── components/    # TextInput, Button, Alert, SortableList, etc.
        └── hooks/         # useAsyncOperation, etc.
```

## Layer Responsibilities

### API Gateway (Optional)
- Central routing
- Common middleware (CORS, rate limiting, logging)
- JWT validation
- Use when: Need single entry point

### BFF Layer (Optional)
- Client-specific API optimization
- Aggregate multiple service calls
- Data transformation
- Caching strategies
- Use when: Different clients need different data shapes

### Service Layer (Always Present)
- Core business logic
- Independent databases
- Can expose REST, GraphQL, or both
- No direct service-to-service calls (use HTTP)

## Real-World Examples

### Web App (Mixed Protocols)

```typescript
// Login via REST (simple)
POST https://web-bff/api/auth/login
{ email, password }

// Dashboard via GraphQL (complex nested data)
POST https://web-bff/graphql
query {
  me {
    profile { name, avatar }
    posts(limit: 10) { title, tags }
    stats { totalPosts, totalViews }
  }
}
```

### Mobile App (REST Only)

```typescript
GET https://mobile-bff/api/posts?limit=20
GET https://mobile-bff/api/user/profile
```

### Admin Tool (Direct to Service)

```typescript
POST https://auth-service/graphql
query { allUsers { id, email, role } }
```

## GraphQL + REST Coexistence

**At BFF Level:**

```typescript
// web-bff/src/app.module.ts
@Module({
  imports: [
    GraphQLModule.forRoot({
      autoSchemaFile: true,
      path: '/graphql',  // GraphQL endpoint
    }),
    RestModule,          // REST endpoints at /api/*
  ],
})
export class AppModule {}

// Results in:
// http://web-bff/graphql  ← GraphQL
// http://web-bff/api/*    ← REST
```

**At Service Level:**

```typescript
// auth-service/src/app.module.ts
@Module({
  imports: [
    RestModule.forRoot({ prefix: '/api/v1' }),
    GraphQLModule.forRoot({ path: '/graphql' }),
  ],
})
export class AppModule {}

// Service exposes both:
// http://auth-service/api/v1/*  ← REST
// http://auth-service/graphql   ← GraphQL
```

## When to Use Each Layer

### Use Gateway When:
- Need centralized auth/rate limiting
- Want single entry point for all clients
- Need request/response logging in one place

### Use BFF When:
- Different clients need different data shapes
- Need to aggregate multiple service calls
- Want client-specific caching
- GraphQL benefits (flexible queries)

### Skip Layers When:
- Internal admin tools (direct to services)
- Simple microservice communication
- Prototyping (speed is priority)

## Protocol Selection

### Use REST When:
- Simple CRUD operations
- Standard HTTP semantics
- Easy HTTP caching
- Mobile prefers simplicity

### Use GraphQL When:
- Complex nested data requirements
- Clients need flexible field selection
- Want to reduce over-fetching
- Real-time subscriptions needed

### Use Both When:
- Diverse client needs
- Gradual migration REST → GraphQL
- Want best of both worlds

## Service Communication

**Rules:**
- Services NEVER call each other directly
- Use HTTP APIs (through Gateway or direct)
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

## Data Flow Examples

### Create Post with Tags

```
1. Client → web-bff/graphql
2. BFF → content-api/api/v1/posts (REST)
3. BFF → content-api/api/v1/tags (REST)
4. BFF aggregates & returns GraphQL response
```

### User Login

```
1. Client → web-bff/api/auth/login (REST)
2. BFF → auth-service/api/v1/auth/login (REST)
3. Auth service validates & returns JWT
4. BFF adds JWT to HttpOnly cookie
5. Returns access token to client
```

### Dashboard Data

```
1. Client → web-bff/graphql (single query)
2. BFF → auth-service/api/v1/users/{id}
3. BFF → content-api/api/v1/posts?authorId={id}
4. BFF → content-api/api/v1/stats/{id}
5. BFF aggregates all data
6. Returns single GraphQL response
```

## Authentication Flow

```
1. User submits credentials
2. Gateway validates & routes to auth-service
3. Auth service executes strategy (Local/OAuth)
4. JWT tokens issued (Access 15min + Refresh 7days)
5. Client stores tokens:
   - Web: HttpOnly cookies + localStorage
   - iOS: Keychain
   - Android: EncryptedSharedPreferences
6. All requests include token in Authorization header
7. Gateway/BFF validates token before routing
```

## Shared Packages Usage

### Backend Services (@my-girok/nest-common)

**Before (Every service ~100 lines boilerplate):**
```typescript
// main.ts
const app = await NestFactory.create(AppModule);
app.setGlobalPrefix('api/v1');
app.useGlobalPipes(new ValidationPipe());
app.useGlobalFilters(new HttpExceptionFilter());
// ... 90+ more lines
```

**After (~20 lines):**
```typescript
// main.ts
import { configureApp } from '@my-girok/nest-common';

const app = await NestFactory.create(AppModule);
await configureApp(app, {
  serviceName: 'Auth Service',
  description: 'Authentication and authorization service',
  defaultPort: 3001,
});
```

**Controller example:**
```typescript
import { Public, CurrentUser } from '@my-girok/nest-common';

@Controller('auth')
export class AuthController {
  @Public()  // Skip JWT auth
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')  // Requires JWT
  getProfile(@CurrentUser() user: User) {
    return this.authService.getProfile(user.id);
  }
}
```

### Frontend Apps (@my-girok/ui-components)

**Before (Every form ~60 lines):**
```tsx
const [email, setEmail] = useState('');
const [loading, setLoading] = useState(false);
const [error, setError] = useState('');

const handleSubmit = async () => {
  setLoading(true);
  setError('');
  try {
    await login(email);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

return (
  <div>
    <label className="...">Email</label>
    <input className="..." value={email} onChange={...} />
    {error && <p className="...">{error}</p>}
    <button disabled={loading} className="...">
      {loading ? 'Loading...' : 'Submit'}
    </button>
  </div>
);
```

**After (~15 lines):**
```tsx
import { TextInput, Button, Alert, useAsyncOperation } from '@my-girok/ui-components';

const [email, setEmail] = useState('');
const { execute, loading, error } = useAsyncOperation({
  onSuccess: () => navigate('/dashboard'),
});

return (
  <div>
    {error && <Alert variant="error">{error}</Alert>}
    <TextInput label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
    <Button loading={loading} onClick={() => execute(() => login(email))}>
      Submit
    </Button>
  </div>
);
```

## Service Independence

**Each service:**
- Has own Prisma schema
- Manages own database
- Can be deployed independently
- Chooses own protocols (REST/GraphQL)
- Has own health check endpoint
- **Uses shared packages** (`@my-girok/nest-common`, `@my-girok/types`)

## Client Flexibility

| Client | BFF Used? | Protocol | Reason |
|--------|-----------|----------|---------|
| Web Main | Yes (Web BFF) | GraphQL + REST | Complex UI needs |
| Admin | Yes (Web BFF) | GraphQL mostly | Needs all fields |
| Mobile (Flutter) | Yes (Mobile BFF) | REST only | Simpler networking, cross-platform |
| Internal | No | Direct to services | Skip layers |

## Key Takeaways

1. **No forced architecture** - Choose what fits the use case
2. **Protocol agnostic** - REST, GraphQL, or both work
3. **Layer optional** - Gateway and BFF can be bypassed
4. **Service independent** - Each service standalone
5. **Client flexible** - Each client picks best approach

**For specific service APIs and flows, see `.ai/services/` and `.ai/apps/`**

# Security Policies

> **CRITICAL**: All developers MUST follow these security guidelines

## Input Validation & Sanitization

### ALWAYS Validate User Input

```typescript
// ✅ DO: Use class-validator decorators
import { IsEmail, IsString, MinLength, MaxLength, IsNotEmpty } from 'class-validator';

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsString()
  @MaxLength(10000)
  content: string;
}
```

### Common Vulnerabilities

1. **SQL Injection Prevention**
   - ALWAYS use Prisma parameterized queries
   - NEVER use raw SQL with user input
   - If raw SQL needed, use `prisma.$queryRaw` with parameters

2. **XSS Prevention**
   - Sanitize HTML content (use DOMPurify on frontend)
   - Escape user input in templates
   - Set `Content-Security-Policy` headers

3. **CSRF Protection**
   - Use SameSite cookies (`SameSite=Lax` or `Strict`)
   - CSRF tokens for state-changing operations

4. **File Upload Security**
   - Validate file type (MIME type + extension)
   - Size limit: 10MB for images, 50MB for documents
   - Scan with antivirus (ClamAV recommended)
   - Store in isolated directory (not web root)
   - Generate random filenames

```typescript
@Post('upload')
@UseInterceptors(FileInterceptor('file', {
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new BadRequestException('Invalid file type'), false);
    }
  },
}))
async uploadFile(@UploadedFile() file: Express.Multer.File) {
  // Additional validation and virus scan
}
```

## API Security

### Rate Limiting

**Limits by Endpoint Type:**
- Public endpoints: 100 req/min per IP
- Auth endpoints (login/register): 5 req/min per IP
- Authenticated endpoints: 1000 req/min per user
- File uploads: 10 req/min per user

```typescript
@Injectable()
export class RateLimitMiddleware {
  // Implement using @nestjs/throttler
}
```

### API Versioning

- Format: `/api/v1/`, `/api/v2/`
- Maintain backward compatibility for at least 6 months
- Deprecation notice: Add `Sunset` header 3 months before removal
- Breaking changes require new major version

### CORS Policy

```typescript
// services/auth-service/src/main.ts
// services/personal-service/src/main.ts
app.enableCors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://mygirok.dev', 'https://admin.mygirok.dev']
    : ['http://localhost:3000', 'http://localhost:3001', 'https://my-dev.girok.dev'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  maxAge: 3600, // Cache preflight for 1 hour (iOS Safari compatibility)
  optionsSuccessStatus: 204, // Some legacy browsers (IE11) choke on 204
});
```

**Mobile Browser Considerations:**
- **iOS Safari CORS Strictness**: iOS Safari enforces CORS more strictly than other browsers
  - Requires explicit header listing (no wildcards) in `allowedHeaders`
  - `Authorization` header always triggers preflight (OPTIONS) requests
  - Preflight caching (`maxAge`) is critical to reduce overhead
  - Without `maxAge`, Safari sends OPTIONS on every request
- **Ensure public endpoints don't require Authorization header**
- **Test CORS preflight (OPTIONS) requests on mobile devices**
- **Consider adding specific origin patterns for mobile deep links**
- **iOS Safari Debugging**: Use Safari Web Inspector (Settings > Safari > Advanced > Web Inspector) to debug CORS issues on actual iOS devices

### Public Endpoint Security

**Public endpoints (marked with @Public() decorator) must NOT require authentication.**

#### Backend Setup

```typescript
// ✅ DO: Use @Public() decorator for endpoints that don't require auth
@Get('public/:token')
@Public()
@ApiOperation({ summary: 'Get public resume by share token (no auth)' })
async getPublicResume(@Param('token') token: string) {
  return this.shareService.getPublicResume(token);
}
```

#### Frontend HTTP Client Configuration

**CRITICAL: HTTP interceptors must skip auth for public endpoints**

```typescript
// ✅ DO: Skip auth headers for public endpoints
api.interceptors.request.use(async (config) => {
  // Detect public endpoints
  const isPublicEndpoint = config.url?.includes('/share/public/') ||
                           config.url?.includes('/resume/public/');

  if (isPublicEndpoint) {
    return config; // Skip auth header injection
  }

  // Add auth for non-public endpoints
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

// ✅ DO: Skip auth retry for public endpoints
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const isPublicEndpoint = error.config.url?.includes('/public/');

    if (isPublicEndpoint) {
      return Promise.reject(error); // Don't trigger login redirect
    }

    // Handle 401 for authenticated endpoints
    if (error.response?.status === 401) {
      // Refresh token logic...
    }

    return Promise.reject(error);
  }
);
```

**Why this matters:**
- Mobile browsers (especially Safari) are more strict about unnecessary auth headers
- Sending auth headers to public endpoints can cause CORS preflight failures
- 401 errors on public endpoints should not trigger login redirects

**Testing Requirements:**
- Test public endpoints on iOS Safari, Android Chrome, and desktop browsers
- Verify no Authorization headers are sent for public endpoints
- Ensure 404/403 errors don't redirect to login page

## Mobile Browser Compatibility

### Overview

Mobile browsers, particularly iOS Safari, have stricter security policies and unique behaviors that can cause compatibility issues. This section outlines common mobile browser issues and solutions.

### iOS Safari Specific Issues

#### 1. CORS Preflight Caching

**Problem:**
- iOS Safari does NOT cache preflight (OPTIONS) requests without explicit `Access-Control-Max-Age` header
- Results in duplicate OPTIONS requests on every API call
- Significantly degrades performance and increases mobile data usage

**Solution:**
```typescript
// ✅ REQUIRED: Set maxAge for preflight caching
app.enableCors({
  // ... other settings
  maxAge: 3600, // Cache preflight for 1 hour
});
```

**Impact:**
- Before: 2 requests per API call (OPTIONS + actual request)
- After: 1 OPTIONS request per hour + actual requests
- Reduces network overhead by ~50%

#### 2. Authorization Header Triggers Preflight

**Problem:**
- iOS Safari ALWAYS triggers preflight for requests with `Authorization` header
- Other browsers may skip preflight for same-origin requests
- Safari requires explicit header listing (no wildcards)

**Solution:**
```typescript
// ✅ DO: Explicitly list all headers
app.enableCors({
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  // ❌ DON'T: Use wildcards - Safari doesn't support them
  // allowedHeaders: '*',
});
```

#### 3. Strict OPTIONS Response Validation

**Problem:**
- Safari validates OPTIONS response headers more strictly
- Missing `Access-Control-Allow-Headers` causes CORS failure
- Must include `OPTIONS` in allowed methods

**Solution:**
```typescript
app.enableCors({
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], // Include OPTIONS
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'], // Explicit list
});
```

#### 4. localStorage in Private Browsing

**Problem:**
- iOS Safari blocks `localStorage` access in Private Browsing mode
- Causes auth token storage to fail silently
- Common issue: "QuotaExceededError: DOM Exception 22"

**Solution:**
```typescript
// ✅ DO: Handle localStorage errors gracefully
try {
  localStorage.setItem('auth-storage', JSON.stringify(authState));
} catch (error) {
  if (error.name === 'QuotaExceededError') {
    console.warn('Private Browsing mode detected, using sessionStorage fallback');
    sessionStorage.setItem('auth-storage', JSON.stringify(authState));
  }
}
```

### Android Chrome Specific Issues

#### 1. Credentials Mode with CORS

**Problem:**
- Android Chrome requires `credentials: 'include'` for cookies
- Must set `Access-Control-Allow-Credentials: true` on backend

**Solution:**
```typescript
// Backend
app.enableCors({
  credentials: true, // REQUIRED for cookies
});

// Frontend
fetch('/api/endpoint', {
  credentials: 'include', // REQUIRED for sending cookies
});
```

### Mobile Debugging Tools

#### iOS Safari Web Inspector

**Setup:**
1. iPhone: Settings > Safari > Advanced > Web Inspector (Enable)
2. Mac: Safari > Preferences > Advanced > Show Develop menu (Enable)
3. Connect iPhone to Mac via USB
4. Mac Safari > Develop > [Your iPhone] > [Your Tab]

**Usage:**
- Console tab: View error messages
- Network tab: Inspect OPTIONS preflight requests
- Storage tab: Check localStorage/cookies

#### Android Chrome Remote Debugging

**Setup:**
1. Android: Settings > Developer Options > USB Debugging (Enable)
2. Chrome Desktop: chrome://inspect/#devices
3. Connect Android device via USB

**Usage:**
- Inspect network requests
- View console logs
- Debug CORS issues

### Mobile Testing Checklist

**Before Production Deploy:**
- [ ] Test authenticated endpoints on iOS Safari (real device)
- [ ] Test authenticated endpoints on Android Chrome (real device)
- [ ] Verify preflight caching with Network Inspector
- [ ] Test in Private Browsing mode (iOS Safari)
- [ ] Test in Incognito mode (Android Chrome)
- [ ] Verify localStorage fallback works
- [ ] Check network performance (reduce OPTIONS requests)
- [ ] Test offline/poor network scenarios

**CORS Configuration Verification:**
- [ ] `maxAge: 3600` set for preflight caching
- [ ] `OPTIONS` included in allowed methods
- [ ] All headers explicitly listed (no wildcards)
- [ ] `credentials: true` set if using cookies
- [ ] `exposedHeaders` includes necessary response headers

**Common Mobile CORS Errors:**

| Error Message | Cause | Solution |
|---------------|-------|----------|
| "CORS policy: No 'Access-Control-Allow-Origin'" | Origin not in whitelist | Add origin to CORS config |
| "CORS policy: Request header field Authorization" | Missing Authorization in allowedHeaders | Add 'Authorization' to allowedHeaders |
| "Preflight response invalid (redirect)" | OPTIONS returns 3xx redirect | Ensure OPTIONS returns 200/204 |
| "QuotaExceededError" | localStorage in Private Browsing | Use sessionStorage fallback |

### Performance Optimization for Mobile

**Reduce Preflight Requests:**
```typescript
// ✅ BEST: Set maxAge to cache preflight
app.enableCors({
  maxAge: 3600, // 1 hour cache
});

// 📊 Impact:
// - Before: 100 API calls = 200 network requests (100 OPTIONS + 100 actual)
// - After: 100 API calls = 101 network requests (1 OPTIONS + 100 actual)
// - Savings: 49.5% fewer requests
```

**Minimize Header Count:**
```typescript
// Only include necessary headers
allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
// Don't include headers you don't use
```

### Known Issues and Workarounds

#### Issue: iOS Safari 14+ Cookie SameSite

**Problem:**
- Safari 14+ requires `SameSite=None; Secure` for cross-origin cookies
- Affects third-party cookie scenarios

**Workaround:**
```typescript
// Use tokens in headers instead of cookies for cross-origin
// OR set correct cookie attributes
res.cookie('token', value, {
  sameSite: 'none',
  secure: true, // HTTPS required
});
```

#### Issue: Mobile Data Connection Timeouts

**Problem:**
- Slow mobile networks cause timeout before preflight completes
- Default axios timeout may be too short

**Solution:**
```typescript
// ✅ Increase timeout for mobile
const api = axios.create({
  timeout: 15000, // 15 seconds (was 5000)
});
```

### Reference Links

- [MDN: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Safari Web Inspector Guide](https://developer.apple.com/safari/tools/)
- [Chrome DevTools: Remote Debugging](https://developer.chrome.com/docs/devtools/remote-debugging/)

## Secrets Management

### NEVER:
- ❌ Commit secrets to git (.env, credentials.json, private keys)
- ❌ Hardcode secrets in source code
- ❌ Log secrets (passwords, tokens, API keys)
- ❌ Share secrets via Slack/email
- ❌ Store plain text Kubernetes Secrets in Git

### ALWAYS:
- ✅ Use environment variables via `ConfigService`
- ✅ Use `.env.example` for documentation (with placeholder values)
- ✅ Rotate JWT secrets every 90 days
- ✅ Use separate secrets per environment (dev/staging/prod)
- ✅ Use Kubernetes Secrets management in production (Sealed Secrets or External Secrets Operator)

```typescript
// ✅ DO: Use ConfigService
@Injectable()
export class AuthService {
  constructor(private configService: ConfigService) {}

  getJwtSecret() {
    return this.configService.get<string>('JWT_SECRET');
  }
}

// ❌ DON'T: Hardcode secrets
const JWT_SECRET = 'my-secret-key-123';
```

### Kubernetes Secrets Management (Production)

**IMPORTANT**: All deployments except app development are performed on Kubernetes.

#### Sealed Secrets (Recommended)

**Securely store encrypted secrets in Git using Bitnami Sealed Secrets:**

```bash
# 1. Create Secret (temporary file)
kubectl create secret generic auth-secrets \
  --from-literal=JWT_SECRET=your-jwt-secret \
  --from-literal=DATABASE_URL=postgresql://... \
  --dry-run=client -o yaml > /tmp/secret.yaml

# 2. Encrypt as Sealed Secret
kubeseal --format yaml < /tmp/secret.yaml > k8s/secrets/production/auth-sealed-secret.yaml

# 3. Delete original (IMPORTANT!)
rm /tmp/secret.yaml

# 4. Encrypted file can be committed to Git
git add k8s/secrets/production/auth-sealed-secret.yaml
```

**Sealed Secret Example:**

```yaml
# k8s/secrets/production/auth-sealed-secret.yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: auth-secrets
  namespace: mygirok-production
spec:
  encryptedData:
    JWT_SECRET: AgBg8F7X... # Encrypted data - safe to commit to Git
    DATABASE_URL: AgCx9K2... # Encrypted data
  template:
    metadata:
      name: auth-secrets
```

**Usage in Deployment:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
spec:
  template:
    spec:
      containers:
      - name: auth-service
        env:
        # Sealed Secret automatically converted to regular Secret
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: auth-secrets
              key: JWT_SECRET
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: auth-secrets
              key: DATABASE_URL
```

#### External Secrets Operator (Alternative)

**Integration with AWS Secrets Manager, Google Secret Manager, HashiCorp Vault:**

```yaml
# ExternalSecret definition
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: auth-secrets
  namespace: mygirok-production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secretstore
    kind: SecretStore
  target:
    name: auth-secrets
  data:
  - secretKey: JWT_SECRET
    remoteRef:
      key: mygirok/production/auth
      property: jwt_secret
  - secretKey: DATABASE_URL
    remoteRef:
      key: mygirok/production/database
      property: connection_url
```

#### ConfigMap vs Secret

```yaml
# ✅ ConfigMap - Non-sensitive public configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  API_VERSION: "v1"
  REDIS_HOST: "redis-service"
  DATABASE_HOST: "postgres-service"

---
# ✅ Secret - Sensitive information (managed with Sealed Secrets)
apiVersion: v1
kind: Secret
metadata:
  name: database-credentials
type: Opaque
stringData:
  DATABASE_URL: "postgresql://user:password@host:5432/db"
  REDIS_PASSWORD: "secret-password"
```

### Secrets Rotation

**Automated rotation schedule:**
- JWT Secret: Every 90 days
- Database Password: Every 180 days
- API Keys: Every 90 days

```bash
# Secret update procedure
# 1. Create and encrypt new secret
kubeseal --format yaml < new-secret.yaml > k8s/secrets/production/auth-sealed-secret.yaml

# 2. Commit to Git
git add k8s/secrets/production/auth-sealed-secret.yaml
git commit -m "chore(security): rotate JWT secret"

# 3. Deploy
kubectl apply -f k8s/secrets/production/auth-sealed-secret.yaml

# 4. Restart pods (apply new secret)
kubectl rollout restart deployment/auth-service -n mygirok-production
```

### Kubernetes RBAC for Secrets

**Secret access control:**

```yaml
# Create ServiceAccount
apiVersion: v1
kind: ServiceAccount
metadata:
  name: auth-service-sa
  namespace: mygirok-production

---
# Role - Read-only access to secrets
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: secret-reader
  namespace: mygirok-production
rules:
- apiGroups: [""]
  resources: ["secrets"]
  resourceNames: ["auth-secrets"]
  verbs: ["get"]

---
# RoleBinding
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: auth-service-secret-binding
  namespace: mygirok-production
subjects:
- kind: ServiceAccount
  name: auth-service-sa
roleRef:
  kind: Role
  name: secret-reader
  apiGroup: rbac.authorization.k8s.io
```

**Apply ServiceAccount to Deployment:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
spec:
  template:
    spec:
      serviceAccountName: auth-service-sa  # Apply RBAC
      containers:
      - name: auth-service
        # ...
```

**For more details, see [DEPLOYMENT.md](DEPLOYMENT.md).**

## Authentication Security

### Token Expiration Policy

**Current Configuration:**
- **Access Token**: 15 minutes (JWT_ACCESS_EXPIRATION)
- **Refresh Token**: 14 days (JWT_REFRESH_EXPIRATION)
- **Domain Access Token**: Configurable (1-72 hours)

**Token Lifecycle:**
1. User logs in → receives both access token (15m) and refresh token (14d)
2. Access token used for API authentication
3. When access token expires → automatically refreshed using refresh token
4. **Proactive Refresh**: Refresh token is automatically renewed when it has 7 days or less remaining
5. After 14 days of inactivity → user must re-login

**Rationale:**
- **15-minute access token**: Minimizes security risk if token is compromised
- **14-day refresh token**: Balances security and user convenience (2-week session)
- **7-day proactive refresh**: Ensures active users never need to re-login
  - Users who login weekly will have refresh token automatically extended
  - Token is silently renewed in background without user interruption

**Implementation:**
```typescript
// Check if refresh token expires within 7 days and renew it
const shouldRefreshToken = (token: string): boolean => {
  const decoded = JSON.parse(atob(token.split('.')[1]));
  const expiryTime = decoded.exp * 1000;
  const currentTime = Date.now();
  const daysUntilExpiry = (expiryTime - currentTime) / (1000 * 60 * 60 * 24);

  return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
};
```

### Token Storage
- **Web**: HttpOnly cookies (refresh token) + localStorage (access token)
- **Mobile (Flutter)**: flutter_secure_storage package
  - **iOS**: Keychain with `kSecAttrAccessibleWhenUnlocked`
  - **Android**: EncryptedSharedPreferences with AES-256-GCM

### Password Policy
- Minimum 8 characters
- Must include: uppercase, lowercase, number, special character
- Hash with bcrypt (salt rounds: 12)
- Prevent common passwords (use dictionary check)

```typescript
import * as bcrypt from 'bcrypt';

async hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}
```

## Security Headers

**MUST set these headers on all responses:**

```typescript
// helmet middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://rybbit.girok.dev"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));
```

**Required Headers:**
- `Strict-Transport-Security`: Force HTTPS
- `X-Content-Type-Options: nosniff`: Prevent MIME sniffing
- `X-Frame-Options: DENY`: Prevent clickjacking
- `X-XSS-Protection: 1; mode=block`: XSS protection
- `Content-Security-Policy`: Restrict resource loading

## Error Handling

### Consistent Error Response

```typescript
// packages/types/src/common/error.ts
export interface ApiError {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
  requestId: string;
  details?: any; // Optional, for validation errors
}
```

### Logging Security

**NEVER log sensitive data:**
- ❌ Passwords
- ❌ Tokens (access, refresh, API keys)
- ❌ Credit card numbers
- ❌ Full email addresses in production (mask: `j***@example.com`)
- ❌ Phone numbers (mask: `***-***-1234`)

**PII Masking:**
```typescript
function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  return `${name.charAt(0)}***@${domain}`;
}
```

## Security Checklist

### Before Production Deploy
- [ ] All environment variables use ConfigService
- [ ] No secrets committed to git
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Security headers set (helmet)
- [ ] HTTPS enforced
- [ ] File upload validation implemented
- [ ] SQL injection prevention verified
- [ ] XSS prevention verified
- [ ] CSRF protection enabled
- [ ] Password hashing with bcrypt (rounds: 12)
- [ ] JWT secret rotation scheduled
- [ ] Error messages don't expose sensitive info
- [ ] Logging doesn't contain PII

## Security Contact

For security vulnerabilities, please email: security@mygirok.dev

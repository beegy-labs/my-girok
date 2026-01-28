# Task 04: Code Changes - Domain Auth & JWT

> Implement X-Service-Id + optional domain validation with Valkey caching

## Goal

Implement secure authentication with flexible domain validation:

1. **X-Service-Id header validation** (always required) ✅
2. **Referer/Origin domain validation** (optional, controlled by service_configs.domain_validation) ⚙️
3. **Valkey caching** for performance (~2ms with cache) 🚀
4. **web-admin control** for domain validation ON/OFF 🎛️

## Prerequisites

- [x] Task 01 completed (Database Audit)
- [x] Task 02 completed (Vault Root Token Setup)
- [x] Task 03 completed (Seed File Modification)
- [x] Feature branch created

## Authentication Flow

```
Frontend (my-dev.girok.dev)
  ↓
Request Headers:
  - X-Service-Id: abc123-uuid (services.id)
  - Referer: https://my-dev.girok.dev
  ↓
auth-bff (login/register):
  ┌─────────────────────────────────────┐
  │ 1. X-Service-Id 검증 (항상 필수)    │
  │    - Valkey 캐시 확인 (2ms)         │
  │    - 캐시 미스 → DB 조회 (50ms)      │
  └─────────────────────────────────────┘
  ↓
  ┌─────────────────────────────────────┐
  │ 2. service_configs.domain_validation│
  │    확인 (캐시에 포함)                │
  │    - true → Referer/Origin 검증 ✅  │
  │    - false → 도메인 검증 스킵 ⏭️    │
  └─────────────────────────────────────┘
  ↓
✅ Authorized
```

## Database Schema (Already Exists)

```sql
-- service_configs 테이블
CREATE TABLE service_configs (
  id UUID PRIMARY KEY,
  service_id UUID REFERENCES services(id),
  jwt_validation BOOLEAN DEFAULT true,
  domain_validation BOOLEAN DEFAULT true,  -- ← 이 플래그 사용!
  rate_limit_enabled BOOLEAN DEFAULT true,
  ...
);
```

## Performance Optimization

| Scenario               | DB Query | Cache Query | Latency |
| ---------------------- | -------- | ----------- | ------- |
| **First login**        | 1        | 0           | ~50ms   |
| **Cache hit**          | 0        | 1           | ~2ms ✅ |
| **After cache expire** | 1        | 1           | ~50ms   |

**Cache TTL**: 1 hour (3600s)

## Implementation

### Part A: auth-service - Service Verification with Caching

#### A1. Add verifyServiceDomain Method

**File**: `services/auth-service/src/services/services.service.ts`

Add interface for service config:

```typescript
interface ServiceConfigRow {
  id: string;
  slug: string;
  name: string;
  domains: string[];
  domainValidation: boolean;
  jwtValidation: boolean;
  rateLimitEnabled: boolean;
}
```

Add method:

```typescript
  /**
   * Verify service ID and optionally domain
   * Uses Valkey caching to minimize DB load
   *
   * Cache key: {env}:auth:service:config:{serviceId}
   * Cache value: { id, slug, name, domains, domainValidation, ... }
   * TTL: 1 hour (3600s)
   *
   * @param serviceId - Service UUID from X-Service-Id header
   * @param domain - Domain from Referer/Origin header (optional)
   * @returns { valid: boolean, service?: ServiceConfigRow, reason?: string }
   */
  async verifyServiceDomain(
    serviceId: string,
    domain?: string,
  ): Promise<{ valid: boolean; service?: ServiceConfigRow; reason?: string }> {
    // Input validation
    if (!serviceId) {
      return { valid: false, reason: 'Missing service ID' };
    }

    // Validate UUID format (prevent SQL injection)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(serviceId)) {
      this.logger.warn(`Invalid service ID format: ${serviceId}`);
      return { valid: false, reason: 'Invalid service ID format' };
    }

    // ==========================================
    // STEP 1: Check Valkey cache
    // ==========================================
    const cacheKey = CacheKey.make('auth', 'service', 'config', serviceId);
    let serviceConfig = await this.cache.get<ServiceConfigRow>(cacheKey);

    if (serviceConfig) {
      this.logger.debug(`Cache hit for service config: ${serviceId}`);
    } else {
      // ==========================================
      // STEP 2: Cache miss - Query DB
      // ==========================================
      this.logger.debug(`Cache miss for service config: ${serviceId}, querying DB`);

      try {
        const results = await this.prisma.$queryRaw<ServiceConfigRow[]>`
          SELECT
            s.id,
            s.slug,
            s.name,
            s.domains,
            COALESCE(sc.domain_validation, true) as "domainValidation",
            COALESCE(sc.jwt_validation, true) as "jwtValidation",
            COALESCE(sc.rate_limit_enabled, true) as "rateLimitEnabled"
          FROM services s
          LEFT JOIN service_configs sc ON s.id = sc.service_id
          WHERE s.id = ${serviceId}::uuid
            AND s.is_active = true
          LIMIT 1
        `;

        if (results.length === 0) {
          this.logger.warn(`Service not found or inactive: ${serviceId}`);
          return { valid: false, reason: 'Service not found' };
        }

        serviceConfig = results[0];

        // Cache for 1 hour
        await this.cache.set(cacheKey, serviceConfig, CacheTTL.DYNAMIC_CONFIG); // 3600s

        this.logger.log(`Service config cached: ${serviceConfig.slug} (${serviceId})`);
      } catch (error) {
        this.logger.error('Failed to query service config', error);
        return { valid: false, reason: 'Database error' };
      }
    }

    // ==========================================
    // STEP 3: X-Service-Id validation passed
    // ==========================================

    // ==========================================
    // STEP 4: Check domain_validation flag
    // ==========================================
    if (!serviceConfig.domainValidation) {
      this.logger.log(
        `Domain validation disabled for service: ${serviceConfig.slug} (${serviceId})`,
      );
      return { valid: true, service: serviceConfig };
    }

    // ==========================================
    // STEP 5: domain_validation = true → Validate domain
    // ==========================================
    if (!domain) {
      return { valid: false, reason: 'Missing domain (domain_validation enabled)' };
    }

    // Normalize domain
    const normalizedDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const domainWithoutPort = normalizedDomain.replace(/:\d+$/, '');

    // Check if domain matches
    const domainMatch =
      serviceConfig.domains.includes(normalizedDomain) ||
      serviceConfig.domains.includes(domainWithoutPort);

    if (domainMatch) {
      this.logger.log(
        `Domain validation passed: ${normalizedDomain} for service ${serviceConfig.slug}`,
      );
      return { valid: true, service: serviceConfig };
    } else {
      this.logger.warn(
        `Domain validation failed: ${normalizedDomain} not in [${serviceConfig.domains.join(', ')}]`,
      );
      return {
        valid: false,
        reason: `Domain ${normalizedDomain} not allowed for this service`,
      };
    }
  }
```

#### A2. Add Cache Invalidation Method

**File**: `services/auth-service/src/services/services.service.ts`

Update existing method or add new one:

```typescript
  /**
   * Invalidate service config cache
   * Call this after updating service_configs
   */
  async invalidateServiceConfigCache(serviceId: string): Promise<void> {
    const cacheKey = CacheKey.make('auth', 'service', 'config', serviceId);
    await this.cache.del(cacheKey);
    this.logger.log(`Service config cache invalidated: ${serviceId}`);
  }
```

#### A3. Add Verification Endpoint

**File**: `services/auth-service/src/services/services.controller.ts`

Add DTO first:

```typescript
import { IsString, IsOptional } from 'class-validator';

export class VerifyServiceDomainDto {
  @IsString()
  serviceId: string;

  @IsString()
  @IsOptional()
  domain?: string;
}
```

Add endpoint:

```typescript
  /**
   * Verify service ID + optional domain
   * POST /v1/services/verify-domain
   * Body: { serviceId: string, domain?: string }
   * Public endpoint - no auth required
   */
  @Post('verify-domain')
  @Public()
  @HttpCode(HttpStatus.OK)
  async verifyServiceDomain(@Body() dto: VerifyServiceDomainDto) {
    const result = await this.servicesService.verifyServiceDomain(
      dto.serviceId,
      dto.domain,
    );

    return {
      valid: result.valid,
      service: result.service
        ? {
            id: result.service.id,
            slug: result.service.slug,
            name: result.service.name,
            domainValidation: result.service.domainValidation,
          }
        : null,
      reason: result.reason,
    };
  }
```

#### A4. Update Domain Lookup Endpoint (add service ID)

**File**: `services/auth-service/src/services/services.controller.ts`

Update existing endpoint to include `id`:

```typescript
  /**
   * Get service by domain (public, no auth)
   * GET /v1/services/domain/:domain
   * Used by frontend to get service ID for X-Service-Id header
   */
  @Get('domain/:domain')
  @Public()
  async getServiceByDomain(@Param('domain') domain: string) {
    const service = await this.servicesService.getServiceFromDomain(
      decodeURIComponent(domain),
    );

    if (!service) {
      return null; // Soft failure
    }

    return {
      id: service.id,      // ← Frontend uses this for X-Service-Id
      slug: service.slug,
      name: service.name,
    };
  }
```

### Part B: auth-bff - Header Validation

#### B1. Update Login Method with Header Validation

**File**: `services/auth-bff/src/user/user.service.ts`

Update `login()` method:

```typescript
async login(req: Request, res: Response, dto: UserLoginDto): Promise<UserLoginResponseDto> {
  const ip = this.getClientIp(req);
  const userAgent = req.headers['user-agent'] || 'unknown';

  // ==========================================
  // STEP 1: Extract X-Service-Id (required)
  // ==========================================
  const serviceId = req.headers['x-service-id'] as string;

  if (!serviceId) {
    throw new UnauthorizedException('Missing required header: X-Service-Id');
  }

  // ==========================================
  // STEP 2: Extract Referer/Origin (optional)
  // ==========================================
  const referer = (req.headers.referer || req.headers.origin) as string | undefined;
  let domain: string | undefined;

  if (referer) {
    try {
      const url = new URL(referer);
      domain = url.host;
    } catch {
      this.logger.warn(`Invalid referer URL: ${referer}`);
      // Continue without domain (will fail if domain_validation=true)
    }
  }

  // ==========================================
  // STEP 3: Verify service + domain via auth-service
  // ==========================================
  let verification: { valid: boolean; service?: any; reason?: string };

  try {
    // Call auth-service gRPC or HTTP endpoint
    verification = await this.authClient.verifyServiceDomain({
      serviceId,
      domain,
    });
  } catch (error) {
    this.logger.error('Service verification request failed', error);
    throw new UnauthorizedException('Service verification failed');
  }

  if (!verification.valid) {
    this.logger.warn(
      `Service verification failed: serviceId=${serviceId}, domain=${domain}, reason=${verification.reason}`,
    );
    throw new UnauthorizedException(verification.reason || 'Invalid service or domain');
  }

  const serviceSlug = verification.service.slug;
  const domainValidationEnabled = verification.service.domainValidation;

  this.logger.log(
    `Service verified: ${serviceSlug} (${serviceId}), domain_validation=${domainValidationEnabled}`,
  );

  try {
    // ==========================================
    // STEP 4: Authenticate user (existing logic)
    // ==========================================
    const account = await this.identityClient.getAccountByEmail(dto.email);
    if (!account) {
      await this.identityClient.recordLoginAttempt(
        'unknown',
        dto.email,
        ip,
        userAgent,
        false,
        'Account not found',
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordResult = await this.identityClient.validatePassword(
      account.id,
      dto.password,
    );
    if (!passwordResult.valid) {
      const attemptResult = await this.identityClient.recordLoginAttempt(
        account.id,
        dto.email,
        ip,
        userAgent,
        false,
        'Invalid password',
      );

      if (attemptResult.accountLocked) {
        throw new UnauthorizedException(
          'Account locked due to too many failed attempts',
        );
      }

      throw new UnauthorizedException('Invalid credentials');
    }

    // Check MFA (existing logic)
    if (account.mfaEnabled) {
      const challengeId = this.generateChallengeId();
      this.mfaChallenges.set(challengeId, {
        accountId: account.id,
        email: account.email,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      return {
        requiresMfa: true,
        challengeId,
        user: null,
      };
    }

    // ==========================================
    // STEP 5: Check if user joined this service
    // ==========================================
    const userServices = await this.authClient.getUserServices(account.id);
    const hasJoined = userServices.some((us: any) => us.serviceSlug === serviceSlug);

    if (!hasJoined) {
      // Auto-join user to this service
      await this.authClient.joinService({
        userId: account.id,
        serviceSlug,
        countryCode: dto.countryCode || 'KR',
        consents: [],
        ipAddress: ip,
        userAgent,
      });

      this.logger.log(`Auto-joined user ${account.id} to service ${serviceSlug}`);
    }

    // ==========================================
    // STEP 6: Create session (JWT with services[])
    // ==========================================
    const sessionResponse = await this.identityClient.createSession({
      accountId: account.id,
      ipAddress: ip,
      userAgent,
      sessionContext: SESSION_CONTEXT.USER,
    });

    const metadata = this.sessionService.extractMetadata(req);
    const deviceFingerprint = this.sessionService.getDeviceFingerprint(req);

    await this.sessionService.createSession(
      res,
      {
        accountType: AccountType.USER,
        accountId: account.id,
        email: account.email,
        accessToken: sessionResponse.accessToken,
        refreshToken: sessionResponse.refreshToken,
        deviceFingerprint,
        mfaVerified: false,
        mfaRequired: false,
      },
      metadata,
    );

    // Record successful login
    await this.identityClient.recordLoginAttempt(
      account.id,
      dto.email,
      ip,
      userAgent,
      true,
      null,
    );

    this.logger.log(`User logged in: ${account.email} to service ${serviceSlug}`);

    return {
      requiresMfa: false,
      challengeId: null,
      user: this.mapAccountToDto(account),
    };
  } catch (error) {
    this.logger.error('User login failed', error);
    if (error instanceof UnauthorizedException) throw error;
    throw new UnauthorizedException('Login failed');
  }
}
```

#### B2. Update Register Method (Similar Logic)

**File**: `services/auth-bff/src/user/user.service.ts`

Apply same header validation logic to `register()` method.

### Part C: web-admin - Config Tab Integration

#### C1. Service Config Update (Already Exists!)

**File**: `apps/web-admin/src/pages/services/ServiceConfigTab.tsx`

The UI already supports toggling `domain_validation`:

```typescript
// Existing toggle (already in web-admin)
<Toggle
  label="Domain Validation"
  checked={config.domainValidation}
  onChange={(checked) => updateConfig({ domainValidation: checked })}
/>
```

#### C2. Add Cache Invalidation on Config Update

**File**: `services/auth-service/src/admin/controllers/service-config.controller.ts`

Update config endpoint to invalidate cache:

```typescript
  @Patch(':serviceId/config')
  async updateServiceConfig(
    @Param('serviceId') serviceId: string,
    @Body() dto: UpdateServiceConfigDto,
  ) {
    // Update config in DB
    const updated = await this.serviceConfigService.update(serviceId, dto);

    // Invalidate Valkey cache
    await this.servicesService.invalidateServiceConfigCache(serviceId);

    return updated;
  }
```

### Part D: Frontend Integration

#### D1. Get Service ID from Domain

**File**: `apps/web-girok/src/services/auth.service.ts` (or similar)

```typescript
// On app initialization, get service ID
async function initializeAuth() {
  const currentDomain = window.location.host;

  const response = await fetch(
    `${AUTH_SERVICE_URL}/v1/services/domain/${encodeURIComponent(currentDomain)}`,
  );

  const serviceInfo = await response.json();

  if (serviceInfo && serviceInfo.id) {
    // Store service ID for use in subsequent requests
    localStorage.setItem('X-Service-Id', serviceInfo.id);
  }
}

// Add to all auth requests
async function login(email: string, password: string) {
  const serviceId = localStorage.getItem('X-Service-Id');

  const response = await fetch(`${AUTH_BFF_URL}/user/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Service-Id': serviceId, // ← Add header
    },
    body: JSON.stringify({ email, password, countryCode: 'KR' }),
  });

  return response.json();
}
```

## Testing

### 1. Test with domain_validation = true (default)

```bash
# Get service ID
SERVICE_ID=$(curl -s http://localhost:3002/v1/services/domain/localhost:5173 | jq -r '.id')

# Test login with correct domain
curl -X POST http://localhost:4001/user/login \
  -H "Content-Type: application/json" \
  -H "X-Service-Id: ${SERVICE_ID}" \
  -H "Referer: http://localhost:5173" \
  -d '{
    "email": "test@example.com",
    "password": "test1234",
    "countryCode": "KR"
  }'

# Expected: 200 OK

# Test with wrong domain
curl -X POST http://localhost:4001/user/login \
  -H "X-Service-Id: ${SERVICE_ID}" \
  -H "Referer: http://wrong-domain.com" \
  -d '{ ... }'

# Expected: 401 Unauthorized (domain validation failed)
```

### 2. Test with domain_validation = false

```bash
# Disable domain validation via web-admin
curl -X PATCH http://localhost:5174/api/services/${SERVICE_ID}/config \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -d '{ "domainValidation": false }'

# Test login without Referer header
curl -X POST http://localhost:4001/user/login \
  -H "Content-Type: application/json" \
  -H "X-Service-Id: ${SERVICE_ID}" \
  -d '{
    "email": "test@example.com",
    "password": "test1234",
    "countryCode": "KR"
  }'

# Expected: 200 OK (domain validation skipped)
```

### 3. Test Cache Performance

```bash
# First request (cache miss)
time curl -X POST http://localhost:3002/v1/services/verify-domain \
  -d '{"serviceId": "'${SERVICE_ID}'", "domain": "localhost:5173"}'

# Expected: ~50ms (DB query)

# Second request (cache hit)
time curl -X POST http://localhost:3002/v1/services/verify-domain \
  -d '{"serviceId": "'${SERVICE_ID}'", "domain": "localhost:5173"}'

# Expected: ~2ms (Valkey cache)
```

### 4. Test Cache Invalidation

```bash
# Update config
curl -X PATCH http://localhost:5174/api/services/${SERVICE_ID}/config \
  -d '{ "domainValidation": false }'

# Verify cache invalidated
# Next request should be cache miss (DB query)
```

## Security Considerations

⚠️ **CRITICAL**:

- **Never log** service IDs or user credentials
- **Never** include sensitive data in error messages
- **Always** validate UUID format for X-Service-Id (prevent injection)
- **Always** use HTTPS in production
- **Rate limit** verification endpoint to prevent abuse
- **Audit** domain_validation changes in web-admin

## Verification Checklist

- [ ] verifyServiceDomain() method with Valkey caching
- [ ] X-Service-Id validation (always required)
- [ ] Optional domain validation (service_configs.domain_validation)
- [ ] Cache TTL = 1 hour (3600s)
- [ ] Cache invalidation on config update
- [ ] Verification endpoint (POST /v1/services/verify-domain)
- [ ] Domain lookup endpoint updated with service ID
- [ ] auth-bff login/register updated with header validation
- [ ] web-admin config toggle (already exists)
- [ ] Frontend service ID initialization
- [ ] UUID format validation
- [ ] Error handling for all failure cases
- [ ] TypeScript compilation passes
- [ ] No lint errors

## Performance Metrics

| Metric                          | Target | Actual |
| ------------------------------- | ------ | ------ |
| Cache hit rate                  | >95%   | TBD    |
| Verification latency (cached)   | <5ms   | TBD    |
| Verification latency (uncached) | <100ms | TBD    |
| DB queries per 1000 logins      | <50    | TBD    |

## Commit Changes

```bash
# Stage changes
git add \
  services/auth-service/src/services/services.service.ts \
  services/auth-service/src/services/services.controller.ts \
  services/auth-service/src/services/dto/verify-service-domain.dto.ts \
  services/auth-service/src/admin/controllers/service-config.controller.ts \
  services/auth-bff/src/user/user.service.ts

# Commit
git commit -m "feat: add X-Service-Id + optional domain validation with caching

- Add verifyServiceDomain() with Valkey caching (1h TTL)
- X-Service-Id header validation (always required)
- Optional Referer/Origin validation (service_configs.domain_validation)
- Cache invalidation on config update
- Add verification endpoint: POST /v1/services/verify-domain
- Update domain lookup to include service ID
- Update auth-bff login/register with header validation
- Support web-admin domain_validation toggle

Performance:
- Cache hit: ~2ms (no DB query)
- Cache miss: ~50ms (DB query + cache)

Related to Phase 1-A Authentication recovery"
```

## Next Steps

→ Task 05: PR Update & Merge (update PR #605 with new implementation)

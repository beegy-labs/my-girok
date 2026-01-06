# gRPC Inter-Service Communication Guide

> Comprehensive guide for gRPC communication within the my-girok Identity Platform

## Overview

After the Phase 3 service separation, the three core services (identity, auth, legal) communicate via gRPC for high-performance, type-safe inter-service calls.

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       Identity Platform (Phase 3)                        │
│                                                                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐       │
│  │ identity-service │  │   auth-service   │  │  legal-service   │       │
│  │                  │  │                  │  │                  │       │
│  │ REST: 3000       │  │ REST: 3001       │  │ REST: 3005       │       │
│  │ gRPC: 50051      │  │ gRPC: 50052      │  │ gRPC: 50053      │       │
│  │                  │  │                  │  │                  │       │
│  │ IdentityService  │  │ AuthService      │  │ LegalService     │       │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘       │
│           │                     │                     │                  │
│           └─────────────────────┼─────────────────────┘                  │
│                                 │                                        │
│                          gRPC Communication                              │
└─────────────────────────────────────────────────────────────────────────┘
```

### Port Assignments

| Service          | REST Port | gRPC Port | Proto Package |
| ---------------- | --------- | --------- | ------------- |
| identity-service | 3000      | 50051     | `identity.v1` |
| auth-service     | 3001      | 50052     | `auth.v1`     |
| legal-service    | 3005      | 50053     | `legal.v1`    |

---

## Proto Files

Proto definitions are centralized in `packages/proto/`:

```
packages/proto/
├── buf.yaml                    # Buf configuration
├── buf.gen.yaml                # Code generation config
├── identity/
│   └── v1/
│       └── identity.proto      # Identity service definition
├── auth/
│   └── v1/
│       └── auth.proto          # Auth service definition
└── legal/
    └── v1/
        └── legal.proto         # Legal service definition
```

### Generating TypeScript Types

```bash
# Generate TypeScript types from proto files
cd packages/proto
pnpm generate
```

Generated types are output to `packages/types/src/generated/proto/`.

---

## Setting Up a gRPC Server

### 1. Install Dependencies

```bash
pnpm add @nestjs/microservices @grpc/grpc-js @grpc/proto-loader
```

### 2. Create gRPC Controller

```typescript
// src/grpc/identity.grpc.controller.ts
import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { AccountsService } from '../accounts/accounts.service';

@Controller()
export class IdentityGrpcController {
  constructor(private readonly accountsService: AccountsService) {}

  @GrpcMethod('IdentityService', 'GetAccount')
  async getAccount(request: { id: string }) {
    const account = await this.accountsService.findById(request.id);
    return { account: this.toProtoAccount(account) };
  }

  @GrpcMethod('IdentityService', 'ValidateAccount')
  async validateAccount(request: { id: string }) {
    const account = await this.accountsService.findById(request.id);
    return {
      valid: !!account && account.status === 'ACTIVE',
      status: account?.status,
    };
  }

  private toProtoAccount(account: Account): ProtoAccount {
    return {
      id: account.id,
      email: account.email,
      status: this.mapStatus(account.status),
      // ... map other fields
    };
  }
}
```

### 3. Configure gRPC Server in main.ts

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  // Create HTTP app
  const app = await NestFactory.create(AppModule);

  // Create gRPC microservice
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'identity.v1',
      protoPath: join(__dirname, '../../../packages/proto/identity/v1/identity.proto'),
      url: `0.0.0.0:${process.env.IDENTITY_GRPC_PORT || 50051}`,
      loader: {
        keepCase: true,
        longs: String,
        enums: Number,
        defaults: true,
        oneofs: true,
      },
    },
  });

  await app.startAllMicroservices();
  await app.listen(process.env.PORT || 3000);
}
bootstrap();
```

---

## Using gRPC Clients

### 1. Import GrpcClientsModule

```typescript
// app.module.ts
import { GrpcClientsModule } from '@my-girok/nest-common';

@Module({
  imports: [
    GrpcClientsModule.forRoot({
      identity: true, // Enable IdentityGrpcClient
      auth: true, // Enable AuthGrpcClient
      legal: true, // Enable LegalGrpcClient
    }),
  ],
})
export class AppModule {}
```

### 2. Inject and Use Clients

```typescript
import { IdentityGrpcClient, AuthGrpcClient, LegalGrpcClient } from '@my-girok/nest-common';

@Injectable()
export class UserAccessService {
  constructor(
    private readonly identityClient: IdentityGrpcClient,
    private readonly authClient: AuthGrpcClient,
    private readonly legalClient: LegalGrpcClient,
  ) {}

  async validateUserAccess(accountId: string, countryCode: string) {
    // Step 1: Validate account
    const { valid, status } = await this.identityClient.validateAccount({ id: accountId });
    if (!valid || status !== 'ACTIVE') {
      return { allowed: false, reason: 'ACCOUNT_INACTIVE' };
    }

    // Step 2: Check sanctions
    const { is_sanctioned } = await this.authClient.checkSanction({
      subject_id: accountId,
      subject_type: 'ACCOUNT',
    });
    if (is_sanctioned) {
      return { allowed: false, reason: 'SANCTIONED' };
    }

    // Step 3: Check required consents
    const { all_required_granted, missing } = await this.legalClient.checkConsents({
      account_id: accountId,
      country_code: countryCode,
      required_types: ['TERMS_OF_SERVICE', 'PRIVACY_POLICY'],
    });
    if (!all_required_granted) {
      return { allowed: false, reason: 'MISSING_CONSENTS', missing };
    }

    return { allowed: true };
  }
}
```

---

## Error Handling

### gRPC Status Codes

| gRPC Status         | HTTP Equivalent | When to Use                     |
| ------------------- | --------------- | ------------------------------- |
| `OK`                | 200             | Success                         |
| `NOT_FOUND`         | 404             | Resource not found              |
| `ALREADY_EXISTS`    | 409             | Duplicate resource              |
| `INVALID_ARGUMENT`  | 400             | Bad request parameters          |
| `UNAUTHENTICATED`   | 401             | Missing/invalid credentials     |
| `PERMISSION_DENIED` | 403             | Insufficient permissions        |
| `DEADLINE_EXCEEDED` | 408             | Request timeout                 |
| `UNAVAILABLE`       | 503             | Service temporarily unavailable |
| `INTERNAL`          | 500             | Internal server error           |

### Client-Side Error Handling

```typescript
import { isGrpcError, GrpcError } from '@my-girok/nest-common';
import { status as GrpcStatus } from '@grpc/grpc-js';

async getAccount(id: string) {
  try {
    return await this.identityClient.getAccount({ id });
  } catch (error) {
    if (isGrpcError(error)) {
      switch (error.code) {
        case GrpcStatus.NOT_FOUND:
          throw new NotFoundException('Account not found');
        case GrpcStatus.DEADLINE_EXCEEDED:
          throw new RequestTimeoutException('Identity service timeout');
        case GrpcStatus.UNAVAILABLE:
          throw new ServiceUnavailableException('Identity service unavailable');
        default:
          this.logger.error(`gRPC error: ${error.message}`, error);
          throw new InternalServerErrorException('Failed to fetch account');
      }
    }
    throw error;
  }
}
```

### Server-Side Error Throwing

```typescript
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';

@GrpcMethod('IdentityService', 'GetAccount')
async getAccount(request: { id: string }) {
  const account = await this.accountsService.findById(request.id);

  if (!account) {
    throw new RpcException({
      code: GrpcStatus.NOT_FOUND,
      message: 'Account not found',
    });
  }

  return { account };
}
```

---

## Configuration

### Environment Variables

| Variable             | Default   | Description           |
| -------------------- | --------- | --------------------- |
| `IDENTITY_GRPC_HOST` | localhost | Identity service host |
| `IDENTITY_GRPC_PORT` | 50051     | Identity gRPC port    |
| `AUTH_GRPC_HOST`     | localhost | Auth service host     |
| `AUTH_GRPC_PORT`     | 50052     | Auth gRPC port        |
| `LEGAL_GRPC_HOST`    | localhost | Legal service host    |
| `LEGAL_GRPC_PORT`    | 50053     | Legal gRPC port       |

### Kubernetes Service Discovery

In Kubernetes, use service DNS names:

```yaml
# deployment.yaml
env:
  - name: IDENTITY_GRPC_HOST
    value: identity-service.default.svc.cluster.local
  - name: AUTH_GRPC_HOST
    value: auth-service.default.svc.cluster.local
  - name: LEGAL_GRPC_HOST
    value: legal-service.default.svc.cluster.local
```

---

## Timeout Configuration

### Setting Custom Timeouts

```typescript
// Per-request timeout
const response = await this.identityClient
  .setTimeout(10000) // 10 seconds
  .getAccount({ id: accountId });

// Default timeout is 5000ms (5 seconds)
```

---

## Best Practices

### 1. Use Type-Safe Clients

Always use the typed gRPC clients from `@my-girok/nest-common` instead of raw gRPC calls:

```typescript
// Good
const { account } = await this.identityClient.getAccount({ id });

// Bad - raw gRPC call
const client = this.grpcClient.getService('IdentityService');
const account = await client.getAccount({ id });
```

### 2. Handle Errors Gracefully

Always catch and handle gRPC errors appropriately:

```typescript
try {
  const result = await this.authClient.checkPermission(request);
  return result.allowed;
} catch (error) {
  if (isGrpcError(error) && error.code === GrpcStatus.UNAVAILABLE) {
    // Fallback to default deny for security
    this.logger.warn('Auth service unavailable, denying access');
    return false;
  }
  throw error;
}
```

### 3. Avoid Cross-Database Access

NEVER access another service's database directly. Always use gRPC:

```typescript
// Good - use gRPC
const { account } = await this.identityClient.getAccount({ id });

// Bad - direct database access
const account = await this.identityPrisma.account.findUnique({ where: { id } });
```

### 4. Use Convenience Methods

The gRPC clients provide convenience methods for common operations:

```typescript
// Using convenience method
const hasTos = await this.legalClient.hasAcceptedTerms(accountId, 'KR');

// Equivalent to
const { all_required_granted } = await this.legalClient.checkConsents({
  account_id: accountId,
  country_code: 'KR',
  required_types: ['TERMS_OF_SERVICE'],
});
```

---

## Testing gRPC Services

### Unit Testing with Mocks

```typescript
describe('SomeService', () => {
  let service: SomeService;
  let mockIdentityClient: jest.Mocked<IdentityGrpcClient>;

  beforeEach(async () => {
    mockIdentityClient = {
      getAccount: jest.fn(),
      validateAccount: jest.fn(),
    } as any;

    const module = await Test.createTestingModule({
      providers: [SomeService, { provide: IdentityGrpcClient, useValue: mockIdentityClient }],
    }).compile();

    service = module.get(SomeService);
  });

  it('should validate account', async () => {
    mockIdentityClient.validateAccount.mockResolvedValue({
      valid: true,
      status: 'ACTIVE',
    });

    const result = await service.checkAccount('123');
    expect(result).toBe(true);
  });
});
```

### Integration Testing

For integration tests, use the actual gRPC clients with test services:

```typescript
describe('gRPC Integration', () => {
  let identityClient: IdentityGrpcClient;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [GrpcClientsModule.forRoot({ identity: true })],
    }).compile();

    identityClient = module.get(IdentityGrpcClient);
    identityClient.onModuleInit();
  });

  it('should call identity service', async () => {
    const { account } = await identityClient.getAccount({ id: 'test-id' });
    expect(account).toBeDefined();
  });
});
```

---

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Check if the target service is running
   - Verify host/port configuration
   - Check network policies in Kubernetes

2. **Deadline Exceeded**
   - Increase timeout using `setTimeout()`
   - Check target service health
   - Look for slow database queries

3. **Unavailable**
   - Service is down or restarting
   - Network connectivity issues
   - DNS resolution problems in K8s

### Debugging

Enable gRPC debug logging:

```bash
GRPC_VERBOSITY=DEBUG GRPC_TRACE=all node dist/main.js
```

---

## Related Documentation

- [Architecture Overview](../../.ai/architecture.md)
- [nest-common Package](../packages/nest-common.md#grpc-clients)
- [Identity Service](../services/IDENTITY_SERVICE.md)
- [Identity Platform Policy](../policies/IDENTITY_PLATFORM.md)

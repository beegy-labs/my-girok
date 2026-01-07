# gRPC Inter-Service Communication Guide

> Type-safe, high-performance communication between backend services

## Architecture Overview

```
identity-service (REST:3005, gRPC:50051) <->
auth-service (REST:3001, gRPC:50052) <->
legal-service (REST:3006, gRPC:50053)
```

All internal service communication uses gRPC for performance and type safety. REST endpoints are exposed for external clients.

## Proto Files Structure

```
packages/proto/
├── buf.yaml           # Buf configuration
├── buf.gen.yaml       # Code generation config
├── identity/v1/identity.proto
├── auth/v1/auth.proto
└── legal/v1/legal.proto
```

### Generate TypeScript Types

```bash
cd packages/proto && pnpm generate
```

Output location: `packages/types/src/generated/proto/`

## Server Setup

### Installation

```bash
pnpm add @nestjs/microservices @grpc/grpc-js @grpc/proto-loader
```

### Controller Implementation

```typescript
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
}
```

### Main Application Configuration

```typescript
// main.ts
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
```

## Client Setup

### Module Registration

```typescript
@Module({
  imports: [
    GrpcClientsModule.forRoot({
      identity: true,
      auth: true,
      legal: true,
    }),
  ],
})
export class AppModule {}
```

### Service Usage

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
    // Check account status
    const { valid, status } = await this.identityClient.validateAccount({
      id: accountId,
    });
    if (!valid || status !== 'ACTIVE') {
      return { allowed: false, reason: 'ACCOUNT_INACTIVE' };
    }

    // Check sanctions
    const { is_sanctioned } = await this.authClient.checkSanction({
      subject_id: accountId,
      subject_type: 'ACCOUNT',
    });
    if (is_sanctioned) {
      return { allowed: false, reason: 'SANCTIONED' };
    }

    // Check consents
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

## gRPC Status Codes

| gRPC Code         | HTTP Equivalent | Use Case                        |
| ----------------- | --------------- | ------------------------------- |
| OK                | 200             | Successful operation            |
| NOT_FOUND         | 404             | Resource doesn't exist          |
| ALREADY_EXISTS    | 409             | Duplicate resource              |
| INVALID_ARGUMENT  | 400             | Bad request parameters          |
| UNAUTHENTICATED   | 401             | Missing or invalid credentials  |
| PERMISSION_DENIED | 403             | Insufficient permissions        |
| DEADLINE_EXCEEDED | 408             | Request timeout                 |
| UNAVAILABLE       | 503             | Service temporarily unavailable |
| INTERNAL          | 500             | Unexpected server error         |

## Error Handling

### Client-Side

```typescript
import { isGrpcError } from '@my-girok/nest-common';
import { status as GrpcStatus } from '@grpc/grpc-js';

try {
  return await this.identityClient.getAccount({ id });
} catch (error) {
  if (isGrpcError(error)) {
    switch (error.code) {
      case GrpcStatus.NOT_FOUND:
        throw new NotFoundException('Account not found');
      case GrpcStatus.DEADLINE_EXCEEDED:
        throw new RequestTimeoutException();
      case GrpcStatus.UNAVAILABLE:
        throw new ServiceUnavailableException();
    }
  }
  throw error;
}
```

### Server-Side

```typescript
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';

if (!account) {
  throw new RpcException({
    code: GrpcStatus.NOT_FOUND,
    message: 'Account not found',
  });
}
```

## Environment Variables

| Variable           | Default   | Purpose                    |
| ------------------ | --------- | -------------------------- |
| IDENTITY_GRPC_HOST | localhost | Identity service host      |
| IDENTITY_GRPC_PORT | 50051     | Identity service gRPC port |
| AUTH_GRPC_HOST     | localhost | Auth service host          |
| AUTH_GRPC_PORT     | 50052     | Auth service gRPC port     |
| LEGAL_GRPC_HOST    | localhost | Legal service host         |
| LEGAL_GRPC_PORT    | 50053     | Legal service gRPC port    |

### Kubernetes Service Discovery

```yaml
env:
  - name: IDENTITY_GRPC_HOST
    value: identity-service.default.svc.cluster.local
```

## Timeout Configuration

```typescript
// Custom timeout (default is 5000ms)
const response = await this.identityClient.setTimeout(10000).getAccount({ id: accountId });
```

## Best Practices

1. **Use Typed Clients**: Always use the typed clients from `@my-girok/nest-common`
2. **Handle Errors Gracefully**: Implement fallback behavior (deny by default for security)
3. **Never Access Databases Directly**: Always go through the owning service's gRPC API
4. **Use Convenience Methods**: Leverage helper methods like `hasAcceptedTerms()`

## Testing

### Unit Tests

```typescript
mockIdentityClient = {
  getAccount: jest.fn(),
  validateAccount: jest.fn(),
} as any;

const module = await Test.createTestingModule({
  providers: [SomeService, { provide: IdentityGrpcClient, useValue: mockIdentityClient }],
}).compile();
```

### Integration Tests

```typescript
const module = await Test.createTestingModule({
  imports: [GrpcClientsModule.forRoot({ identity: true })],
}).compile();

identityClient = module.get(IdentityGrpcClient);
identityClient.onModuleInit();
```

## Troubleshooting

| Issue              | What to Check                                                    |
| ------------------ | ---------------------------------------------------------------- |
| Connection Refused | Service running? Host/port config correct? K8s network policies? |
| Deadline Exceeded  | Increase timeout, check service health, look for slow DB queries |
| Unavailable        | Is service down? Network issues? Check K8s DNS resolution        |

### Debug Mode

```bash
GRPC_VERBOSITY=DEBUG GRPC_TRACE=all node dist/main.js
```

---

**LLM Reference**: `docs/llm/guides/GRPC.md`

# gRPC Inter-Service Communication

```
identity-service (REST:3000, gRPC:50051) <->
auth-service (REST:3001, gRPC:50052) <->
legal-service (REST:3005, gRPC:50053)
```

## Proto Files

```
packages/proto/
├── buf.yaml
├── buf.gen.yaml
├── identity/v1/identity.proto
├── auth/v1/auth.proto
└── legal/v1/legal.proto
```

Generate: `cd packages/proto && pnpm generate`
Output: `packages/types/src/generated/proto/`

## Server Setup

### Install

```bash
pnpm add @nestjs/microservices @grpc/grpc-js @grpc/proto-loader
```

### Controller

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
    return { valid: !!account && account.status === 'ACTIVE', status: account?.status };
  }
}
```

### main.ts

```typescript
app.connectMicroservice<MicroserviceOptions>({
  transport: Transport.GRPC,
  options: {
    package: 'identity.v1',
    protoPath: join(__dirname, '../../../packages/proto/identity/v1/identity.proto'),
    url: `0.0.0.0:${process.env.IDENTITY_GRPC_PORT || 50051}`,
    loader: { keepCase: true, longs: String, enums: Number, defaults: true, oneofs: true },
  },
});
await app.startAllMicroservices();
```

## Client Setup

### Module

```typescript
@Module({
  imports: [GrpcClientsModule.forRoot({ identity: true, auth: true, legal: true })],
})
export class AppModule {}
```

### Usage

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
    const { valid, status } = await this.identityClient.validateAccount({ id: accountId });
    if (!valid || status !== 'ACTIVE') return { allowed: false, reason: 'ACCOUNT_INACTIVE' };

    const { is_sanctioned } = await this.authClient.checkSanction({
      subject_id: accountId,
      subject_type: 'ACCOUNT',
    });
    if (is_sanctioned) return { allowed: false, reason: 'SANCTIONED' };

    const { all_required_granted, missing } = await this.legalClient.checkConsents({
      account_id: accountId,
      country_code: countryCode,
      required_types: ['TERMS_OF_SERVICE', 'PRIVACY_POLICY'],
    });
    if (!all_required_granted) return { allowed: false, reason: 'MISSING_CONSENTS', missing };

    return { allowed: true };
  }
}
```

## gRPC Status Codes

| gRPC              | HTTP | Use              |
| ----------------- | ---- | ---------------- |
| OK                | 200  | Success          |
| NOT_FOUND         | 404  | Resource missing |
| ALREADY_EXISTS    | 409  | Duplicate        |
| INVALID_ARGUMENT  | 400  | Bad params       |
| UNAUTHENTICATED   | 401  | No/invalid creds |
| PERMISSION_DENIED | 403  | No access        |
| DEADLINE_EXCEEDED | 408  | Timeout          |
| UNAVAILABLE       | 503  | Service down     |
| INTERNAL          | 500  | Server error     |

## Environment Variables

| Variable           | Default   | Purpose       |
| ------------------ | --------- | ------------- |
| IDENTITY_GRPC_HOST | localhost | Identity host |
| IDENTITY_GRPC_PORT | 50051     | Identity port |
| AUTH_GRPC_HOST     | localhost | Auth host     |
| AUTH_GRPC_PORT     | 50052     | Auth port     |
| LEGAL_GRPC_HOST    | localhost | Legal host    |
| LEGAL_GRPC_PORT    | 50053     | Legal port    |

### K8s Service Discovery

```yaml
env:
  - name: IDENTITY_GRPC_HOST
    value: identity-service.default.svc.cluster.local
```

## Timeout

```typescript
const response = await this.identityClient.setTimeout(10000).getAccount({ id: accountId });
// Default: 5000ms
```

## Related Documentation

- **Error Handling & Testing**: `grpc-patterns.md`
- Best Practices: Use typed clients from `@my-girok/nest-common`

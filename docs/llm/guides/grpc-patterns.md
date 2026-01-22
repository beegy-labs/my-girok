# gRPC Patterns

> Error handling, testing, and troubleshooting for gRPC services

## Error Handling

### Client

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

### Server

```typescript
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';

if (!account) {
  throw new RpcException({ code: GrpcStatus.NOT_FOUND, message: 'Account not found' });
}
```

## Best Practices

1. Use typed clients from `@my-girok/nest-common`
2. Handle errors with fallback (deny by default for security)
3. Never access another service's database directly
4. Use convenience methods (`hasAcceptedTerms()`)

## Testing

### Unit

```typescript
import { vi } from 'vitest';

mockIdentityClient = { getAccount: vi.fn(), validateAccount: vi.fn() } as any;
const module = await Test.createTestingModule({
  providers: [SomeService, { provide: IdentityGrpcClient, useValue: mockIdentityClient }],
}).compile();
```

### Integration

```typescript
const module = await Test.createTestingModule({
  imports: [GrpcClientsModule.forRoot({ identity: true })],
}).compile();
identityClient = module.get(IdentityGrpcClient);
identityClient.onModuleInit();
```

## Troubleshooting

| Issue              | Check                                                   |
| ------------------ | ------------------------------------------------------- |
| Connection Refused | Service running, host/port config, K8s network policies |
| Deadline Exceeded  | Increase timeout, service health, slow DB queries       |
| Unavailable        | Service down, network, K8s DNS                          |

Debug: `GRPC_VERBOSITY=DEBUG GRPC_TRACE=all node dist/main.js`

---

_Main: `grpc.md`_

# gRPC Patterns Guide

This guide covers error handling patterns, testing strategies, and troubleshooting for gRPC services in the application.

## Overview

gRPC is used for internal service-to-service communication. This guide explains how to properly handle errors, write tests, and debug issues with gRPC clients and servers.

## Error Handling

### Client-Side Error Handling

When calling a gRPC service from a client, use the `isGrpcError` utility to identify and handle specific error codes:

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

This pattern translates gRPC status codes into appropriate HTTP exceptions that can be returned to clients.

### Server-Side Error Handling

On the server side, throw RpcException with the appropriate status code:

```typescript
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';

if (!account) {
  throw new RpcException({ code: GrpcStatus.NOT_FOUND, message: 'Account not found' });
}
```

Common gRPC status codes and their meanings:

- `NOT_FOUND` - Resource does not exist
- `INVALID_ARGUMENT` - Client sent invalid data
- `PERMISSION_DENIED` - Caller lacks required permissions
- `DEADLINE_EXCEEDED` - Request took too long
- `UNAVAILABLE` - Service is temporarily unavailable

## Best Practices

Follow these guidelines when working with gRPC services:

1. **Use typed clients**: Import and use typed clients from `@my-girok/nest-common` to get compile-time type checking

2. **Handle errors with fallback**: Always implement fallback behavior, defaulting to deny for security-sensitive operations

3. **Respect service boundaries**: Never access another service's database directly; always go through the gRPC interface

4. **Use convenience methods**: Prefer helper methods like `hasAcceptedTerms()` over raw data access to encapsulate business logic

## Testing

### Unit Testing with Mocks

For unit tests, mock the gRPC client to isolate the code under test:

```typescript
import { vi } from 'vitest';

mockIdentityClient = { getAccount: vi.fn(), validateAccount: vi.fn() } as any;

const module = await Test.createTestingModule({
  providers: [SomeService, { provide: IdentityGrpcClient, useValue: mockIdentityClient }],
}).compile();
```

This approach allows you to control the responses from the gRPC client and test various scenarios.

### Integration Testing

For integration tests that verify actual gRPC communication:

```typescript
const module = await Test.createTestingModule({
  imports: [GrpcClientsModule.forRoot({ identity: true })],
}).compile();

identityClient = module.get(IdentityGrpcClient);
identityClient.onModuleInit();
```

Integration tests require the target gRPC service to be running.

## Troubleshooting

### Connection Refused

If you receive a "connection refused" error:

- Verify the target service is running
- Check that host and port configuration is correct
- Review Kubernetes network policies if running in a cluster

### Deadline Exceeded

If requests are timing out:

- Consider increasing the timeout value for slow operations
- Check the health of the target service
- Look for slow database queries or external API calls

### Service Unavailable

If the service reports unavailable:

- Verify the target service is deployed and healthy
- Check network connectivity between services
- Verify Kubernetes DNS resolution is working

### Debugging

For detailed debugging output, run the service with gRPC debug flags:

```bash
GRPC_VERBOSITY=DEBUG GRPC_TRACE=all node dist/main.js
```

This will output detailed information about gRPC connection attempts, message serialization, and error details.

---

_This document is auto-generated from `docs/llm/guides/grpc-patterns.md`_

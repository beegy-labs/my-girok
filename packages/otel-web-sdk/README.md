# @my-girok/otel-web-sdk

OpenTelemetry Web SDK for my-girok frontend applications. Provides automatic instrumentation and manual tracking capabilities for browser-based telemetry.

## Features

- ✅ **Auto-instrumentation**: Document load, fetch/XHR requests, user interactions
- ✅ **Manual tracking**: Custom spans, audit logs, events
- ✅ **Session-based auth**: Works with cookie authentication
- ✅ **Tenant-aware**: Includes tenant/user context in all telemetry
- ✅ **TypeScript**: Full type safety and IntelliSense support
- ✅ **Lightweight**: ~45KB gzipped

## Installation

```bash
pnpm add @my-girok/otel-web-sdk
```

## Usage

### Initialize SDK

```typescript
import { initializeOtelWebSDK } from '@my-girok/otel-web-sdk';

initializeOtelWebSDK({
  serviceName: 'web-girok',
  serviceVersion: '1.0.0',
  environment: 'production',
  collectorUrl: 'https://audit-api.girok.dev/v1/telemetry',
  authToken: '', // Empty for session-based auth
  tenantId: user.tenantId,
  userId: user.id,
  debug: false,
});
```

### Track Audit Logs

```typescript
import { createAuditLog } from '@my-girok/otel-web-sdk';

createAuditLog({
  action: 'resume.update',
  resource: 'resume',
  resourceId: 'resume-123',
  result: 'success',
  metadata: {
    sections_updated: ['experience', 'education'],
  },
});
```

### Track Custom Events

```typescript
import { trackEvent } from '@my-girok/otel-web-sdk';

trackEvent('feature.export_pdf', {
  format: 'pdf',
  template: 'modern',
});
```

### Trace Async Operations

```typescript
import { withSpan } from '@my-girok/otel-web-sdk';

await withSpan('dashboard.load', async (span) => {
  span.setAttribute('user.id', userId);
  const data = await fetchDashboardData();
  span.setAttribute('data.items', data.length);
  return data;
});
```

### Update User Context

```typescript
import { updateUserContext } from '@my-girok/otel-web-sdk';

// Call after login
updateUserContext(user.id, user.tenantId);
```

## API Reference

### `initializeOtelWebSDK(config: OtelWebSDKConfig): void`

Initialize the SDK with configuration.

**Config**:

- `serviceName` (string): Name of the service
- `serviceVersion` (string): Version of the service
- `environment` ('development' | 'staging' | 'production'): Environment
- `collectorUrl` (string): Audit service telemetry endpoint
- `authToken` (string): JWT token (empty for session auth)
- `tenantId?` (string): Tenant ID
- `userId?` (string): User ID
- `debug?` (boolean): Enable debug logging

### `createAuditLog(options): void`

Create an audit log event for compliance tracking.

**Options**:

- `action` (string): Action performed (e.g., 'user.delete')
- `resource` (string): Resource type (e.g., 'user')
- `resourceId?` (string): Resource identifier
- `result?` ('success' | 'failure'): Action result
- `metadata?` (Record): Additional metadata

### `trackEvent(eventName: string, attributes?: Record): void`

Track a custom event with optional attributes.

### `withSpan<T>(name: string, fn: (span) => Promise<T>): Promise<T>`

Execute a function within a traced span context.

### `updateUserContext(userId: string, tenantId?: string): void`

Update user context after authentication.

### `isOtelInitialized(): boolean`

Check if the SDK has been initialized.

## Automatic Instrumentation

The SDK automatically tracks:

- **Document Load**: Page load performance metrics
- **Fetch/XHR**: API call timing and responses
- **User Interactions**: Clicks and form submissions
- **Navigation**: Route changes

## Configuration

### Environment Variables

```bash
VITE_AUDIT_SERVICE_URL=https://audit-api.girok.dev
VITE_APP_VERSION=1.0.0
```

### Trace Propagation

The SDK automatically propagates trace context to:

- `*.girok.dev` domains
- `localhost` (development)

## Performance

- Bundle size: ~150KB (minified)
- Gzipped: ~45KB
- Page load impact: < 5%
- Memory usage: ~2MB

## Examples

See [POST_PHASE3_P4_VERIFICATION.md](../../.tasks/POST_PHASE3_P4_VERIFICATION.md) for complete examples and usage patterns.

## License

Proprietary - my-girok internal use only

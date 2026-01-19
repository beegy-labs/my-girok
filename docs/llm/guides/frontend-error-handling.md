# Frontend Error Handling

## Architecture

```yaml
components:
  lib:
    error-handler: Parse AxiosError, retry logic, HTTP mapping
  hooks:
    useApiError: General error handling with retry
    useApiMutation: Mutation wrapper (React Query-like)
  ui:
    ErrorBoundary: Catch React render errors
    ErrorDisplay: Inline/banner/card variants
    FormErrorDisplay: Compact form errors
    PageError: Full-page error display

features:
  - Consistent user-friendly messages
  - Auto-retry with exponential backoff
  - Error classification (transient/permanent)
  - OpenTelemetry integration
  - Dev mode technical details
```

## Error Classification

| Type      | Codes                            | Retry | Examples                             |
| --------- | -------------------------------- | ----- | ------------------------------------ |
| Transient | 429, 500, 502-504, 408, network  | Yes   | Rate limit, server error, timeout    |
| Permanent | 400, 401, 403-404, 409, 422, 501 | No    | Bad request, unauthorized, not found |

**Exception**: 401 handled separately with session refresh

## Retry Configuration

```yaml
defaults:
  maxRetries: 3
  initialDelayMs: 1000
  maxDelayMs: 10000
  backoffMultiplier: 2 # Exponential

delay_pattern:
  - attempt_1: 0ms
  - attempt_2: 1000ms
  - attempt_3: 2000ms
  - attempt_4: 4000ms
```

## Usage Patterns

### Basic Hook

```typescript
const { error, errorMessage, executeWithErrorHandling } = useApiError({
  context: 'MyComponent.fetchData',
  retry: true,
});

const fetchData = async () => {
  const result = await executeWithErrorHandling(async () => {
    return (await apiClient.get('/api/data')).data;
  });
  if (result) console.log(result);
};
```

### Mutation Hook

```typescript
const createUser = useApiMutation<User, CreateUserData>({
  mutationFn: async (data) => (await apiClient.post('/api/users', data)).data,
  retry: true,
  context: 'CreateUserForm.createUser',
  onSuccess: (user) => console.log('Created:', user),
  onError: (error) => console.error('Failed:', error),
});

// Use
createUser.mutate(formData);
```

### Manual Error Handling

```typescript
import { handleApiError, getErrorMessage, withRetry } from '../lib/error-handler';

// Simple message
const message = getErrorMessage(error);

// Full info
const appError = handleApiError(error, 'CreateUser');
// appError: { code, userMessage, isTransient, shouldRetry, technicalDetails }

// Manual retry
const result = await withRetry(apiCall, { maxRetries: 3 });
```

### Validation Errors

```typescript
import { getValidationErrors, isValidationError } from '../lib/error-handler';

if (isValidationError(error)) {
  const errors = getValidationErrors(error); // Record<string, string>
  setFieldErrors(errors);
}
```

## UI Components

### ErrorDisplay Variants

```typescript
// Banner - top of page
<ErrorDisplay error={error} variant="banner" showRetry onRetry={handleRetry} />

// Inline - section error
<ErrorDisplay error={error} variant="inline" />

// Card - standalone
<ErrorDisplay error={error} variant="card" showRetry onRetry={handleRetry} />

// Form field
<FormErrorDisplay error="Email is required" />

// Full page
<PageError error={error} onRetry={handleRetry} onGoBack={() => navigate(-1)} />
```

### Error Boundary

```typescript
<ErrorBoundary
  fallback={<CustomErrorPage />}
  onReset={() => window.location.reload()}
  componentName="MyFeature"
>
  <MyFeature />
</ErrorBoundary>
```

## Best Practices

| DO                                       | DON'T                                      |
| ---------------------------------------- | ------------------------------------------ |
| Use `useApiError`/`useApiMutation` hooks | Retry non-idempotent operations by default |
| Enable retry for GET/idempotent ops      | Expose technical details in production     |
| Display user-friendly messages           | Swallow errors silently                    |
| Use `ErrorBoundary` for render errors    | Retry 4xx errors (except 429)              |
| Log errors with context                  | Hardcode error messages                    |

## Monitoring

```yaml
tracked_metrics:
  - error_type
  - error_code
  - http_status
  - request_url
  - request_method
  - context
  - stack_trace # dev only

integration: OpenTelemetry
```

## Testing

```typescript
describe('Error handling', () => {
  it('should parse 404 error', () => {
    const appError = parseAxiosError({
      response: { status: 404 },
      config: { url: '/api/users/123' },
    });
    expect(appError.code).toBe('NOT_FOUND');
  });

  it('should retry transient errors', async () => {
    let attempts = 0;
    const fn = vi.fn(async () => {
      attempts++;
      if (attempts < 3) throw new Error('Network error');
      return 'success';
    });
    const result = await withRetry(fn, { maxRetries: 3 });
    expect(result).toBe('success');
  });
});
```

## Troubleshooting

| Issue                      | Check                                                                  |
| -------------------------- | ---------------------------------------------------------------------- |
| Errors not retried         | `retry: true` set, error is transient, maxRetries not exceeded         |
| Messages not user-friendly | Using `handleApiError()`, displaying `userMessage`/`getErrorMessage()` |
| 401 not refreshing         | `/admin/refresh` endpoint working, `withCredentials: true` set         |

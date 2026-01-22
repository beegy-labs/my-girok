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

## Related Documentation

- **UI Components & Testing**: `frontend-error-handling-ui.md`

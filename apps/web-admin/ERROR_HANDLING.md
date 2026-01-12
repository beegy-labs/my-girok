# Error Handling Guide

## Overview

The application uses a centralized error handling system that provides:

- **Consistent error messages**: User-friendly messages for all error types
- **Automatic retry logic**: Transient errors are automatically retried with exponential backoff
- **Error classification**: Errors are categorized as transient/permanent, retryable/non-retryable
- **Monitoring integration**: All errors are logged and tracked with OpenTelemetry
- **Developer-friendly**: Technical details available in development mode

## Architecture

### Error Handler (`lib/error-handler.ts`)

Central utility that:

- Parses AxiosError into structured AppError
- Maps HTTP status codes to user-friendly messages
- Determines if errors are transient and should be retried
- Provides retry logic with exponential backoff

### API Client Integration

The API client automatically:

- Logs all errors with context
- Handles 401 errors with session refresh
- Provides enhanced error information to callers

### React Hooks

Custom hooks for error handling in components:

- `useApiError`: General error handling with optional retry
- `useApiMutation`: Mutation wrapper similar to React Query

### UI Components

- `ErrorBoundary`: Catches React render errors
- `ErrorDisplay`: Inline error display with variants
- `FormErrorDisplay`: Compact error display for forms
- `PageError`: Full-page error display

## Usage Examples

### Basic API Call with Error Handling

```typescript
import { useApiError } from '../hooks/useApiError';
import apiClient from '../api/client';

function MyComponent() {
  const { error, errorMessage, executeWithErrorHandling } = useApiError({
    context: 'MyComponent.fetchData',
    retry: true, // Enable automatic retry for transient errors
  });

  const fetchData = async () => {
    const result = await executeWithErrorHandling(async () => {
      const response = await apiClient.get('/api/data');
      return response.data;
    });

    if (result) {
      // Success - use the data
      console.log(result);
    }
    // Error is automatically handled and stored in error/errorMessage
  };

  return (
    <div>
      {errorMessage && (
        <ErrorDisplay
          error={errorMessage}
          variant="banner"
          showRetry
          onRetry={fetchData}
        />
      )}
      <button onClick={fetchData}>Fetch Data</button>
    </div>
  );
}
```

### Using Mutation Hook

```typescript
import { useApiMutation } from '../hooks/useApiMutation';
import { ErrorDisplay } from '../components/ErrorDisplay';

interface CreateUserData {
  name: string;
  email: string;
}

function CreateUserForm() {
  const createUser = useApiMutation<User, CreateUserData>({
    mutationFn: async (data) => {
      const response = await apiClient.post('/api/users', data);
      return response.data;
    },
    retry: true,
    context: 'CreateUserForm.createUser',
    onSuccess: (user) => {
      console.log('User created:', user);
      // Show success message, redirect, etc.
    },
    onError: (error) => {
      // Optional: additional error handling
      console.error('Failed to create user:', error);
    },
  });

  const handleSubmit = (data: CreateUserData) => {
    createUser.mutate(data);
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(formData); }}>
      {createUser.errorMessage && (
        <ErrorDisplay
          error={createUser.error}
          variant="inline"
          showRetry
          onRetry={() => createUser.mutate(formData)}
        />
      )}

      {/* Form fields */}

      <button type="submit" disabled={createUser.isLoading}>
        {createUser.isLoading ? 'Creating...' : 'Create User'}
      </button>
    </form>
  );
}
```

### Manual Error Handling

```typescript
import { handleApiError, getErrorMessage, withRetry } from '../lib/error-handler';

// Simple error message extraction
try {
  await apiClient.get('/api/data');
} catch (error) {
  const message = getErrorMessage(error);
  alert(message); // User-friendly message
}

// Full error information
try {
  await apiClient.post('/api/users', data);
} catch (error) {
  const appError = handleApiError(error, 'CreateUser');

  console.log(appError.code); // Error code
  console.log(appError.userMessage); // User-friendly message
  console.log(appError.isTransient); // Is it a transient error?
  console.log(appError.shouldRetry); // Should we retry?
  console.log(appError.technicalDetails); // Dev-only technical details
}

// Manual retry with exponential backoff
const result = await withRetry(
  async () => {
    const response = await apiClient.get('/api/data');
    return response.data;
  },
  {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
  },
);
```

### Form Validation Errors

```typescript
import { getValidationErrors, isValidationError } from '../lib/error-handler';
import { FormErrorDisplay } from '../components/ErrorDisplay';

function MyForm() {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (data: FormData) => {
    try {
      await apiClient.post('/api/users', data);
    } catch (error) {
      if (isValidationError(error)) {
        const errors = getValidationErrors(error);
        if (errors) {
          setFieldErrors(errors);
          return;
        }
      }
      // Handle other errors
    }
  };

  return (
    <form>
      <input name="email" />
      {fieldErrors.email && <FormErrorDisplay error={fieldErrors.email} />}

      <input name="password" />
      {fieldErrors.password && <FormErrorDisplay error={fieldErrors.password} />}
    </form>
  );
}
```

### Error Display Variants

```typescript
import { ErrorDisplay, FormErrorDisplay, PageError } from '../components/ErrorDisplay';

// Banner - prominent error at top of page
<ErrorDisplay
  error={error}
  variant="banner"
  showRetry
  onRetry={handleRetry}
  showDismiss
  onDismiss={() => setError(null)}
/>

// Inline - compact error in a section
<ErrorDisplay
  error={error}
  variant="inline"
/>

// Card - standalone error card
<ErrorDisplay
  error={error}
  variant="card"
  showRetry
  onRetry={handleRetry}
/>

// Form error - minimal display for form fields
<FormErrorDisplay error="Email is required" />

// Full page error
<PageError
  error={error}
  onRetry={handleRetry}
  onGoBack={() => navigate(-1)}
/>
```

### Error Boundary Usage

```typescript
import { ErrorBoundary } from '../components/ErrorBoundary';
import { PageErrorBoundary } from '../components/PageErrorBoundary';

// Wrap components that might throw
function App() {
  return (
    <PageErrorBoundary>
      <MyComponent />
    </PageErrorBoundary>
  );
}

// Custom fallback UI
<ErrorBoundary
  fallback={<CustomErrorPage />}
  onReset={() => window.location.reload()}
  componentName="MyFeature"
>
  <MyFeature />
</ErrorBoundary>
```

## Error Types and Retry Behavior

### Automatically Retried (Transient Errors)

- Network errors (no response from server)
- 429 Too Many Requests (rate limiting)
- 500 Internal Server Error
- 502 Bad Gateway
- 503 Service Unavailable
- 504 Gateway Timeout
- 408 Request Timeout

### Not Retried (Permanent Errors)

- 400 Bad Request
- 401 Unauthorized (handled separately with session refresh)
- 403 Forbidden
- 404 Not Found
- 409 Conflict
- 422 Validation Error
- 501 Not Implemented

## Configuration

### Retry Configuration

Default retry settings:

```typescript
{
  maxRetries: 3,
  initialDelayMs: 1000,     // 1 second
  maxDelayMs: 10000,        // 10 seconds
  backoffMultiplier: 2,     // Exponential backoff
}
```

Example delays with defaults:

- Attempt 1: immediate
- Attempt 2: 1 second delay
- Attempt 3: 2 seconds delay
- Attempt 4: 4 seconds delay

### Environment Variables

```env
# API base URL
VITE_AUTH_BFF_URL=https://auth-dev.girok.dev

# Error logging level (development)
VITE_LOG_LEVEL=debug
```

## Best Practices

### DO

✅ Use `useApiError` or `useApiMutation` hooks in components
✅ Enable retry for GET requests and idempotent operations
✅ Display user-friendly error messages with `ErrorDisplay`
✅ Provide retry buttons for transient errors
✅ Use `ErrorBoundary` to catch render errors
✅ Log errors with context for debugging

### DON'T

❌ Don't retry non-idempotent operations (POST, PUT, DELETE) by default
❌ Don't expose technical details to users in production
❌ Don't swallow errors silently
❌ Don't retry 4xx client errors (except 429)
❌ Don't hardcode error messages in components

## Monitoring

All errors are automatically tracked with OpenTelemetry:

- Error type and code
- HTTP status code
- Request URL and method
- Component/context where error occurred
- Stack trace (in development)

View error metrics in your observability platform.

## Testing

```typescript
import { handleApiError, withRetry } from '../lib/error-handler';

describe('Error handling', () => {
  it('should parse 404 error', () => {
    const axiosError = {
      response: { status: 404 },
      config: { url: '/api/users/123' },
    };

    const appError = parseAxiosError(axiosError);
    expect(appError.code).toBe('NOT_FOUND');
    expect(appError.userMessage).toContain('not found');
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
    expect(attempts).toBe(3);
  });
});
```

## Troubleshooting

### Errors not being retried

Check that:

- `retry: true` is set in hook options
- The error is classified as transient (5xx, network error, etc.)
- Max retries has not been exceeded

### Error messages not user-friendly

Verify that:

- Error is being passed through `handleApiError()`
- Using `error.userMessage` or `getErrorMessage()` for display
- Not displaying raw error messages from axios

### Session not refreshing on 401

The API client handles 401 errors automatically. If session refresh fails:

- User will be redirected to login
- Check that `/admin/refresh` endpoint is working
- Verify cookies are being sent (`withCredentials: true`)

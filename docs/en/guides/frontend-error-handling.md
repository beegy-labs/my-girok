# Frontend Error Handling Guide

> Centralized error handling system for consistent user experience and developer productivity

## Overview

The application implements a centralized error handling system that ensures a consistent experience for both users and developers. The system provides user-friendly error messages across all error types, automatic retry logic with exponential backoff for transient errors, intelligent error classification to determine retry behavior, seamless monitoring integration through OpenTelemetry, and technical details available during development.

## Architecture

### Error Handler Utility

The central error handling utility at `lib/error-handler.ts` serves as the backbone of the system. It parses AxiosError responses into structured AppError objects, maps HTTP status codes to user-friendly messages, determines whether errors are transient and should be retried, and provides retry logic with configurable exponential backoff.

### API Client Integration

The API client automatically handles errors by logging all errors with contextual information, handling 401 errors with automatic session refresh, and providing enhanced error information to callers for further handling.

### React Hooks

The system provides custom hooks for streamlined error handling in React components:

- **useApiError**: General-purpose error handling with optional retry support
- **useApiMutation**: Mutation wrapper similar to React Query for data modifications

### UI Components

Several UI components are available for displaying errors:

- **ErrorBoundary**: Catches React render errors to prevent white screens
- **ErrorDisplay**: Inline error display with multiple variants
- **FormErrorDisplay**: Compact error display optimized for form fields
- **PageError**: Full-page error display for critical failures

## Usage Examples

### Basic API Call with Error Handling

The `useApiError` hook provides the simplest way to handle errors in your components:

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

### Using the Mutation Hook

For data modification operations, the `useApiMutation` hook provides a clean interface with built-in loading states and success callbacks:

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

When you need more control over error handling, use the utility functions directly:

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

Handle validation errors from the server with specialized utilities:

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

Choose the appropriate error display component based on your UI context:

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

Wrap your components with error boundaries to catch React render errors:

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

## Error Classification and Retry Behavior

### Automatically Retried Errors (Transient)

The system automatically retries the following error types with exponential backoff:

- **Network errors** when there is no response from the server
- **429 Too Many Requests** for rate limiting scenarios
- **500 Internal Server Error** for unexpected server failures
- **502 Bad Gateway** for proxy or gateway issues
- **503 Service Unavailable** for temporary service outages
- **504 Gateway Timeout** for upstream service timeouts
- **408 Request Timeout** for slow requests

### Errors That Are Not Retried (Permanent)

These errors indicate issues that will not resolve with retries:

- **400 Bad Request** for malformed request parameters
- **401 Unauthorized** which is handled separately with session refresh
- **403 Forbidden** for permission-related issues
- **404 Not Found** for missing resources
- **409 Conflict** for resource state conflicts
- **422 Validation Error** for invalid data
- **501 Not Implemented** for unsupported operations

## Configuration

### Retry Configuration

The default retry settings use exponential backoff:

```typescript
{
  maxRetries: 3,
  initialDelayMs: 1000,     // 1 second
  maxDelayMs: 10000,        // 10 seconds
  backoffMultiplier: 2,     // Exponential backoff
}
```

With these defaults, retry timing works as follows:

- **Attempt 1**: Immediate
- **Attempt 2**: 1 second delay
- **Attempt 3**: 2 seconds delay
- **Attempt 4**: 4 seconds delay

### Environment Variables

Configure the API client with these environment variables:

```env
# API base URL
VITE_AUTH_BFF_URL=https://auth-dev.girok.dev

# Error logging level (development)
VITE_LOG_LEVEL=debug
```

## Best Practices

### Recommended Practices

Use the `useApiError` or `useApiMutation` hooks in components rather than manual try-catch blocks. Enable retry for GET requests and other idempotent operations. Always display user-friendly error messages using the `ErrorDisplay` component. Provide retry buttons for errors classified as transient. Wrap component trees with `ErrorBoundary` to catch render errors. Include context when logging errors to aid debugging.

### Practices to Avoid

Do not retry non-idempotent operations (POST, PUT, DELETE) by default as this can cause duplicate actions. Never expose technical details to users in production environments. Avoid swallowing errors silently without logging or user notification. Do not retry 4xx client errors except for 429 rate limiting. Avoid hardcoding error messages directly in components.

## Monitoring

All errors are automatically tracked through OpenTelemetry with comprehensive metadata including the error type and code, HTTP status code, request URL and method, component or context where the error occurred, and stack trace (in development only).

Access error metrics through your observability platform for insights into error patterns and system health.

## Testing

Write tests to verify error handling behavior:

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

### Errors Not Being Retried

Verify that `retry: true` is set in your hook options, check that the error is classified as transient (5xx status codes or network errors), and ensure the maximum retry count has not been exceeded.

### Error Messages Not User-Friendly

Ensure errors are being processed through `handleApiError()`, use `error.userMessage` or `getErrorMessage()` for display, and avoid displaying raw error messages from axios responses.

### Session Not Refreshing on 401

The API client handles 401 errors automatically. If session refresh fails, the user will be redirected to login. Check that the `/admin/refresh` endpoint is functioning correctly and verify cookies are being sent with requests (`withCredentials: true`).

---

**LLM Reference**: `docs/llm/guides/frontend-error-handling.md`

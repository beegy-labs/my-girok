# Frontend Error Handling - UI Components Guide

This guide covers error display components, best practices for error handling, monitoring integration, testing strategies, and troubleshooting common issues.

## Overview

Effective error handling in the frontend requires consistent UI components that inform users about problems while providing actionable recovery options. This guide explains how to use the error handling components and hooks available in the application.

## UI Components

### ErrorDisplay Component

The ErrorDisplay component provides multiple variants for different error display contexts:

**Banner Variant** - For page-level errors displayed at the top of the screen:

```typescript
<ErrorDisplay error={error} variant="banner" showRetry onRetry={handleRetry} />
```

**Inline Variant** - For errors within a specific section of the page:

```typescript
<ErrorDisplay error={error} variant="inline" />
```

**Card Variant** - For standalone error displays in card layouts:

```typescript
<ErrorDisplay error={error} variant="card" showRetry onRetry={handleRetry} />
```

### Form Error Display

For form validation errors, use the dedicated FormErrorDisplay component:

```typescript
<FormErrorDisplay error="Email is required" />
```

### Full Page Error

For critical errors that require the entire page, use PageError:

```typescript
<PageError error={error} onRetry={handleRetry} onGoBack={() => navigate(-1)} />
```

### Error Boundary

Wrap components that might throw render errors in an ErrorBoundary:

```typescript
<ErrorBoundary
  fallback={<CustomErrorPage />}
  onReset={() => window.location.reload()}
  componentName="MyFeature"
>
  <MyFeature />
</ErrorBoundary>
```

The componentName prop helps identify which component failed in error reports.

## Best Practices

### Recommended Patterns

| Do                                           | Avoid                                        |
| -------------------------------------------- | -------------------------------------------- |
| Use `useApiError` and `useApiMutation` hooks | Retry non-idempotent operations by default   |
| Enable retry only for GET and idempotent ops | Expose technical error details in production |
| Display user-friendly error messages         | Swallow errors silently without logging      |
| Use `ErrorBoundary` for render errors        | Retry 4xx errors (except 429 rate limiting)  |
| Log errors with contextual information       | Hardcode error messages in components        |

### Error Message Guidelines

- Keep messages concise and actionable
- Avoid technical jargon in user-facing messages
- Provide specific recovery steps when possible
- Use consistent tone and terminology

## Monitoring Integration

Errors are automatically tracked through OpenTelemetry integration. The following metrics are captured:

```yaml
tracked_metrics:
  - error_type
  - error_code
  - http_status
  - request_url
  - request_method
  - context
  - stack_trace # development only
```

Stack traces are only captured in development environments to avoid exposing sensitive information in production.

## Testing Error Handling

### Unit Testing Error Parsing

Test that errors are correctly parsed and categorized:

```typescript
describe('Error handling', () => {
  it('should parse 404 error', () => {
    const appError = parseAxiosError({
      response: { status: 404 },
      config: { url: '/api/users/123' },
    });
    expect(appError.code).toBe('NOT_FOUND');
  });
});
```

### Testing Retry Logic

Test that transient errors trigger retry behavior:

```typescript
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
```

## Troubleshooting

### Errors Not Being Retried

If errors are not automatically retried, check the following:

1. Verify `retry: true` is set in the hook options
2. Confirm the error is classified as transient (network errors, 5xx responses)
3. Check that maxRetries has not been exceeded
4. Ensure the operation is idempotent (retry is disabled by default for mutations)

### Messages Not User-Friendly

If technical error messages are being displayed:

1. Ensure you're using `handleApiError()` to process errors
2. Display the `userMessage` property from the processed error
3. Use `getErrorMessage()` utility for consistent formatting

### 401 Errors Not Refreshing Token

If authentication errors are not triggering token refresh:

1. Verify the `/admin/refresh` endpoint is functioning correctly
2. Check that `withCredentials: true` is set on API requests
3. Confirm the refresh token cookie is present and not expired
4. Check browser console for CORS errors on the refresh endpoint

---

_This document is auto-generated from `docs/llm/guides/frontend-error-handling-ui.md`_

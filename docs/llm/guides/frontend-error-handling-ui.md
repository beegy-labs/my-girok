# Frontend Error Handling - UI Components

> Error display components, best practices, monitoring, testing, and troubleshooting

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

---

_Main: `frontend-error-handling.md`_

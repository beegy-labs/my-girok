# Toast Notification System Guide

> Theme-aware, accessible notifications integrated with the error handling system

## Overview

The toast notification system provides consistent, theme-aware notifications throughout the web-admin application. Built on the [sonner](https://sonner.emilkowal.ski/) library, it integrates seamlessly with the AppError system and custom hooks to provide automatic error handling through integration with `useApiMutation` and `useApiError` hooks, automatic theme support matching light and dark modes, intelligent AppError extraction for user-friendly messages and technical details, full accessibility compliance with ARIA and keyboard navigation, and a lightweight footprint of only 3KB gzipped.

## Basic Usage

### Manual Toast Triggers

Import the toast functions and call them directly when you need to show notifications:

```typescript
import { showSuccessToast, showErrorToast, showInfoToast, showWarningToast } from '../lib/toast';

// Success notification
showSuccessToast('Service created successfully!');

// Error notification (supports AppError, Error, or string)
showErrorToast(appError);
showErrorToast(new Error('Something went wrong'));
showErrorToast('Invalid input');

// Info notification
showInfoToast('Profile updated', 'Changes will take effect immediately');

// Warning notification
showWarningToast('Low disk space', 'Consider removing old logs');
```

### Using Hooks (Recommended)

The recommended approach is to use the hooks which handle toasts automatically.

#### With useApiMutation

The mutation hook automatically shows error toasts by default and can show success toasts when configured:

```typescript
import { useApiMutation } from '../hooks/useApiMutation';

const createServiceMutation = useApiMutation({
  mutationFn: async (data: CreateServiceInput) => {
    return await servicesApi.create(data);
  },
  successToast: 'Service created successfully!',
  // Error toasts are automatic (showErrorToast: true by default)
  onSuccess: (data) => {
    navigate(`/services/${data.id}`);
  },
});

// Use in component
<button onClick={() => createServiceMutation.mutate(formData)}>
  {createServiceMutation.isLoading ? 'Creating...' : 'Create Service'}
</button>
```

For dynamic success messages that depend on the result, pass a function:

```typescript
const mutation = useApiMutation({
  mutationFn: (data) => api.updateService(data),
  successToast: (result) => `Service "${result.name}" updated successfully!`,
});
```

To handle errors manually with custom logic, disable automatic error toasts:

```typescript
const mutation = useApiMutation({
  mutationFn: (data) => api.deleteService(data),
  showErrorToast: false, // Handle errors manually
  onError: (error) => {
    if (error.code === 'SERVICE_IN_USE') {
      showWarningToast('Cannot delete service', 'Service is currently in use');
    } else {
      showErrorToast(error);
    }
  },
});
```

#### With useApiError

The error hook automatically shows error toasts for data fetching operations:

```typescript
import { useApiError } from '../hooks/useApiError';

const { executeWithErrorHandling } = useApiError({
  context: 'ServicesPage',
  // Error toasts are automatic (showToast: true by default)
});

const fetchServices = useCallback(async () => {
  const result = await executeWithErrorHandling(() => servicesApi.list());
  if (result) {
    setServices(result);
  }
}, [executeWithErrorHandling]);

useEffect(() => {
  fetchServices();
}, [fetchServices]);
```

To handle errors without automatic toasts:

```typescript
const { executeWithErrorHandling } = useApiError({
  showToast: false, // Handle errors manually
  onError: (error) => {
    console.error('Failed to load:', error);
  },
});
```

## Advanced Usage

### Promise-based Toasts

Show a loading state that automatically updates to success or error when the promise resolves:

```typescript
import { toastPromise } from '../lib/toast';

const savePromise = api.saveSettings(settings);

toastPromise(savePromise, {
  loading: 'Saving settings...',
  success: 'Settings saved successfully!',
  error: (err) => `Failed to save: ${err.message}`,
});
```

### Action Buttons

Add interactive elements like retry buttons to your toasts:

```typescript
showErrorToast(error, {
  action: {
    label: 'Retry',
    onClick: () => mutation.mutate(data),
  },
});
```

### Manual Control

For full control over toast lifecycle, use the loading toast and manual dismiss functions:

```typescript
import { showLoadingToast, dismissToast } from '../lib/toast';

const toastId = showLoadingToast('Processing...');

// Later...
dismissToast(toastId);
showSuccessToast('Processing complete!');
```

## Configuration

### ToastProvider Setup

The ToastProvider must be included in your application's component tree. It is typically located in `apps/web-admin/src/main.tsx`:

```typescript
<ThemeProvider>
  <ToastProvider>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </ToastProvider>
</ThemeProvider>
```

### Theme Integration

Toasts automatically use the theme's CSS variables for consistent styling. The following variables are used:

- `--theme-bg-card` for toast background
- `--theme-text-primary` for text color
- `--theme-status-error-bg` for error toast background
- `--theme-status-success-bg` for success toast background

### Position and Duration

Customize toast behavior by editing `ToastProvider.tsx`:

```typescript
<Toaster
  position="bottom-right"  // top-left, top-right, bottom-left, bottom-right
  expand={false}
  richColors
  closeButton
  toastOptions={{
    // Custom durations per type
    duration: 4000, // Default
    error: { duration: 6000 },
    success: { duration: 3000 },
  }}
/>
```

## Migration Guide

### Before (Old Pattern)

The old approach required manual error state management and inline error display:

```typescript
const [error, setError] = useState<string | null>(null);

try {
  await api.save(data);
} catch (err) {
  setError(err instanceof Error ? err.message : 'Failed to save');
}

// Template
{error && (
  <div className="p-3 bg-theme-status-error-bg">
    {error}
  </div>
)}
```

### After (New Pattern)

With the toast system, error handling is automatic and no inline UI is needed:

```typescript
const mutation = useApiMutation({
  mutationFn: (data) => api.save(data),
  successToast: 'Saved successfully!',
});

// No error state needed!
// No inline error UI needed!
<button onClick={() => mutation.mutate(data)}>
  Save
</button>
```

## Best Practices

Use the `useApiMutation` and `useApiError` hooks rather than calling toast functions directly. Show success toasts only for user-initiated actions like create, update, and delete operations. Error toasts are shown automatically by default and can be disabled when custom handling is needed. Keep messages concise and use the `description` parameter for additional details. Add retry action buttons for transient errors to improve user experience. Use `toastPromise` for long-running operations to show progress.

## Testing

Test toast integration by mocking the sonner library:

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { showSuccessToast } from '../lib/toast';

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

test('shows success toast', () => {
  showSuccessToast('Test message');
  expect(toast.success).toHaveBeenCalledWith('Test message', expect.any(Object));
});
```

## Troubleshooting

### Toasts Not Appearing

Verify that `ToastProvider` is included in `main.tsx`. Check for z-index conflicts with modals or dialogs. Ensure theme CSS variables are properly loaded.

### Multiple Toasts Stacking

Use `dismissAllToasts()` before critical operations if needed. Set reasonable durations to prevent accumulation. Consider using `toastPromise` for sequential operations to consolidate notifications.

### Theme Not Applying

Verify that the `useTheme()` hook returns the correct `resolvedTheme`. Check that CSS variable definitions exist in your theme files. Ensure ToastProvider is rendered inside ThemeProvider in the component tree.

## API Reference

### Functions

The toast library provides the following functions:

- **showSuccessToast(message, options?)**: Shows a success notification and returns a toast ID
- **showErrorToast(error, options?)**: Shows an error notification accepting AppError, Error, or string
- **showInfoToast(message, description?, options?)**: Shows an info notification with optional description
- **showWarningToast(message, description?, options?)**: Shows a warning notification with optional description
- **showLoadingToast(message)**: Shows a loading notification that persists until dismissed
- **toastPromise(promise, messages)**: Shows loading state and automatically updates on promise resolution
- **dismissToast(toastId)**: Dismisses a specific toast by ID
- **dismissAllToasts()**: Dismisses all visible toasts

### Hook Options

#### useApiMutation Options

- **showErrorToast** (boolean, default: true): Automatically show error toasts on failure
- **successToast** (string or function, default: undefined): Message or function returning message to show on success

#### useApiError Options

- **showToast** (boolean, default: true): Automatically show error toasts on failure

## Related Documentation

- [Error Handling Guide](./frontend-error-handling.md)
- [Hooks: useApiMutation](../packages/hooks.md#useapimutation)
- [Hooks: useApiError](../packages/hooks.md#useapierror)
- [Theme System](../packages/design-tokens.md)

---

**LLM Reference**: `docs/llm/guides/toast-notifications.md`

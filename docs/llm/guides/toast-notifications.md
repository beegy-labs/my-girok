# Toast Notification System

> **Package**: sonner
> **Location**: `apps/web-admin/src/lib/toast.ts`
> **Provider**: `apps/web-admin/src/components/ToastProvider.tsx`

## Overview

The toast notification system provides consistent, theme-aware notifications across the web-admin application. Built on [sonner](https://sonner.emilkowal.ski/), it integrates seamlessly with our AppError system and hooks.

## Features

- **Automatic Error Handling**: Integrated with `useApiMutation` and `useApiError` hooks
- **Theme Support**: Automatically matches light/dark theme
- **AppError Integration**: Extracts user-friendly messages and technical details
- **Accessible**: ARIA-compliant, keyboard navigation support
- **Lightweight**: Only 3KB gzipped

## Basic Usage

### Manual Toast Triggers

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

### With Hooks (Recommended)

#### useApiMutation

Automatically shows error toasts and optional success toasts:

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

Dynamic success messages:

```typescript
const mutation = useApiMutation({
  mutationFn: (data) => api.updateService(data),
  successToast: (result) => `Service "${result.name}" updated successfully!`,
});
```

Disable automatic error toast:

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

#### useApiError

Automatically shows error toasts for data fetching:

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

Disable automatic toast:

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

Show loading state, then automatically update to success/error:

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

Add retry or custom actions to toasts:

```typescript
showErrorToast(error, {
  action: {
    label: 'Retry',
    onClick: () => mutation.mutate(data),
  },
});
```

### Manual Control

```typescript
import { showLoadingToast, dismissToast } from '../lib/toast';

const toastId = showLoadingToast('Processing...');

// Later...
dismissToast(toastId);
showSuccessToast('Processing complete!');
```

## Configuration

### ToastProvider

Located in `apps/web-admin/src/main.tsx`:

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

Toasts automatically use theme CSS variables:

- `--theme-bg-card`
- `--theme-text-primary`
- `--theme-status-error-bg`
- `--theme-status-success-bg`
- etc.

### Position and Duration

Edit `ToastProvider.tsx` to customize:

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

1. **Use Hooks**: Prefer `useApiMutation` and `useApiError` over manual toast calls
2. **Success Toasts**: Only show for user-initiated actions (create, update, delete)
3. **Error Toasts**: Automatically shown for all errors (can be disabled)
4. **Keep Messages Short**: Use `description` for additional details
5. **Action Buttons**: Add retry for transient errors
6. **Loading State**: Use `toastPromise` for long-running operations

## Testing

Test toast integration:

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

### Toasts not appearing

- Ensure `ToastProvider` is in `main.tsx`
- Check z-index conflicts with modals/dialogs
- Verify theme CSS variables are loaded

### Multiple toasts stacking

- Use `dismissAllToasts()` before critical operations
- Set reasonable durations
- Consider using `toastPromise` for sequential operations

### Theme not applying

- Verify `useTheme()` hook returns correct `resolvedTheme`
- Check CSS variable definitions in theme files
- Ensure ToastProvider is inside ThemeProvider

## API Reference

### Functions

| Function           | Parameters                          | Returns            | Description                |
| ------------------ | ----------------------------------- | ------------------ | -------------------------- |
| `showSuccessToast` | `(message, options?)`               | `string \| number` | Show success notification  |
| `showErrorToast`   | `(error, options?)`                 | `string \| number` | Show error notification    |
| `showInfoToast`    | `(message, description?, options?)` | `string \| number` | Show info notification     |
| `showWarningToast` | `(message, description?, options?)` | `string \| number` | Show warning notification  |
| `showLoadingToast` | `(message)`                         | `string \| number` | Show loading notification  |
| `toastPromise`     | `(promise, messages)`               | `Promise<T>`       | Promise-based notification |
| `dismissToast`     | `(toastId)`                         | `void`             | Dismiss specific toast     |
| `dismissAllToasts` | `()`                                | `void`             | Dismiss all toasts         |

### Hook Options

#### useApiMutation

| Option           | Type                         | Default     | Description            |
| ---------------- | ---------------------------- | ----------- | ---------------------- |
| `showErrorToast` | `boolean`                    | `true`      | Auto-show error toasts |
| `successToast`   | `string \| (data) => string` | `undefined` | Success message        |

#### useApiError

| Option      | Type      | Default | Description            |
| ----------- | --------- | ------- | ---------------------- |
| `showToast` | `boolean` | `true`  | Auto-show error toasts |

## Related Documentation

- [Error Handling](./error-handling.md)
- [Hooks: useApiMutation](../packages/hooks.md#useapimutation)
- [Hooks: useApiError](../packages/hooks.md#useapierror)
- [Theme System](../packages/design-tokens.md)

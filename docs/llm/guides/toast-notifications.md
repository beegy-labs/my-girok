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
```

## Best Practices

1. **Use Hooks**: Prefer `useApiMutation` and `useApiError` over manual toast calls
2. **Success Toasts**: Only show for user-initiated actions (create, update, delete)
3. **Error Toasts**: Automatically shown for all errors (can be disabled)
4. **Keep Messages Short**: Use `description` for additional details
5. **Action Buttons**: Add retry for transient errors
6. **Loading State**: Use `toastPromise` for long-running operations

## API Reference

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

## Related Documentation

- **Advanced Usage**: `toast-notifications-advanced.md`
- [Error Handling](./error-handling.md)
- [Hooks: useApiMutation](../packages/hooks.md#useapimutation)
- [Theme System](../packages/design-tokens.md)

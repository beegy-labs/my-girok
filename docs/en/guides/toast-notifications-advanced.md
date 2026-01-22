# Toast Notifications - Advanced Usage Guide

This guide covers advanced toast notification patterns including promise-based toasts, action buttons, manual control, and hook configuration options.

## Overview

Beyond basic success and error toasts, the notification system supports more complex patterns for handling asynchronous operations, providing retry functionality, and customizing notification behavior.

## Promise-Based Toasts

For asynchronous operations, promise-based toasts automatically show a loading state and update to success or error based on the outcome:

```typescript
import { toastPromise } from '../lib/toast';

const savePromise = api.saveSettings(settings);

toastPromise(savePromise, {
  loading: 'Saving settings...',
  success: 'Settings saved successfully!',
  error: (err) => `Failed to save: ${err.message}`,
});
```

This pattern provides immediate feedback to users while the operation is in progress, then seamlessly transitions to the final state without requiring manual state management.

## Action Buttons

Add actionable buttons to toasts for retry functionality or other user actions:

```typescript
showErrorToast(error, {
  action: {
    label: 'Retry',
    onClick: () => mutation.mutate(data),
  },
});
```

Action buttons are particularly useful for transient errors where a retry might succeed.

## Manual Toast Control

For more complex scenarios, you can manually control toast lifecycle:

```typescript
import { showLoadingToast, dismissToast } from '../lib/toast';

// Start a loading toast and save its ID
const toastId = showLoadingToast('Processing...');

// Perform operations...

// Later, dismiss the loading toast and show result
dismissToast(toastId);
showSuccessToast('Processing complete!');
```

This approach is useful when the operation involves multiple steps or when you need to update the toast message during processing.

## Dynamic Success Messages

When using mutations, you can generate success messages dynamically based on the operation result:

```typescript
const mutation = useApiMutation({
  mutationFn: (data) => api.updateService(data),
  successToast: (result) => `Service "${result.name}" updated successfully!`,
});
```

The callback receives the mutation result, allowing you to include relevant details in the notification.

## Disabling Automatic Error Toasts

Sometimes you need to handle errors with custom logic rather than displaying a generic error toast:

```typescript
const mutation = useApiMutation({
  mutationFn: (data) => api.deleteService(data),
  showErrorToast: false, // Disable automatic error handling
  onError: (error) => {
    if (error.code === 'SERVICE_IN_USE') {
      showWarningToast('Cannot delete service', 'Service is currently in use');
    } else {
      showErrorToast(error);
    }
  },
});
```

This pattern allows you to provide more contextual error messages based on specific error conditions.

## Hook Configuration Options

### useApiMutation Options

| Option           | Type                         | Default     | Description                                    |
| ---------------- | ---------------------------- | ----------- | ---------------------------------------------- |
| `showErrorToast` | `boolean`                    | `true`      | Whether to automatically show error toasts     |
| `successToast`   | `string \| (data) => string` | `undefined` | Message to show on success (static or dynamic) |

### useApiError Options

| Option      | Type      | Default | Description                                |
| ----------- | --------- | ------- | ------------------------------------------ |
| `showToast` | `boolean` | `true`  | Whether to automatically show error toasts |

## Related Documentation

For provider setup, theme integration, and testing information, see the Toast Notifications Configuration guide.

---

_This document is auto-generated from `docs/llm/guides/toast-notifications-advanced.md`_

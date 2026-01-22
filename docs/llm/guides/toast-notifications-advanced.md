# Toast Notifications - Advanced

> Advanced usage, promise-based toasts, and action buttons

## Promise-based Toasts

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

## Action Buttons

Add retry or custom actions to toasts:

```typescript
showErrorToast(error, {
  action: {
    label: 'Retry',
    onClick: () => mutation.mutate(data),
  },
});
```

## Manual Control

```typescript
import { showLoadingToast, dismissToast } from '../lib/toast';

const toastId = showLoadingToast('Processing...');

// Later...
dismissToast(toastId);
showSuccessToast('Processing complete!');
```

## Dynamic Success Messages

```typescript
const mutation = useApiMutation({
  mutationFn: (data) => api.updateService(data),
  successToast: (result) => `Service "${result.name}" updated successfully!`,
});
```

## Disable Automatic Error Toast

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

## Hook Options

### useApiMutation

| Option           | Type                         | Default     | Description            |
| ---------------- | ---------------------------- | ----------- | ---------------------- |
| `showErrorToast` | `boolean`                    | `true`      | Auto-show error toasts |
| `successToast`   | `string \| (data) => string` | `undefined` | Success message        |

### useApiError

| Option      | Type      | Default | Description            |
| ----------- | --------- | ------- | ---------------------- |
| `showToast` | `boolean` | `true`  | Auto-show error toasts |

## Related Documentation

- **Configuration & Testing**: `toast-notifications-config.md`
- Main: `toast-notifications.md`

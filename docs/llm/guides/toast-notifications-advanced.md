# Toast Notifications - Advanced

> Advanced usage, configuration, migration, and troubleshooting

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

### Dynamic Success Messages

```typescript
const mutation = useApiMutation({
  mutationFn: (data) => api.updateService(data),
  successToast: (result) => `Service "${result.name}" updated successfully!`,
});
```

### Disable Automatic Error Toast

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

---

_Main: `toast-notifications.md`_

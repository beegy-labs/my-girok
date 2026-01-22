# Toast Notifications - Configuration

> Provider setup, theme integration, migration guide, testing, and troubleshooting

## ToastProvider

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

## Theme Integration

Toasts automatically use theme CSS variables:

- `--theme-bg-card`
- `--theme-text-primary`
- `--theme-status-error-bg`
- `--theme-status-success-bg`

## Position and Duration

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

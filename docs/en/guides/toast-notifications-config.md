# Toast Notifications - Configuration Guide

This guide covers ToastProvider setup, theme integration, migration from inline error states, testing strategies, and troubleshooting common issues.

## Overview

Toast notifications provide non-intrusive feedback to users without disrupting their workflow. This guide explains how to configure the toast system and migrate existing error handling patterns.

## ToastProvider Setup

The ToastProvider must be placed in the component tree above any components that use toast notifications. In the web-admin application, it is configured in `main.tsx`:

```typescript
<ThemeProvider>
  <ToastProvider>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </ToastProvider>
</ThemeProvider>
```

Note that ToastProvider must be inside ThemeProvider to access theme CSS variables for styling.

## Theme Integration

Toasts automatically inherit styling from the application theme using CSS variables:

- `--theme-bg-card` - Toast background color
- `--theme-text-primary` - Toast text color
- `--theme-status-error-bg` - Error toast background
- `--theme-status-success-bg` - Success toast background

No additional configuration is required for theme support.

## Customizing Position and Duration

To customize toast behavior, modify the ToastProvider configuration:

```typescript
<Toaster
  position="bottom-right"  // Options: top-left, top-right, bottom-left, bottom-right
  expand={false}
  richColors
  closeButton
  toastOptions={{
    duration: 4000, // Default duration in milliseconds
    error: { duration: 6000 },   // Longer duration for errors
    success: { duration: 3000 }, // Shorter duration for success
  }}
/>
```

Error toasts typically have longer durations to ensure users notice important error messages.

## Migration Guide

### Before: Inline Error State Pattern

The old pattern required managing error state and rendering inline error components:

```typescript
const [error, setError] = useState<string | null>(null);

try {
  await api.save(data);
} catch (err) {
  setError(err instanceof Error ? err.message : 'Failed to save');
}

// In the template
{error && (
  <div className="p-3 bg-theme-status-error-bg">
    {error}
  </div>
)}
```

This approach clutters components with error handling boilerplate and requires manual error state cleanup.

### After: Toast Notification Pattern

The new pattern uses hooks that handle error display automatically:

```typescript
const mutation = useApiMutation({
  mutationFn: (data) => api.save(data),
  successToast: 'Saved successfully!',
});

// In the template - no error UI needed!
<button onClick={() => mutation.mutate(data)}>
  Save
</button>
```

Benefits of the new pattern:

- No error state management required
- No inline error UI components needed
- Consistent error presentation across the application
- Automatic retry options for transient errors

## Testing

### Mocking the Toast Library

For unit tests, mock the sonner toast library:

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { showSuccessToast } from '../lib/toast';

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

This allows you to verify that toast functions are called with correct parameters without rendering actual toast components.

## Troubleshooting

### Toasts Not Appearing

If toasts are not visible:

1. **Check provider placement**: Ensure `ToastProvider` is included in `main.tsx` and wraps the router
2. **Check z-index**: Toasts may be hidden behind modals or dialogs; inspect the z-index values
3. **Verify theme variables**: Ensure CSS variables are defined and loaded before toasts render

### Multiple Toasts Stacking

If too many toasts stack up:

1. **Dismiss before operations**: Call `dismissAllToasts()` before starting critical operations that may generate multiple toasts
2. **Adjust durations**: Reduce toast durations to clear the stack faster
3. **Use promise toasts**: For sequential operations, use `toastPromise` which manages its own loading/success/error states

### Theme Not Applying

If toasts appear unstyled or with wrong colors:

1. **Check hook availability**: Verify `useTheme()` returns a valid `resolvedTheme` value
2. **Inspect CSS variables**: Check that theme CSS variables are defined in your theme files
3. **Verify provider order**: Ensure ToastProvider is nested inside ThemeProvider

---

_This document is auto-generated from `docs/llm/guides/toast-notifications-config.md`_

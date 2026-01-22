# Web Girok (Extended)

Public React web application - Extended documentation (Updated 2026-01-11)

## Stack

| Component | Technology          |
| --------- | ------------------- |
| Framework | React 19.2 + Vite 7 |
| Router    | React Router v7     |
| Styling   | Tailwind CSS 4.1    |
| State     | Zustand 5.0         |
| Testing   | Vitest + Playwright |

## Mobile Patterns

| Size | Height | Target          |
| ---- | ------ | --------------- |
| sm   | 36px   | Avoid on mobile |
| md   | 44px   | AA minimum      |
| lg   | 56px   | Recommended     |
| xl   | 64px   | Primary actions |

```typescript
// Touch sensor for drag-drop
useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } });
```

## Hooks

### useResumeViewer

```typescript
const { data, loading, error, retry } = useResumeViewer({
  fetchFn: () => getResume(resumeId),
  deps: [resumeId],
  skip: !resumeId,
  errorMapper: (err) => (err.response?.status === 404 ? 'NOT_FOUND' : 'UNKNOWN'),
});

// Error types: NOT_FOUND, EXPIRED, INACTIVE, NETWORK, UNKNOWN
```

## Performance (MANDATORY)

```typescript
// Memoize handlers
const handleSubmit = useCallback(async (data) => { ... }, [deps]);

// Memoize computed
const sorted = useMemo(() => items.sort(), [items]);

// Static constants outside component
const LANGUAGES = [{ code: 'ko' }] as const;
```

## Environment

```bash
VITE_API_URL=https://auth.girok.dev
VITE_PERSONAL_API_URL=https://my.girok.dev
```

## Commands

```bash
pnpm --filter web-girok dev    # Start
pnpm --filter web-girok build  # Build
pnpm --filter web-girok test   # Test
```

## Related Documentation

- **Resume PDF & Auth**: `web-girok-features.md`
- [Design Tokens](../packages/design-tokens.md)

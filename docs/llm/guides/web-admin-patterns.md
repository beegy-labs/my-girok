# Web Admin Patterns

> Styling, design principles, and component patterns

## Styling

### Theme Variables

```css
/* Correct */
text-theme-text-primary
bg-theme-bg-card
border-theme-border
bg-theme-status-success-bg

/* Wrong - no raw colors */
text-gray-900
bg-white
```

### Badge Variants

| Variant | Use               |
| ------- | ----------------- |
| success | Active, approved  |
| warning | Pending           |
| error   | Suspended, failed |
| info    | Information       |
| default | Neutral           |

## i18n

Locales: en, ko, ja, hi

Key format: `{namespace}.{section}.{key}`

## Design Principles

Priority: Information Density > Readability > WCAG AAA (intentionally ignored for admin)

| Pattern             | Implementation                |
| ------------------- | ----------------------------- |
| Dense Tables        | Compact rows, truncated UUIDs |
| Inline Actions      | Icon buttons in cells         |
| Collapsible Filters | Show/hide with badge count    |
| IDs                 | `font-mono text-xs`           |
| Status              | Badge component               |
| Pagination          | Previous/Next + range         |

## Table Cell Patterns

```tsx
// ID
<td><TruncatedId id={item.id} length={8} showCopy /></td>

// Status
<td><Badge variant={statusConfig.variant}>{t(statusConfig.labelKey)}</Badge></td>

// Date
<td className="text-theme-text-secondary whitespace-nowrap">{formatAdminDate(date)}</td>

// Actions
<td><div className="flex items-center gap-1">
  <button className="p-1.5"><Pencil size={14} /></button>
  <button className="p-1.5"><Trash2 size={14} /></button>
</div></td>
```

## ID Utilities

```typescript
import { TruncatedId } from '@/components/atoms';
import { truncateUuid, formatAdminDate } from '@/utils/sanitize';

<TruncatedId id="abc12345-..." />        // Shows "abc12345..." with copy
truncateUuid(uuid, 8);                   // "abc12345..."
formatAdminDate(new Date());             // "Dec 25" or "Dec 25, 2024"
```

## Troubleshooting

| Issue                | Solution                               |
| -------------------- | -------------------------------------- |
| Menu not updating    | Clear localStorage, refresh            |
| 401 errors           | Check token, backend, CORS             |
| Missing translations | Check all locale files, restart dev    |
| Page crashes         | Error boundary shows UI, check console |

---

_Main: `web-admin.md`_

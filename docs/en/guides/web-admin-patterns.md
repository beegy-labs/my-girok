# Web Admin Patterns Guide

This guide covers styling conventions, design principles, and component patterns for the web-admin application.

## Overview

The web-admin application prioritizes information density for administrative users who need to view and manage large amounts of data efficiently. This guide explains the styling system, design principles, and reusable component patterns.

## Styling Conventions

### Theme Variables

Always use theme CSS variables for colors rather than raw Tailwind color classes:

```css
/* Correct - uses theme variables */
text-theme-text-primary
bg-theme-bg-card
border-theme-border
bg-theme-status-success-bg

/* Incorrect - raw colors create inconsistency */
text-gray-900
bg-white
```

Theme variables ensure consistent appearance across light and dark modes and make it easier to update the color scheme.

### Badge Variants

Use semantic badge variants based on the status being communicated:

| Variant | Use Case                    |
| ------- | --------------------------- |
| success | Active, approved, enabled   |
| warning | Pending, awaiting action    |
| error   | Suspended, failed, disabled |
| info    | Informational, neutral      |
| default | No specific status          |

## Internationalization

The application supports the following locales: English (en), Korean (ko), Japanese (ja), and Hindi (hi).

Translation keys follow the format: `{namespace}.{section}.{key}`

Example: `services.config.saveButton`

## Design Principles

The web-admin application follows specific design priorities:

**Priority Order**: Information Density > Readability > WCAG AAA Compliance

Note that WCAG AAA compliance is intentionally deprioritized for the admin interface, as power users benefit more from dense information displays. This is an explicit design decision for internal tools.

### Common Patterns

| Pattern             | Implementation                             |
| ------------------- | ------------------------------------------ |
| Dense Tables        | Compact row heights, truncated UUIDs       |
| Inline Actions      | Icon buttons directly in table cells       |
| Collapsible Filters | Show/hide with badge showing active count  |
| ID Display          | Monospace font, small text size            |
| Status Display      | Badge component with semantic variants     |
| Pagination          | Previous/Next buttons with range indicator |

## Table Cell Patterns

### ID Column

Display truncated IDs with copy functionality:

```tsx
<td>
  <TruncatedId id={item.id} length={8} showCopy />
</td>
```

### Status Column

Use badges with translated labels:

```tsx
<td>
  <Badge variant={statusConfig.variant}>{t(statusConfig.labelKey)}</Badge>
</td>
```

### Date Column

Format dates consistently and prevent wrapping:

```tsx
<td className="text-theme-text-secondary whitespace-nowrap">{formatAdminDate(date)}</td>
```

### Actions Column

Group action buttons with minimal spacing:

```tsx
<td>
  <div className="flex items-center gap-1">
    <button className="p-1.5">
      <Pencil size={14} />
    </button>
    <button className="p-1.5">
      <Trash2 size={14} />
    </button>
  </div>
</td>
```

## ID Utilities

The application provides utilities for working with UUIDs and dates:

```typescript
import { TruncatedId } from '@/components/atoms';
import { truncateUuid, formatAdminDate } from '@/utils/sanitize';

// Component with built-in copy button
<TruncatedId id="abc12345-..." />        // Shows "abc12345..." with copy

// Direct function for custom usage
truncateUuid(uuid, 8);                   // Returns "abc12345..."

// Date formatting
formatAdminDate(new Date());             // Returns "Dec 25" or "Dec 25, 2024"
```

The TruncatedId component includes hover states and a copy button for user convenience.

## Troubleshooting

### Menu Not Updating

If navigation menu changes are not reflected:

- Clear localStorage to remove cached menu state
- Perform a hard refresh of the page
- Check that menu configuration changes are being loaded

### 401 Authentication Errors

If you encounter unauthorized errors:

- Verify the authentication token is valid and not expired
- Check that the backend service is running
- Confirm CORS is configured correctly for API requests

### Missing Translations

If translation keys appear instead of translated text:

- Check that all locale files contain the required keys
- Restart the development server to reload translation files
- Verify the locale detection is working correctly

### Page Crashes

If a page crashes with an error:

- The error boundary will display a user-friendly error page
- Check the browser console for the actual error message and stack trace
- Review recent changes to the affected component

---

_This document is auto-generated from `docs/llm/guides/web-admin-patterns.md`_

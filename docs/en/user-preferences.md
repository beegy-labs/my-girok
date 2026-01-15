# User Preferences

> Cookie-first preferences for theme and section order

## Overview

User preferences are stored using a cookie-first strategy that provides instant UI feedback while syncing with the server in the background.

## API Endpoints

```
GET    /v1/user-preferences  # Get
POST   /v1/user-preferences  # Upsert
PUT    /v1/user-preferences  # Partial update
DELETE /v1/user-preferences  # Reset (204)
```

## Data Structure

```typescript
interface UserPreferences {
  id: string;
  userId: string;
  theme: 'LIGHT' | 'DARK';
  sectionOrder: SectionOrderItem[] | null;
}

interface SectionOrderItem {
  type: 'SKILLS' | 'EXPERIENCE' | 'PROJECT' | 'EDUCATION' | 'CERTIFICATE';
  order: number;
  visible: boolean;
}
```

The `sectionOrder` array allows users to customize the order and visibility of resume sections.

## Cookie-First Strategy

The cookie-first approach prioritizes user experience by providing instant feedback:

**Load Flow**:

```
Cookie -> Server -> Create defaults
```

**Update Flow**:

```
Cookie (instant) -> Local state -> Server (background)
```

This strategy ensures:

- Immediate UI response to preference changes
- No blocking on server responses
- Graceful degradation if server is unavailable

## Usage

```typescript
import { useUserPreferencesStore } from '@/stores/userPreferencesStore';
const { preferences, loadPreferences, setTheme, setSectionOrder } = useUserPreferencesStore();

useEffect(() => {
  loadPreferences();
}, []);
await setTheme(theme === 'LIGHT' ? 'DARK' : 'LIGHT');
```

## Cookies

| Key                  | Purpose          |
| -------------------- | ---------------- |
| `user-theme`         | Theme preference |
| `user-section-order` | Section order    |

## Rules

| Do                         | Don't                           |
| -------------------------- | ------------------------------- |
| Use cookies for instant UI | Block UI waiting for server     |
| Sync server in background  | Skip cookie caching             |
| Clear cookies on logout    | Store sensitive data in cookies |

### Implementation Guidelines

- **Use cookies for instant UI**: The UI should update immediately when preferences change, without waiting for server confirmation.
- **Sync server in background**: After updating the cookie, send the update to the server asynchronously.
- **Clear cookies on logout**: Remove preference cookies when the user logs out to prevent stale data.
- **Never store sensitive data**: Cookies are for UI preferences only, not authentication tokens or personal information.

---

**LLM Reference**: `docs/llm/user-preferences.md`

# User Preferences

> Cookie-first preferences for theme and section order | **Last Updated**: 2026-01-06

## API Endpoints

```typescript
GET    /v1/user-preferences              → UserPreferences
POST   /v1/user-preferences              → UserPreferences (upsert)
PUT    /v1/user-preferences              → UserPreferences (partial)
DELETE /v1/user-preferences              → 204 (reset)
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

## Cookie-First Strategy

**Load:**

1. Check cookies → Use if exists
2. Fetch from server → Cache in cookies
3. Create defaults → Save to both

**Update:**

1. Update cookie (instant)
2. Update local state
3. Sync server (background)

## Frontend Usage

```typescript
import { useUserPreferencesStore } from '@/stores/userPreferencesStore';

const { preferences, loadPreferences, setTheme, setSectionOrder } = useUserPreferencesStore();

// Load on app start
useEffect(() => {
  loadPreferences();
}, []);

// Toggle theme
await setTheme(theme === 'LIGHT' ? 'DARK' : 'LIGHT');

// Update order
await setSectionOrder(newOrder);
```

## Cookie Keys

| Key                  | Purpose            |
| -------------------- | ------------------ |
| `user-theme`         | Theme preference   |
| `user-section-order` | Section order JSON |

## Default Preferences

```typescript
{
  theme: 'LIGHT',
  sectionOrder: [
    { type: 'SKILLS', order: 0, visible: true },
    { type: 'EXPERIENCE', order: 1, visible: true },
    { type: 'PROJECT', order: 2, visible: true },
    { type: 'EDUCATION', order: 3, visible: true },
    { type: 'CERTIFICATE', order: 4, visible: true },
  ]
}
```

## Components

| Component             | Purpose                   |
| --------------------- | ------------------------- |
| `ThemeToggle`         | Toggle switch, auto-saves |
| `SectionOrderManager` | Reorder + visibility      |
| `SettingsPage`        | `/settings` route         |

## Best Practices

| Do                         | Don't                           |
| -------------------------- | ------------------------------- |
| Use cookies for instant UI | Block UI waiting for server     |
| Sync server in background  | Skip cookie caching             |
| Clear cookies on logout    | Store sensitive data in cookies |

---

**Full implementation**: `services/personal-service/src/user-preferences/`

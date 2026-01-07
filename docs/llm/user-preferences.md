# User Preferences

Cookie-first preferences for theme and section order

## API

```
GET    /v1/user-preferences  # Get
POST   /v1/user-preferences  # Upsert
PUT    /v1/user-preferences  # Partial update
DELETE /v1/user-preferences  # Reset (204)
```

## Data

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

**Load**: Cookie -> Server -> Create defaults
**Update**: Cookie (instant) -> Local state -> Server (background)

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

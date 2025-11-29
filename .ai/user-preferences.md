# User Preferences

> Cookie-first user preferences for theme and section order

## Quick Reference

### API Endpoints

```typescript
// Get preferences (creates default if not exists)
GET /v1/user-preferences → UserPreferences

// Upsert preferences
POST /v1/user-preferences + CreateUserPreferencesDto → UserPreferences

// Partial update
PUT /v1/user-preferences + UpdateUserPreferencesDto → UserPreferences

// Delete (reset to defaults)
DELETE /v1/user-preferences → 204
```

### Data Structure

```typescript
interface UserPreferences {
  id: string;
  userId: string;
  theme: 'LIGHT' | 'DARK';
  sectionOrder: SectionOrderItem[] | null;
  createdAt: string;
  updatedAt: string;
}

interface SectionOrderItem {
  type: 'SKILLS' | 'EXPERIENCE' | 'PROJECT' | 'EDUCATION' | 'CERTIFICATE';
  order: number;  // 0-based
  visible: boolean;
}
```

## Architecture

### Cookie-First Strategy

**Load Priority:**
1. Check cookies → Use if exists (no server call)
2. Fetch from server → Cache in cookies
3. Create defaults → Save to cookies + server

**Update Flow:**
1. Update cookie (instant)
2. Update local state
3. Sync server (background)

### File Structure

**Backend:**
```
services/personal-service/src/user-preferences/
├── dto/
│   ├── create-user-preferences.dto.ts
│   ├── update-user-preferences.dto.ts
│   └── section-order-item.dto.ts
├── user-preferences.service.ts
├── user-preferences.controller.ts
└── user-preferences.module.ts
```

**Frontend:**
```
apps/web-main/src/
├── api/userPreferences.ts
├── stores/userPreferencesStore.ts
├── utils/cookies.ts
├── components/settings/
│   ├── ThemeToggle.tsx
│   └── SectionOrderManager.tsx
└── pages/settings/SettingsPage.tsx
```

## Implementation Guide

### Backend Service

**Key Methods:**
```typescript
// Auto-create if not exists
getUserPreferences(userId): Promise<UserPreferences>

// Create or update
upsertUserPreferences(userId, dto): Promise<UserPreferences>

// Partial update
updateUserPreferences(userId, dto): Promise<UserPreferences>

// Delete
deleteUserPreferences(userId): Promise<void>
```

**Default Preferences:**
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

### Frontend Store

**Zustand Store:**
```typescript
import { useUserPreferencesStore } from '@/stores/userPreferencesStore';

const {
  preferences,
  loadPreferences,
  setTheme,
  setSectionOrder,
  updatePreferences,
  clearPreferences
} = useUserPreferencesStore();
```

**Usage Example:**
```typescript
// Load on app start
useEffect(() => {
  loadPreferences();
}, []);

// Toggle theme
await setTheme(theme === 'LIGHT' ? 'DARK' : 'LIGHT');

// Update section order
await setSectionOrder(newOrder);
```

### Cookie Management

**Cookie Keys:**
- `user-theme`: Theme preference
- `user-section-order`: Section order JSON

**Utilities:**
```typescript
import { getCookie, setCookie, getCookieJSON, setCookieJSON } from '@/utils/cookies';

// Set theme cookie
setCookieJSON('user-theme', 'DARK', { expires: 365 });

// Get theme cookie
const theme = getCookieJSON<Theme>('user-theme');

// Clear cookies
deleteCookie('user-theme');
```

## UI Components

### ThemeToggle

**Usage:**
```tsx
import ThemeToggle from '@/components/settings/ThemeToggle';

<ThemeToggle />
```

**Features:**
- Toggle switch UI
- Instant feedback
- Auto-saves to cookie + server

### SectionOrderManager

**Usage:**
```tsx
import SectionOrderManager from '@/components/settings/SectionOrderManager';

<SectionOrderManager />
```

**Features:**
- Reorder with arrow buttons (▲ ▼)
- Toggle visibility (checkboxes)
- Save button for batch update

### Settings Page

**Route:** `/settings`

**Layout:**
```tsx
<SettingsPage>
  <ThemeToggle />
  <SectionOrderManager />
</SettingsPage>
```

## Best Practices

### DO ✅

- Use cookies for instant UI updates
- Sync server in background
- Auto-create default preferences
- Clear cookies on logout
- Validate section order integrity

### DON'T ❌

- Block UI waiting for server
- Skip cookie caching
- Store sensitive data in cookies
- Forget to handle offline mode
- Ignore cookie expiry

## Common Patterns

### Load Preferences on App Start

```typescript
function App() {
  const { loadPreferences } = useUserPreferencesStore();

  useEffect(() => {
    loadPreferences();
  }, []);

  return <Router>...</Router>;
}
```

### Apply Theme to App

```typescript
function App() {
  const { preferences } = useUserPreferencesStore();
  const isDark = preferences?.theme === 'DARK';

  return (
    <div className={isDark ? 'dark' : ''}>
      {/* App content */}
    </div>
  );
}
```

### Filter Sections by Visibility

```typescript
const visibleSections = preferences?.sectionOrder
  ?.filter(s => s.visible)
  .sort((a, b) => a.order - b.order) || [];

return visibleSections.map(section => (
  <Section key={section.type} type={section.type} />
));
```

## Troubleshooting

### Preferences Not Loading

**Check:**
1. Cookies enabled in browser?
2. JWT token valid?
3. Network request successful?
4. Store initialized correctly?

**Fix:**
```typescript
// Clear cookies and reload
deleteCookie('user-theme');
deleteCookie('user-section-order');
window.location.reload();
```

### Theme Not Applying

**Check:**
1. Theme preference set correctly?
2. CSS classes applied?
3. Re-render triggered?

**Fix:**
```typescript
// Force re-render with theme
const { preferences } = useUserPreferencesStore();
useEffect(() => {
  document.body.className = preferences?.theme === 'DARK' ? 'dark' : '';
}, [preferences?.theme]);
```

### Section Order Not Persisting

**Check:**
1. Save button clicked?
2. API call successful?
3. Cookie updated?

**Fix:**
```typescript
// Manually sync
const { setSectionOrder } = useUserPreferencesStore();
await setSectionOrder(newOrder);
```

## Token Budget

**File Sizes:**
- Backend DTO: ~100 lines (~3K tokens)
- Backend Service: ~170 lines (~5K tokens)
- Backend Controller: ~130 lines (~4K tokens)
- Frontend API: ~90 lines (~3K tokens)
- Frontend Store: ~240 lines (~8K tokens)
- Frontend Cookie Utils: ~100 lines (~3K tokens)
- Frontend Components: ~300 lines (~10K tokens)

**Total:** ~36K tokens
**Documentation:** ~10K tokens

## Related

- **Policy Doc**: `docs/policies/USER_PREFERENCES.md`
- **Database**: `services/personal-service/prisma/schema.prisma`
- **Testing**: `docs/policies/TESTING.md`

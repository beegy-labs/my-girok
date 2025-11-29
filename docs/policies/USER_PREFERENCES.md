# User Preferences Policy

> User preferences management for theme and home section order

## Overview

The user preferences system allows users to customize their experience by:
- Setting theme preference (Light/Dark mode)
- Managing home section order and visibility
- Storing preferences with cookie-first caching strategy

## Architecture

### Cookie-First Strategy

```
User Action
    ↓
Update Cookie (optimistic)
    ↓
Update Local State
    ↓
Update Server (background)
```

**Benefits:**
- Instant UI feedback
- Works offline
- Reduces server load
- Server sync in background

### Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                      Web Main App                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Settings    │  │ ThemeToggle  │  │ SectionOrder │  │
│  │  Page        │  │              │  │  Manager     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│         │                 │                  │           │
│         └─────────────────┴──────────────────┘           │
│                           │                              │
│                  ┌────────▼────────┐                     │
│                  │  Zustand Store  │                     │
│                  └────────┬────────┘                     │
│                  ┌────────┴────────┐                     │
│                  │     Cookies     │                     │
│                  └────────┬────────┘                     │
└───────────────────────────┼──────────────────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ Personal API  │
                    └───────────────┘
                            │
                            ▼
                  ┌───────────────────┐
                  │  PostgreSQL       │
                  │  (user_preferences│
                  │   table)          │
                  └───────────────────┘
```

## Data Model

### Database Schema

```prisma
model UserPreferences {
  id     String @id @default(uuid())
  userId String @unique @map("user_id")

  // Theme settings
  theme Theme @default(LIGHT)

  // Home section settings (JSON)
  // Structure: [{ type: "SKILLS", order: 0, visible: true }, ...]
  sectionOrder Json? @map("section_order")

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
}

enum Theme {
  LIGHT
  DARK
}
```

### DTOs

```typescript
// Section Order Item
interface SectionOrderItem {
  type: 'SKILLS' | 'EXPERIENCE' | 'PROJECT' | 'EDUCATION' | 'CERTIFICATE';
  order: number;  // 0-based
  visible: boolean;
}

// Create/Update DTO
interface CreateUserPreferencesDto {
  theme: 'LIGHT' | 'DARK';
  sectionOrder?: SectionOrderItem[];
}

interface UpdateUserPreferencesDto {
  theme?: 'LIGHT' | 'DARK';
  sectionOrder?: SectionOrderItem[];
}
```

## API Endpoints

### Get User Preferences

```
GET /v1/user-preferences
Authorization: Bearer <token>

Response 200:
{
  "id": "uuid",
  "userId": "uuid",
  "theme": "LIGHT",
  "sectionOrder": [
    { "type": "SKILLS", "order": 0, "visible": true },
    { "type": "EXPERIENCE", "order": 1, "visible": true },
    { "type": "PROJECT", "order": 2, "visible": true },
    { "type": "EDUCATION", "order": 3, "visible": true },
    { "type": "CERTIFICATE", "order": 4, "visible": true }
  ],
  "createdAt": "2025-01-15T00:00:00Z",
  "updatedAt": "2025-01-15T00:00:00Z"
}
```

### Create or Update Preferences (Upsert)

```
POST /v1/user-preferences
Authorization: Bearer <token>
Content-Type: application/json

{
  "theme": "DARK",
  "sectionOrder": [
    { "type": "EXPERIENCE", "order": 0, "visible": true },
    { "type": "SKILLS", "order": 1, "visible": true },
    { "type": "EDUCATION", "order": 2, "visible": false }
  ]
}

Response 200: UserPreferences
```

### Update Preferences (Partial)

```
PUT /v1/user-preferences
Authorization: Bearer <token>
Content-Type: application/json

{
  "theme": "DARK"
}

Response 200: UserPreferences
```

### Delete Preferences

```
DELETE /v1/user-preferences
Authorization: Bearer <token>

Response 204: No Content
```

## Frontend Implementation

### Cookie Management

**Cookie Keys:**
- `user-theme`: Theme preference
- `user-section-order`: Section order array

**Cookie Lifecycle:**
- **Expiry**: 365 days
- **Path**: `/`
- **SameSite**: `lax`
- **Secure**: `true` (HTTPS only)

### Zustand Store

**State:**
```typescript
interface UserPreferencesState {
  preferences: UserPreferences | null;
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
}
```

**Actions:**
- `loadPreferences()`: Load from cookie or server
- `setTheme(theme)`: Update theme
- `setSectionOrder(order)`: Update section order
- `updatePreferences(dto)`: Partial update
- `clearPreferences()`: Clear on logout

### Load Strategy

**Priority Order:**
1. **Check cookies** - If both theme and sectionOrder exist in cookies, use them immediately
2. **Fetch from server** - If cookies missing, fetch from server and cache in cookies
3. **Create defaults** - If server returns no data, create default preferences

### Update Strategy

**Optimistic Updates:**
1. Update cookie immediately (instant UI feedback)
2. Update local state
3. Sync with server in background
4. If server fails, show error but keep local changes

## UI Components

### ThemeToggle

**Location**: Settings page, Navbar

**Features:**
- Toggle switch (Light ↔ Dark)
- Instant visual feedback
- Cookie-backed persistence

**Design:**
```tsx
<button className="toggle-switch">
  <span className={darkMode ? 'translate-x-7' : 'translate-x-1'} />
</button>
```

### SectionOrderManager

**Location**: Settings page

**Features:**
- Drag-and-drop reordering (with arrow buttons)
- Visibility toggles (checkboxes)
- Save button for batch updates

**Section Labels:**
- `SKILLS`: 기술 스택
- `EXPERIENCE`: 경력
- `PROJECT`: 프로젝트
- `EDUCATION`: 학력
- `CERTIFICATE`: 자격증

## Business Rules

### Theme Preference

1. **Default**: LIGHT
2. **Options**: LIGHT, DARK
3. **Scope**: Global (affects entire app)
4. **Persistence**: Cookie + Database

### Section Order

1. **Default Order**:
   - SKILLS (0, visible)
   - EXPERIENCE (1, visible)
   - PROJECT (2, visible)
   - EDUCATION (3, visible)
   - CERTIFICATE (4, visible)

2. **Constraints**:
   - All 5 sections must be present
   - Order values must be unique and sequential (0-4)
   - Visibility can be toggled independently

3. **Scope**: Affects home page only

### Cookie Policy

1. **When to use cookies**:
   - User not logged in: Cookies only (no server)
   - User logged in: Cookies + Server sync

2. **Cookie expiry**: 365 days (1 year)

3. **Cookie clearing**:
   - On logout: Clear all preference cookies
   - Manual: Delete via browser

## Security Considerations

### Authentication

- All API endpoints require JWT authentication
- User can only access their own preferences

### Cookie Security

- `SameSite=lax`: CSRF protection
- `Secure=true`: HTTPS only
- `HttpOnly=false`: Client-side access required

### Data Validation

- Theme enum validation
- Section order array validation
- Type checking on all inputs

## Performance Optimization

### Cookie-First Strategy

**Benefits:**
- No server call if cookies exist
- Instant page load
- Reduced API traffic

**Metrics:**
- First load: ~500ms (with server call)
- Subsequent loads: ~50ms (cookies only)
- Network savings: ~90% reduction

### Background Sync

- Updates happen asynchronously
- User doesn't wait for server response
- Error recovery without blocking UI

## Testing Requirements

### Unit Tests

- Cookie utilities (get, set, delete, JSON parsing)
- Store actions (load, update, clear)
- API client methods

### Integration Tests

- Load preferences flow
- Update preferences flow
- Cookie-server sync
- Error handling

### E2E Tests

- User changes theme → UI updates → Cookie saved → Server synced
- User reorders sections → Saves → Reloads page → Order persists
- Logout → Cookies cleared

## Future Enhancements

### Planned Features

1. **Additional Preferences**:
   - Language preference
   - Font size
   - Accessibility settings

2. **Advanced Section Management**:
   - Custom sections
   - Section groups
   - Conditional visibility rules

3. **Sync Across Devices**:
   - Real-time sync
   - Conflict resolution
   - Last-write-wins strategy

## Change Log

- **2025-01-15**: Initial implementation
  - Theme toggle (Light/Dark)
  - Section order management
  - Cookie-first caching strategy
  - Settings page UI
  - Zustand store integration

## References

- **Database Schema**: `services/personal-service/prisma/schema.prisma`
- **API Documentation**: `services/personal-service/src/user-preferences/`
- **Frontend Store**: `apps/web-main/src/stores/userPreferencesStore.ts`
- **Settings Page**: `apps/web-main/src/pages/settings/SettingsPage.tsx`

# User Preferences

> Cookie-first preferences for theme and section order | **Last Updated**: 2026-01-11

## API Endpoints

| Method | Path                   | Purpose         |
| ------ | ---------------------- | --------------- |
| GET    | `/v1/user-preferences` | Get preferences |
| POST   | `/v1/user-preferences` | Upsert          |
| DELETE | `/v1/user-preferences` | Reset           |

## Data Structure

```typescript
interface UserPreferences {
  theme: 'LIGHT' | 'DARK';
  sectionOrder: { type: string; order: number; visible: boolean }[];
}
```

## Cookie-First Strategy

```
Load:  Cookie → Server → Defaults
Update: Cookie (instant) → State → Server (background)
```

## Usage

```typescript
const { preferences, setTheme, setSectionOrder } = useUserPreferencesStore();
await setTheme('DARK');
```

## Cookie Keys

| Key                  | Purpose            |
| -------------------- | ------------------ |
| `user-theme`         | Theme preference   |
| `user-section-order` | Section order JSON |

**SSOT**: `docs/llm/user-preferences.md`

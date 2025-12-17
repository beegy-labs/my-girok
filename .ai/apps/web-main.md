# Web Main App

> Public-facing web application for My-Girok

## Tech Stack

- **Framework**: React 19.2 + Vite 7.2
- **Router**: React Router v7
- **Language**: TypeScript 5.9
- **Styling**: Tailwind CSS 4.1 (Vite plugin)
- **State**: Zustand 5.0
- **API**: Axios 1.13
- **Testing**: Vitest 4.0 + Playwright 1.57

## Structure

```
apps/web-main/src/
├── pages/              # Route pages
│   ├── HomePage.tsx
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── ChangePasswordPage.tsx
│   ├── NotFoundPage.tsx
│   └── resume/
│       ├── MyResumePage.tsx      # Resume management (/resume/my)
│       ├── PublicResumePage.tsx  # Public view (/resume/:username)
│       ├── ResumeEditPage.tsx    # Editor (/resume/edit, /resume/edit/:resumeId)
│       ├── ResumePreviewPage.tsx # Preview (/resume/preview/:resumeId)
│       └── SharedResumePage.tsx  # Shared view (/shared/:token)
├── components/
│   ├── Navbar.tsx
│   ├── PrivateRoute.tsx
│   └── resume/
│       ├── ResumeForm.tsx
│       ├── ResumePreview.tsx
│       └── ResumePreviewContainer.tsx  # Shared preview wrapper
├── api/                # API clients
│   ├── auth.ts
│   └── resume.ts
├── stores/             # Zustand stores
│   └── authStore.ts
├── router.tsx          # Router config (createBrowserRouter)
└── App.tsx             # Root component
```

## Key Routes

### Public Routes
- `/` - HomePage (dashboard for logged-in, landing for visitors)
- `/login` - LoginPage
- `/register` - RegisterPage
- `/resume/:username` - PublicResumePage (public resume view)
- `/shared/:token` - SharedResumePage (shared resume via token)

### Protected Routes (PrivateRoute)
- `/change-password` - ChangePasswordPage
- `/resume/my` - MyResumePage (resume management dashboard)
- `/resume/edit` - ResumeEditPage (create new resume)
- `/resume/edit/:resumeId` - ResumeEditPage (edit existing resume)
- `/resume/preview/:resumeId` - ResumePreviewPage (print preview)

## Resume Feature

### MyResumePage (`/resume/my`)
**Purpose**: Resume management dashboard

**Features**:
- List all user's resumes
- Create new resume
- Edit/preview/delete resumes
- Share with time-limited links
- View share statistics

**APIs Used**:
```typescript
getAllResumes()           // Get user's resume list
getMyShareLinks()         // Get share links
createResumeShare()       // Create share link
deleteShareLink()         // Delete share link
deleteResume()            // Delete resume
```

### PublicResumePage (`/resume/:username`)
**Purpose**: Public resume view (no auth required)

**Features**:
- View user's default resume
- Edit button (if own profile)
- Print button

**APIs Used**:
```typescript
getUserResume(username)   // Get public resume by username
```

### ResumeEditPage (`/resume/edit` or `/resume/edit/:resumeId`)
**Purpose**: Create/edit resume (auth required)

**Features**:
- Full resume editor with live preview
- Save/update resume
- Navigate to preview on save
- Auto-save draft to localStorage

**APIs Used**:
```typescript
getResume(resumeId)       // Load existing resume by ID
createResume(dto)         // Create new resume
updateResume(id, dto)     // Update existing resume
```

## API Client Pattern

```typescript
// api/resume.ts
import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const PERSONAL_API_URL = import.meta.env.VITE_PERSONAL_API_URL;

export const personalApi = axios.create({
  baseURL: PERSONAL_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: Add JWT token
personalApi.interceptors.request.use(async (config) => {
  // Skip auth for public endpoints
  const isPublicEndpoint = config.url?.includes('/share/public/') ||
                           config.url?.includes('/resume/public/');

  if (isPublicEndpoint) {
    return config; // No Authorization header
  }

  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

// Response interceptor: Handle 401 and refresh token
personalApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Enhanced error logging for mobile debugging
    if (!error.response) {
      console.error('[API Error] Network or CORS error:', {
        message: error.message,
        url: error.config?.url,
        userAgent: navigator.userAgent, // iOS Safari debugging
      });
    }

    // Handle 401 with token refresh
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;

      try {
        const { refreshToken } = useAuthStore.getState();
        const response = await axios.post(`${API_URL}/v1/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data;
        useAuthStore.getState().updateTokens(accessToken, newRefreshToken);

        error.config.headers.Authorization = `Bearer ${accessToken}`;
        return personalApi(error.config);
      } catch (refreshError) {
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export const getDefaultResume = async (): Promise<Resume> => {
  const response = await personalApi.get('/v1/resume/default');
  return response.data;
};
```

**Key Points**:
- Skip `Authorization` header for public endpoints (iOS Safari compatibility)
- Enhanced error logging includes `userAgent` for mobile debugging
- Auto-retry with token refresh on 401 errors
- Network errors logged separately (helps debug CORS issues)

## Auth Pattern

### API Clients (IMPORTANT)

**Two axios instances with different behaviors**:

```typescript
// api/auth.ts

// 1. publicApi - For unauthenticated requests (login, register, logout)
//    NO 401 interceptor - errors propagate directly to caller
export const publicApi = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// 2. authApi - For authenticated requests (getCurrentUser, changePassword)
//    HAS 401 interceptor - auto-refresh token on 401
export const authApi = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});
```

**Why separate clients?**

| Function | API Client | Reason |
|----------|-----------|--------|
| `login()` | `publicApi` | 401 = invalid credentials, show error to user |
| `register()` | `publicApi` | 401 = validation error, show error to user |
| `logout()` | `publicApi` | If token invalid, just clear local state |
| `getCurrentUser()` | `authApi` | 401 = token expired, try refresh |
| `changePassword()` | `authApi` | 401 = token expired, try refresh |

**Problem this solves**:
Without `publicApi`, login failure (401) would trigger:
1. Token refresh attempt (no token exists)
2. Refresh fails → `window.location.href = '/login'`
3. Page reloads, error message lost

### Token Storage
- **Access Token**: localStorage
- **Refresh Token**: HttpOnly cookie (set by BFF)

### Auth Store (Zustand)
```typescript
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
}
```

### PrivateRoute
```typescript
// Redirects to /login if not authenticated
<PrivateRoute>
  <MyResumePage />
</PrivateRoute>
```

## UI Component Library

**Location**: `packages/ui-components/src/`

### Available Components

**Form Components**:
```typescript
import { Button, TextInput, SelectInput, TextArea, FileUpload } from '@my-girok/ui-components';

// TextInput - Single-line text input
<TextInput
  label="Email"
  value={email}
  onChange={setEmail} // Direct value handler
  type="email"
/>

// SelectInput - Dropdown
<SelectInput
  label="Country"
  value={country}
  onChange={setCountry} // Direct value handler
  options={[{ value: 'kr', label: '한국' }]}
/>

// TextArea - Multi-line text
<TextArea
  label="Description"
  value={description}
  onChange={setDescription} // Direct value handler
  rows={4}
/>
```

**Button Component**:
```typescript
import { Button } from '@my-girok/ui-components';

// Primary Button - Main actions
<Button variant="primary" onClick={handleSubmit} disabled={loading}>
  Save Changes
</Button>

// Secondary Button - Secondary actions
<Button variant="secondary" onClick={handleCancel}>
  Cancel
</Button>

// Danger Button - Delete/remove actions
<Button variant="danger" onClick={handleDelete}>
  Delete Resume
</Button>

// Button sizes
<Button size="sm">Small</Button>
<Button>Default</Button>
<Button size="lg">Large</Button>
```

**Layout & Feedback**:
```typescript
import { Card, Alert, LoadingSpinner } from '@my-girok/ui-components';

// Card - Content container
<Card variant="primary">
  <h2>Card Title</h2>
</Card>

// Alert - Status messages
<Alert variant="success">Resume saved successfully!</Alert>

// LoadingSpinner - Loading states
<LoadingSpinner fullScreen />
```

### Component Structure

```
packages/ui-components/src/components/
├── Alert.tsx
├── Button.tsx
├── Card.tsx
├── CollapsibleSection.tsx
├── index.ts
├── PageContainer.tsx
├── PageHeader.tsx
├── SectionHeader.tsx
├── SelectInput.tsx
├── SortableItem.tsx
├── SortableList.tsx
└── TextInput.tsx
```

### Usage Guidelines

**Import Pattern**:
```typescript
// ✅ DO - Use barrel imports from the package
import { Button, Card, TextInput } from '@my-girok/ui-components';

// ❌ DON'T - Use relative paths or old paths
import Card from '../../components/ui/Layout/Card';
```

**Theme Support**:
- All components use semantic theme tokens (`theme-*`) and automatically adapt to light/dark mode.
- See `/docs/DESIGN_SYSTEM.md` for full design guidelines.

## Design System

**Color Theme**: "Wood Library" (Vintage) + "Moonlit Library" (Dark)

### Scalable Theme Architecture (2025-12)

The theme system uses a 3-layer architecture for easy extensibility:

```
Layer 1: Palette (--palette-*) → Raw colors, never use directly
Layer 2: Semantic (--theme-*)  → Theme-switchable via [data-theme]
Layer 3: Tailwind (@theme)     → Maps to utilities (bg-theme-*, text-theme-*)
```

**Adding a New Theme**:
```css
/* index.css - Only modify this file */
[data-theme="ocean"] {
  --theme-bg-page: #0a192f;
  --theme-text-primary: #ccd6f6;
  /* ... semantic tokens ... */
}
```

**Usage in Components**:
```tsx
// Use semantic theme classes (auto-adapts to theme)
<div className="bg-theme-bg-card text-theme-text-primary">
```

**Note**: The legacy dual-class pattern (`vintage-* dark:dark-*`) has been removed.
All components now use unified `theme-*` tokens.

### Key Classes

| Token | Usage |
|-------|-------|
| `bg-theme-bg-page` | Page background |
| `bg-theme-bg-card` | Card backgrounds |
| `bg-theme-bg-elevated` | Elevated surfaces |
| `bg-theme-bg-input` | Form input backgrounds |
| `text-theme-text-primary` | Primary text |
| `text-theme-text-secondary` | Secondary text |
| `text-theme-text-tertiary` | Muted text |
| `border-theme-border-subtle` | Subtle borders |
| `border-theme-border-default` | Default borders |

### Shadow Classes

| Token | Usage |
|-------|-------|
| `shadow-theme-sm` | Small shadows (inputs) |
| `shadow-theme-md` | Medium shadows (cards) |
| `shadow-theme-lg` | Large shadows (modals) |
| `shadow-theme-xl` | Extra large shadows |
| `shadow-theme-2xl` | 2X large shadows |
| `shadow-theme-glow` | Glowing accent effect |

### Theme Context & Hook

```typescript
import { useTheme } from '../contexts/ThemeContext';

// Theme types
type Theme = 'light' | 'dark' | 'system';
type ThemeName = 'vintage' | 'dark';  // Maps to data-theme attribute

// useTheme() hook
const {
  theme,           // User preference: 'light' | 'dark' | 'system'
  effectiveTheme,  // Computed: 'light' | 'dark'
  themeName,       // CSS attribute: 'vintage' | 'dark'
  setTheme,        // Set theme preference
  toggleTheme      // Toggle between light/dark
} = useTheme();
```

**Theme Storage**: Cookie-based (`user-theme`) for SSR compatibility.

**See**:
- **Component Library** (above) - Ready-to-use UI components
- `/docs/DESIGN_SYSTEM.md` - Full design guidelines
- `apps/web-main/src/index.css` - Theme variable definitions

## Environment Variables

```bash
VITE_GRAPHQL_URL=https://api.girok.dev/graphql
VITE_WS_URL=wss://ws.girok.dev
VITE_AUTH_API_URL=https://api.girok.dev  # REST fallback for auth
```

## Common Patterns

### Page Loading State
```typescript
if (loading) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-700" />
    </div>
  );
}
```

### Error Handling
```typescript
const [error, setError] = useState<string | null>(null);

// Display error
{error && (
  <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
    {error}
  </div>
)}
```

### Navigation
```typescript
const navigate = useNavigate();
const { user } = useAuthStore();

navigate(`/resume/${user?.username}/edit`);
```

## Testing

- **Unit**: Component tests with Vitest + React Testing Library
- **E2E**: Playwright for critical flows
- **Coverage**: 80% minimum

## Build & Deploy

```bash
# Development
pnpm dev

# Build
pnpm build

# Preview
pnpm preview
```

**Deploy**: Docker container to Kubernetes

## Resume PDF & Preview (Updated 2025-12)

### Architecture
Resume preview and PDF export use **@react-pdf/renderer** + **react-pdf**:

```
ResumePdfDocument.tsx    → @react-pdf/renderer (generates PDF)
        ↓
ResumePreview.tsx        → react-pdf (displays PDF in canvas)
        ↓
ResumePreviewContainer   → Responsive wrapper with scale
```

**Key Files**:
- `ResumePdfDocument.tsx` - PDF document using @react-pdf/renderer components
- `ResumePreview.tsx` - PDF viewer using react-pdf
- `ResumePreviewContainer.tsx` - Responsive container with auto-scale
- `utils/pdf.ts` - PDF export utilities

**Benefits**:
- True vector PDF (not image-based)
- No CSS transform clipping issues
- Consistent output across all devices
- Multilingual support (Korean, English, Japanese)
- CJK font support (Pretendard with italic fallback)

**Important - Empty Value Filtering**:
Both `ResumePdfDocument.tsx` and `ResumeContent.tsx` must filter empty values before rendering arrays to prevent crashes:

```typescript
// ❌ DON'T - Renders empty items, can crash PDF renderer
{items.map((item) => <Text>{item}</Text>)}

// ✅ DO - Filter empty values first
{items.filter((item) => item?.trim()).map((item) => <Text>{item}</Text>)}

// For objects with name property
{items.filter((item) => typeof item === 'string' ? item?.trim() : item?.name?.trim()).map(...)}
```

**Affected Fields**:
- `keyAchievements` - string[]
- `project.achievements` - string[]
- `skill.items` - string[] | SkillItem[]
- `HierarchicalDescription.items` - objects with `content` property

### PDF i18n Support (Updated 2025-12)

ResumePdfDocument supports multilingual PDF generation:

```typescript
import ResumePdfDocument, { PdfLocale } from './ResumePdfDocument';

// Supported locales
type PdfLocale = 'ko' | 'en' | 'ja';

// Usage with locale
<ResumePdfDocument
  resume={resume}
  paperSize="A4"
  locale="en"  // Korean (default), English, or Japanese
/>
```

**Locale-specific translations include**:
- Section titles (Skills, Experience, Education, etc.)
- Labels (Email, Phone, Present, Ongoing)
- Duration format (1년 2개월 / 1 yrs 2 mos / 1年2ヶ月)
- Degree types and gender labels

### PDF Export

```typescript
import { exportResumeToPDF } from '../../utils/pdf';

// Download PDF
await exportResumeToPDF(resume, {
  paperSize: 'A4',
  fileName: 'resume.pdf',
});

// Generate blob (for upload)
import { generateResumePDFBlob } from '../../utils/pdf';
const blob = await generateResumePDFBlob(resume, { paperSize: 'A4' });
```

### ResumePreviewContainer Component

**Purpose**: Shared wrapper component for all resume preview displays.

**Location**: `apps/web-main/src/components/resume/ResumePreviewContainer.tsx`

**Responsive Design Policy (Updated 2025-12)**:
- **Full responsive scaling**: Automatically scales PDF to fit container width
- **No minimum scale**: Allows complete fit on all screen sizes (mobile ~47%, tablet ~93%, desktop 100%)
- **No horizontal overflow**: PDF never clips or requires horizontal scrolling
- **Pinch-to-zoom**: Mobile users can zoom in for details
- **PDF quality preserved**: Export always generates full-resolution vector PDF regardless of display scale

**Features**:
- Auto-scales based on container width (never scales up beyond 100%)
- Optional maxHeight with overflow scrolling
- Responsive padding (mobile vs desktop)
- Dark mode support

**Props**:
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `resume` | `Resume` | required | Resume data to display |
| `paperSize` | `PaperSizeKey` | `'A4'` | Paper size |
| `scale` | `number` | auto | Fixed scale (overrides auto-scale) |
| `maxHeight` | `string` | - | Max container height with vertical scroll |
| `showToolbar` | `boolean` | `true` | Show toolbar in ResumePreview |

**Usage Examples**:

```typescript
// Standard usage - full responsive scaling (recommended)
<ResumePreviewContainer resume={resume} />

// Live Preview with max height
<ResumePreviewContainer
  resume={previewData}
  maxHeight="calc(100vh - 200px)"
/>

// Fixed scale for specific use cases
<ResumePreviewContainer
  resume={resume}
  scale={0.75}
/>
```

**Used In**:
- `ResumeEditPage` - Live preview
- `ResumePreviewPage` - Full preview
- `SharedResumePage` - Public shared resume view
- `PublicResumePage` - Public profile resume view

### High-Quality Rendering (Updated 2025-12)

**devicePixelRatio Support**:
All devices get consistent high-quality PDF rendering via `devicePixelRatio` prop:

```typescript
// In ResumePreview.tsx
// Cap at 2 to balance quality and performance
const devicePixelRatio = Math.min(2, window.devicePixelRatio || 1);

<Page
  pageNumber={currentPage}
  width={displayWidth}
  devicePixelRatio={devicePixelRatio}  // High-DPI support
/>
```

**Why cap at 2?**
- iPhone has 3x DPI - rendering at 3x causes memory issues
- 2x provides excellent quality on Retina/4K displays
- Performance remains stable on mobile devices

### Preview Scale

react-pdf handles scaling via the `width` prop on `<Page>`:

```typescript
// In ResumePreview.tsx
const displayWidth = paper.width.px * scale;

<Page
  pageNumber={currentPage}
  width={displayWidth}  // Scales the PDF page
/>
```

### Container Setup

Standard page layout for resume preview pages:

```tsx
// Page container - no overflow-x-hidden needed
<div className="w-full min-h-screen">
  <ResumeActionBar resume={resume} mode="owner" />
  <div className="py-4 sm:py-6 md:py-8 print:py-0">
    <ResumePreviewContainer resume={resume} />
  </div>
</div>
```

### Scale Values by Device (Updated 2025-12)
| Device | Viewport | Scale | Notes |
|--------|----------|-------|-------|
| Mobile | 375px | ~47% | Full fit, pinch-to-zoom for details |
| Tablet | 768px | ~93% | Near full size |
| Desktop | 1024px+ | 100% | Full size |

**Design Decision**: Prioritize no-overflow over minimum readability scale. Users on mobile can pinch-to-zoom for details, which is the expected mobile UX pattern.

## Mobile Design Consistency Standards

### Core Design Tokens (MUST USE)

All resume edit components MUST use these consistent values from `src/styles/design-tokens.ts`:

| Element | Mobile | Tablet (sm:) | Desktop (lg:) |
|---------|--------|--------------|---------------|
| Card padding | `p-3` | `sm:p-4` | `lg:p-6` |
| Section gap | `space-y-3` | `sm:space-y-4` | `lg:space-y-6` |
| Form field gap | `space-y-3` | `sm:space-y-4` | - |
| Border radius | `rounded-xl` | `sm:rounded-2xl` | - |
| Section title | `text-base font-bold` | `sm:text-lg` | `lg:text-xl` |
| Label | `text-xs font-semibold` | `sm:text-sm` | - |
| Body text | `text-xs` | `sm:text-sm` | - |

### Button Size Standards

| Size | Padding | Font | Use Case |
|------|---------|------|----------|
| xs | `py-1.5 px-2` | `text-xs` | Inline actions, nested items |
| sm | `py-2 px-3` | `text-xs sm:text-sm` | Default buttons |
| md | `py-2.5 px-4` | `text-sm sm:text-base` | Primary actions |

### Usage Example

```tsx
// ❌ DON'T: Inconsistent inline styles
<div className="p-4 sm:p-6 lg:p-8 rounded-2xl">
  <h2 className="text-lg font-bold">Title</h2>
</div>

// ✅ DO: Use design tokens
import { spacing, typography, radius } from '../../styles/design-tokens';

<div className={`${spacing.card.all} ${radius.lg}`}>
  <h2 className={typography.sectionTitle.all}>Title</h2>
</div>
```

### Responsive Pattern Checklist

- [ ] Use mobile-first: default → `sm:` → `lg:`
- [ ] Card padding: `p-3 sm:p-4 lg:p-6`
- [ ] Section titles: `text-base sm:text-lg lg:text-xl font-bold`
- [ ] Body text: `text-xs sm:text-sm`
- [ ] Button touch target: min 44x44px (use `py-2.5 px-4` or larger)
- [ ] Border radius: `rounded-xl sm:rounded-2xl`
- [ ] Import design tokens instead of hardcoding

## Mobile Edit Patterns (Resume)

### TouchSensor for Drag-and-Drop

Mobile drag-and-drop requires TouchSensor with activation constraints:

```typescript
import { TouchSensor, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
);
```

**Key Settings**:
- `distance: 8` - Prevents accidental drag on pointer devices
- `delay: 200` - 200ms hold before drag starts on touch
- `tolerance: 5` - 5px movement allowed during delay

### Depth Colors for Hierarchical Data

Use color-coded borders for nested items (achievements, descriptions).

**Note**: These use `dark:` variant intentionally - semantic colors (blue, green, etc.)
are not part of the theme system and need explicit dark mode handling.

```typescript
const DEPTH_COLORS = {
  1: { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-l-blue-500' },
  2: { bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-l-green-500' },
  3: { bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-l-purple-500' },
  4: { bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-l-orange-500' },
} as const;

// Usage
const depthColor = DEPTH_COLORS[depth as keyof typeof DEPTH_COLORS] || DEPTH_COLORS[4];
<div className={`${depthColor.bg} border-l-4 ${depthColor.border}`}>
```

### Collapsible Cards on Mobile

Cards should be collapsible on mobile with summary when collapsed:

```typescript
const [isExpanded, setIsExpanded] = useState(true);

// Header - clickable on mobile
<button onClick={() => setIsExpanded(!isExpanded)} className="sm:cursor-default">
  <h3>{title}</h3>
  {/* Summary shown when collapsed on mobile */}
  {!isExpanded && <p className="sm:hidden">{summary}</p>}
  {/* Chevron icon - mobile only */}
  <ChevronIcon className={`sm:hidden ${isExpanded ? 'rotate-180' : ''}`} />
</button>

// Content - collapsible on mobile, always visible on desktop
<div className={`${isExpanded ? 'block' : 'hidden'} sm:block`}>
  {/* Card content */}
</div>
```

### Inline Action Buttons on Mobile

Use compact 24x24px icon buttons on mobile:

```jsx
{/* Desktop: text buttons */}
<div className="hidden sm:flex gap-2">
  <button className="px-2 py-1 text-xs">+ Add</button>
  <button className="px-2 py-1 text-xs">Remove</button>
</div>

{/* Mobile: icon buttons */}
<div className="sm:hidden flex gap-0.5">
  <button className="w-6 h-6 flex items-center justify-center text-[10px] touch-manipulation">+</button>
  <button className="w-6 h-6 flex items-center justify-center text-[10px] touch-manipulation">✕</button>
</div>
```

### Fixed Bottom Navigation Bar

For mobile preview toggle and navigation:

```jsx
<div className="fixed bottom-0 left-0 right-0 z-50 bg-theme-bg-card
                border-t border-theme-border-subtle p-3 lg:hidden safe-area-bottom">
  <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
    <SecondaryButton className="flex-1 py-3">← Back</SecondaryButton>
    <PrimaryButton className="flex-1 py-3">👁️ Preview</PrimaryButton>
  </div>
</div>
```

## ESLint Configuration (Updated 2025-12)

### react-hooks Plugin
The project uses `eslint-plugin-react-hooks` for proper React Hooks linting:

```javascript
// eslint.config.mjs
import pluginReactHooks from 'eslint-plugin-react-hooks';

plugins: {
  'react-hooks': pluginReactHooks,
},
rules: {
  'react-hooks/rules-of-hooks': 'error',
  'react-hooks/exhaustive-deps': 'warn',
},
```

### useCallback Pattern for useEffect Dependencies

Per project policy, **NEVER** use `eslint-disable` for `react-hooks/exhaustive-deps`. Instead, properly memoize functions:

```typescript
// ❌ DON'T - eslint-disable
useEffect(() => {
  loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

// ✅ DO - Memoize with useCallback
const loadData = useCallback(async () => {
  // ... implementation
}, [dependency1, dependency2]);

useEffect(() => {
  loadData();
}, [loadData]);
```

### Unused Variables Pattern

Prefix unused variables with underscore to satisfy ESLint:

```typescript
// ❌ DON'T
} catch (err) {
  setError('Something went wrong');
}

// ✅ DO
} catch (_err) {
  setError('Something went wrong');
}

// ✅ DO - Destructuring unused properties
const { projects: _projects, ...dataToSubmit } = formData;
```

## References

- **Design System**: `/docs/DESIGN_SYSTEM.md`
- **Resume Policy**: `/docs/policies/RESUME.md`
- **API Docs**: Personal Service API

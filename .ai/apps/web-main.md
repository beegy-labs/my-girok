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

**Location**: `apps/web-main/src/components/ui/`

### Available Components (10 Total)

**Form Components (4)**:
```typescript
import { TextInput, Select, TextArea, FileUpload } from '../../components/ui';

// TextInput - Single-line text input
<TextInput
  label="Email"
  value={email}
  onChange={(value) => setEmail(value)}
  type="email"
  placeholder="your@email.com"
  required
  error={errors.email}
  hint="We'll never share your email"
/>

// Select - Dropdown
<Select
  label="Country"
  value={country}
  onChange={(value) => setCountry(value)}
  options={[
    { value: 'kr', label: '한국' },
    { value: 'us', label: 'United States' },
  ]}
  required
/>

// TextArea - Multi-line text
<TextArea
  label="Description"
  value={description}
  onChange={(value) => setDescription(value)}
  rows={4}
  maxLength={500}
/>

// FileUpload - Drag-and-drop file upload
<FileUpload
  label="Profile Photo"
  accept="image/*"
  maxSize={5 * 1024 * 1024} // 5MB
  onUpload={(file) => handleUpload(file)}
/>
```

**Button Components (3)**:
```typescript
import { PrimaryButton, SecondaryButton, DestructiveButton } from '../../components/ui';

// PrimaryButton - Main actions
<PrimaryButton onClick={handleSubmit} disabled={loading}>
  Save Changes
</PrimaryButton>

// SecondaryButton - Secondary actions
<SecondaryButton onClick={handleCancel}>
  Cancel
</SecondaryButton>

// DestructiveButton - Delete/remove actions
<DestructiveButton onClick={handleDelete}>
  Delete Resume
</DestructiveButton>

// Button sizes
<PrimaryButton size="sm">Small</PrimaryButton>
<PrimaryButton>Default</PrimaryButton>
<PrimaryButton size="lg">Large</PrimaryButton>
```

**Layout & Feedback (3)**:
```typescript
import { Card, Alert, LoadingSpinner } from '../../components/ui';

// Card - Content container
<Card variant="primary">
  <h2>Card Title</h2>
  <p>Card content...</p>
</Card>

// Alert - Status messages
<Alert type="success">Resume saved successfully!</Alert>
<Alert type="error">Failed to save resume</Alert>

// LoadingSpinner - Loading states
<LoadingSpinner />
<LoadingSpinner fullScreen message="Loading resume..." />
```

### Component Structure

```
apps/web-main/src/components/ui/
├── index.ts              # Barrel exports
├── Form/
│   ├── TextInput.tsx
│   ├── Select.tsx
│   ├── TextArea.tsx
│   └── FileUpload.tsx
├── Button/
│   ├── PrimaryButton.tsx
│   ├── SecondaryButton.tsx
│   └── DestructiveButton.tsx
└── Layout/
    ├── Card.tsx
    ├── Alert.tsx
    └── LoadingSpinner.tsx
```

### Usage Guidelines

**Import Pattern**:
```typescript
// ✅ DO - Use barrel imports
import { TextInput, PrimaryButton, Card } from '../../components/ui';

// ❌ DON'T - Direct imports
import TextInput from '../../components/ui/Form/TextInput';
```

**Common Props**:
- All form inputs: `value`, `onChange`, `error`, `hint`, `disabled`, `required`
- All buttons: `onClick`, `disabled`, `size`, `className`
- Consistent API across components

**Dark Mode**:
- All components have built-in dark mode support
- Use `dark:` Tailwind variants
- Automatically adapts to system/user preference

## Design System

**Color Theme**: Library/book theme with amber colors

**Key Classes**:
- Cards: `bg-amber-50/30 border-amber-100 rounded-2xl`
- Primary Button: `bg-gradient-to-r from-amber-700 to-amber-600`
- Secondary Button: `bg-gray-100 text-gray-700 border-gray-300`

**See**:
- **Component Library** (above) - Ready-to-use UI components
- `/docs/DESIGN_SYSTEM.md` - Full design guidelines

## Environment Variables

```bash
VITE_WEB_BFF_URL=https://web-bff.mygirok.dev
VITE_PERSONAL_API_URL=https://personal.mygirok.dev
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

Use color-coded borders for nested items (achievements, descriptions):

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
<div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-dark-bg-card
                border-t border-gray-200 p-3 lg:hidden safe-area-bottom">
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

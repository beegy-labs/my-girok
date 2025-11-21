# Web Main App

> Public-facing web application for My-Girok

## Tech Stack

- **Framework**: React 19.2 + Vite 7.2
- **Router**: React Router v6
- **Language**: TypeScript 5.7
- **Styling**: Tailwind CSS 3.4
- **State**: Zustand 5.0
- **API**: Axios 1.7
- **Testing**: Vitest 2.1 + Playwright 1.56

## Structure

```
apps/web-main/src/
├── pages/              # Route pages
│   ├── HomePage.tsx
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   └── resume/
│       ├── MyResumePage.tsx      # Resume management (/resume/my)
│       ├── PublicResumePage.tsx  # Public view (/resume/:username)
│       ├── ResumeEditPage.tsx    # Editor (/resume/:username/edit)
│       └── ResumePreviewPage.tsx # Preview (/resume/:username/preview)
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
└── App.tsx             # Router config
```

## Key Routes

### Public Routes
- `/` - HomePage (dashboard for logged-in, landing for visitors)
- `/login` - LoginPage
- `/register` - RegisterPage
- `/resume/:username` - PublicResumePage (public resume view)

### Protected Routes (PrivateRoute)
- `/resume/my` - MyResumePage (resume management dashboard)
- `/resume/:username/edit` - ResumeEditPage (create/edit)
- `/resume/:username/preview` - ResumePreviewPage (print preview)

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

### ResumeEditPage (`/resume/:username/edit`)
**Purpose**: Create/edit resume (auth required)

**Features**:
- Full resume editor
- Save/update resume
- Navigate to preview

**APIs Used**:
```typescript
getDefaultResume()        // Load existing
createResume(dto)         // Create new
updateResume(id, dto)     // Update existing
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

## Resume Print & Preview

### Print Margins (Updated 2025-01-19)
**Problem**: Content was being clipped at page edges due to insufficient margins.

**Solution**: Updated print margins from 1.2-1.5cm to **2cm** on all sides (top, bottom, left, right).

**Files Modified**:
- `apps/web-main/src/print.css` - Set `@page { size: A4; margin: 0; }`
- `apps/web-main/src/styles/resume-print.css` - Increased padding to 2cm

**Page Boundaries**:
- A4: Content area is 25.7cm (29.7cm - 4cm padding)
- Letter: Content area is 23.94cm (27.94cm - 4cm padding)
- Visual page boundaries shown with gray separator lines in paginated view

### ResumePreviewContainer Component (Added 2025-01-19)
**Purpose**: Shared wrapper component for all resume preview displays.

**Location**: `apps/web-main/src/components/resume/ResumePreviewContainer.tsx`

**Features**:
- Customizable scale factor (for live preview)
- Optional maxHeight with overflow scrolling
- Responsive padding (mobile vs desktop)
- Horizontal scroll support (for mobile)
- Full dark mode support
- Flexible className overrides

**Usage Examples**:

```typescript
// Live Preview (75% scale)
<ResumePreviewContainer
  resume={previewData}
  scale={0.75}
  maxHeight="calc(100vh - 200px)"
  containerClassName="border-2 border-gray-300"
/>

// Full Preview (responsive)
<ResumePreviewContainer
  resume={resume}
  paperSize={paperSize}
  responsivePadding={true}
  enableHorizontalScroll={true}
/>

// Simple Preview
<ResumePreviewContainer resume={resume} />
```

**Used In**:
- `ResumeEditPage` - Live preview with 0.75 scale
- `ResumePreviewPage` - Full preview with responsive padding
- `SharedResumePage` - Public shared resume view
- `PublicResumePage` - Public profile resume view

**Benefits**:
- Eliminates code duplication across 4 pages
- Ensures consistent preview styling
- Single source of truth for preview wrapper logic
- Easier maintenance and updates

## References

- **Design System**: `/docs/DESIGN_SYSTEM.md`
- **Resume Policy**: `/docs/policies/RESUME.md`
- **API Docs**: Personal Service API

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
│       └── ResumePreview.tsx
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

## Design System

**Color Theme**: Library/book theme with amber colors

**Key Classes**:
- Cards: `bg-amber-50/30 border-amber-100 rounded-2xl`
- Primary Button: `bg-gradient-to-r from-amber-700 to-amber-600`
- Secondary Button: `bg-gray-100 text-gray-700 border-gray-300`

**See**: `/docs/DESIGN_SYSTEM.md` for full guidelines

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

## References

- **Design System**: `/docs/DESIGN_SYSTEM.md`
- **Resume Policy**: `/docs/policies/RESUME.md`
- **API Docs**: Personal Service API

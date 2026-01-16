# My-Girok Web Main Application

React 19.2 + Vite + TypeScript application for My-Girok main features (blog, finance tracker, resume).

## Features

- ✅ User Authentication (Registration & Login)
- ✅ JWT Token-based Authentication
- ✅ Automatic Token Refresh
- ✅ Role-based Access Control (GUEST, USER, MANAGER, MASTER)
- ✅ Blog functionality
- ✅ Finance tracker (planned)
- ✅ Resume builder (planned)
- ✅ Responsive UI with Tailwind CSS

## Tech Stack

- **React 19.2** - UI library
- **TypeScript 5.7** - Type safety
- **Vite 7.2** - Build tool
- **React Router v6** - Routing
- **Zustand** - State management
- **Axios** - HTTP client
- **Tailwind CSS 3.4** - Styling
- **Vitest** - Unit testing
- **Playwright** - E2E testing

## Getting Started

### Prerequisites

```bash
Node.js >= 22.x
pnpm >= 9.x
```

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env
```

### Development

```bash
# Start dev server (http://localhost:3000)
pnpm dev

# Make sure auth-service is running on http://localhost:3001
```

### Build

```bash
# Production build
pnpm build

# Preview production build
pnpm preview
```

### Testing

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e
```

## Pages

### Public Pages (No Auth Required)

- `/` - Home page
- `/login` - Login page
- `/register` - Registration page
- `/public` - Public content page

### Protected Pages (Auth Required)

- `/protected` - User-only protected page

## API Integration

The app connects to the auth-service backend:

- **Base URL**: `http://localhost:3001/api/v1`
- **Endpoints**:
  - `POST /auth/register` - User registration
  - `POST /auth/login` - User login
  - `POST /auth/logout` - User logout
  - `POST /auth/refresh` - Refresh access token
  - `GET /users/me` - Get current user

## Authentication Flow

1. User registers or logs in
2. Receives `accessToken` (15min) and `refreshToken` (7 days)
3. Tokens stored in localStorage via Zustand persist
4. Access token sent in `Authorization: Bearer <token>` header
5. Axios interceptor automatically refreshes token on 401
6. If refresh fails, user redirected to login

## Project Structure

```
src/
├── api/           # API client and auth functions
├── components/    # React components
│   ├── Navbar.tsx
│   └── PrivateRoute.tsx
├── pages/         # Page components
│   ├── HomePage.tsx
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── PublicPage.tsx
│   └── ProtectedPage.tsx
├── stores/        # Zustand state management
│   └── authStore.ts
├── App.tsx        # Main app component
├── main.tsx       # App entry point
└── index.css      # Global styles
```

## Environment Variables

```env
VITE_API_URL=http://localhost:3001
```

## Security

- ✅ JWT tokens with short expiration
- ✅ Automatic token refresh
- ✅ Protected routes with PrivateRoute component
- ✅ CORS enabled on backend
- ✅ Password validation (min 8 characters)
- ✅ HTTP-only cookies for refresh token (backend)

## Testing Strategy

### Unit Tests (Vitest)

- Component rendering
- State management (Zustand)
- API client functions

### E2E Tests (Playwright)

- Complete auth flow (register → login → protected page)
- Public page access (guest)
- Protected page redirect (unauthenticated)
- Logout flow

## Development Notes

- Vite proxy configured for `/api` → `http://localhost:3001`
- Hot module replacement (HMR) enabled
- TypeScript strict mode enabled
- Tailwind CSS with JIT mode
- ESLint configured for React + TypeScript

## Deployment

### CI/CD Pipeline

The application uses GitHub Actions for automated CI/CD:

1. **Build & Test** - Runs lint, type-check, and E2E tests
2. **Docker Build** - Builds and pushes image to Harbor registry
3. **GitOps Update** - Updates image tag in platform-gitops repository
4. **ArgoCD Sync** - Automatically triggers ArgoCD refresh and sync

### Environments

- **Development**: Auto-deployed on push to `develop` branch
- **Staging**: Auto-deployed on push to `release/*` branches
- **Production**: Auto-deployed on push to `main` branch

See Kubernetes Helm Chart documentation for infrastructure details.

# ArgoCD Integration Test - Fri Nov 21 12:28:21 PM UTC 2025

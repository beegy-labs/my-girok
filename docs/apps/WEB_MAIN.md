# Web Main Application Documentation

> Complete guide for the public-facing React web application

## Overview

The Web Main app is the primary user interface for My-Girok, featuring resume management, user authentication, and a sophisticated editorial design system.

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Routes](#routes)
4. [Design System](#design-system)
5. [Resume Feature](#resume-feature)
6. [Authentication](#authentication)
7. [Internationalization](#internationalization)
8. [Best Practices](#best-practices)
9. [Development Guide](#development-guide)

---

## Tech Stack

| Component  | Technology                     |
| ---------- | ------------------------------ |
| Framework  | React 19.2 + Vite 7.2          |
| Router     | React Router v7                |
| Language   | TypeScript 5.9                 |
| Styling    | Tailwind CSS 4.1 (Vite plugin) |
| State      | Zustand 5.0                    |
| API Client | Axios 1.13                     |
| Testing    | Vitest 4.0 + Playwright 1.57   |

---

## Project Structure

```
apps/web-main/src/
├── layouts/            # Layout components
│   ├── MainLayout.tsx         # Default layout with Navbar
│   ├── FullWidthLayout.tsx    # Full-width without max-width
│   ├── AuthLayout.tsx         # Auth pages (Login, Register)
│   └── LegalPageLayout.tsx    # Legal pages (Privacy, Terms)
├── pages/              # Route pages
│   ├── HomePage.tsx           # Landing + Dashboard
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── resume/
│   │   ├── MyResumePage.tsx      # Resume management
│   │   ├── ResumeEditPage.tsx    # Resume editor
│   │   └── ResumePreviewPage.tsx # Print preview
│   └── settings/
│       └── SettingsPage.tsx
├── components/
│   ├── Navbar.tsx
│   ├── Footer.tsx
│   ├── resume/
│   │   ├── ResumeForm.tsx
│   │   ├── ResumePreview.tsx
│   │   └── SectionOrderManager.tsx
│   └── ...
├── api/
│   ├── auth.ts              # Auth API
│   ├── resume.ts            # Resume API
│   └── legal.ts             # Legal/Consent API
├── stores/
│   ├── authStore.ts
│   └── userPreferencesStore.ts
├── hooks/
│   └── useResumeViewer.ts
├── utils/
│   ├── pdf.ts               # PDF export
│   └── imageProxy.ts        # Image to base64
└── i18n/
    └── config.ts
```

---

## Routes

### Public Routes

| Path                | Component        | Description             |
| ------------------- | ---------------- | ----------------------- |
| `/`                 | HomePage         | Landing/Dashboard       |
| `/login`            | LoginPage        | User login              |
| `/register`         | RegisterPage     | User registration       |
| `/consent`          | ConsentPage      | Legal consent flow      |
| `/resume/:username` | PublicResumePage | Public resume view      |
| `/shared/:token`    | SharedResumePage | Shared resume via token |
| `/privacy`          | PrivacyPage      | Privacy policy          |
| `/terms`            | TermsPage        | Terms of service        |

### Protected Routes

| Path                        | Component          | Description       |
| --------------------------- | ------------------ | ----------------- |
| `/resume/my`                | MyResumePage       | Resume management |
| `/resume/edit`              | ResumeEditPage     | Create resume     |
| `/resume/edit/:resumeId`    | ResumeEditPage     | Edit resume       |
| `/resume/preview/:resumeId` | ResumePreviewPage  | Print preview     |
| `/settings`                 | SettingsPage       | User settings     |
| `/change-password`          | ChangePasswordPage | Password change   |

---

## Design System

### V0.0.1 AAA Workstation

"Sophisticated Classic" style with WCAG 2.1 AAA compliance.

### Color Themes

**Light Mode (Clean White Oak)**:
| Token | Value | Contrast |
|-------|-------|----------|
| Page BG | #FFFFFF | - |
| Card BG | #F8F7F4 | - |
| Primary Text | #262220 | 15.76:1 |
| Primary Accent | #6B4A2E | 7.94:1 |

**Dark Mode (Midnight Gentle Study)**:
| Token | Value | Contrast |
|-------|-------|----------|
| Page BG | #1E1C1A | - |
| Card BG | #282522 | - |
| Primary Text | #CCC5BD | 9.94:1 |
| Primary Accent | #D0B080 | 8.25:1 |

### Theme Token Classes

```tsx
// Use semantic theme tokens
<div className="bg-theme-bg-card text-theme-text-primary border-theme-border-subtle">

// Typography
<h1 className="font-serif-title tracking-editorial italic text-5xl">

// Buttons
<Button variant="primary" size="xl" rounded="editorial">
```

### 8pt Grid System

| Allowed | Value | Disallowed     |
| ------- | ----- | -------------- |
| `p-2`   | 8px   | `p-3` (12px)   |
| `p-4`   | 16px  | `p-5` (20px)   |
| `gap-2` | 8px   | `gap-3` (12px) |
| `gap-4` | 16px  | `gap-5` (20px) |

---

## Resume Feature

### Component Architecture

```
ResumeEditPage
├── ResumeForm
│   ├── CollapsibleSection (Settings, BasicInfo)
│   ├── SectionOrderManager (Drag-and-drop)
│   ├── ExperienceSection
│   ├── EducationSection
│   └── SkillsSection
└── ResumePreviewContainer
    └── ResumePreview
        └── ResumePdfDocument (@react-pdf/renderer)
```

### PDF Export

```typescript
import { exportResumeToPDF, generateResumePDFBlob } from '../../utils/pdf';

// Download PDF
await exportResumeToPDF(resume, {
  paperSize: 'A4',
  fileName: 'resume.pdf',
});

// Get blob for upload
const blob = await generateResumePDFBlob(resume, { paperSize: 'A4' });
```

### PDF Crash Prevention

1. **Stable keys**: Use resume ID for preview key
2. **safeResume wrapper**: Default all undefined fields
3. **sanitizeText()**: Remove emojis and special Unicode
4. **imageToBase64()**: Convert images for CORS bypass

---

## Authentication

### API Clients

```typescript
// publicApi - No 401 interceptor (login, register)
import { publicApi } from '../api/auth';

// authApi - Has 401 interceptor with token refresh
import { authApi } from '../api/auth';
```

### Auth Store (Zustand)

```typescript
interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  clearAuth: () => void;
}
```

### PrivateRoute

```typescript
<PrivateRoute>
  <MyResumePage />
</PrivateRoute>
```

---

## Internationalization

### Supported Languages

| Code | Language | Flag |
| ---- | -------- | ---- |
| ko   | Korean   | 🇰🇷   |
| en   | English  | 🇺🇸   |
| ja   | Japanese | 🇯🇵   |
| hi   | Hindi    | 🇮🇳   |

### Usage

```typescript
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();

// With fallback
<p>{t('auth.login', { defaultValue: 'Login' })}</p>
```

### Detection Priority

1. Cookie (`i18n_language`)
2. User database preference
3. Browser auto-detect

---

## Best Practices

### Memoization (MANDATORY)

```typescript
// Memoize all handlers
const handleSubmit = useCallback(
  async (e) => {
    // ...
  },
  [dependencies],
);

// Memoize derived data
const filteredItems = useMemo(() => items.filter((item) => item.active), [items]);
```

### Static Constants Outside Component

```typescript
// ✅ Outside component
const LANGUAGES = [
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'English' },
] as const;

export default function Component() {
  // Use directly
}
```

### Mobile Design Standards

| Element       | Mobile      | Tablet (sm:) | Desktop (lg:) |
| ------------- | ----------- | ------------ | ------------- |
| Card padding  | `p-3`       | `sm:p-4`     | `lg:p-6`      |
| Section title | `text-base` | `sm:text-lg` | `lg:text-xl`  |
| Body text     | `text-xs`   | `sm:text-sm` | -             |

---

## Development Guide

### Running Locally

```bash
# Development
pnpm --filter web-main dev

# Build
pnpm --filter web-main build

# Preview build
pnpm --filter web-main preview

# Run tests
pnpm --filter web-main test
```

### Environment Variables

```bash
# Auth Service API
VITE_API_URL=https://auth.girok.dev

# Personal Service API
VITE_PERSONAL_API_URL=https://my.girok.dev
```

### Adding New Page

1. Create page component in `src/pages/`
2. Add route in `src/router.tsx`
3. Use appropriate layout (MainLayout, AuthLayout, etc.)
4. Add translations in `public/locales/`

### Adding New Component

1. Create in `src/components/` or `packages/ui-components/`
2. Use theme tokens (`bg-theme-*`, `text-theme-*`)
3. Follow 8pt Grid System
4. Add accessibility attributes (aria-\*, role)
5. Export from barrel file

---

## Related Documentation

- **LLM Reference**: [.ai/apps/web-main.md](../../.ai/apps/web-main.md)
- **Design System**: [docs/DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md)
- **Resume Guide**: [docs/guides/RESUME.md](../guides/RESUME.md)
- **UI Components**: [.ai/packages/ui-components.md](../../.ai/packages/ui-components.md)

---

_Last updated: 2025-12-24_

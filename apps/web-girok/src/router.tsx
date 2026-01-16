import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter } from 'react-router';
import { MainLayout, FullWidthLayout } from './layouts';
import PrivateRoute from './components/PrivateRoute';
import LoadingSpinner from './components/LoadingSpinner';

// Lazy load all page components for code splitting
const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const MfaVerificationPage = lazy(() => import('./pages/MfaVerificationPage'));
const OAuthCallbackPage = lazy(() => import('./pages/OAuthCallbackPage'));
const ConsentPage = lazy(() => import('./pages/ConsentPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ChangePasswordPage = lazy(() => import('./pages/ChangePasswordPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

// Resume pages
const ResumeEditPage = lazy(() => import('./pages/resume/ResumeEditPage'));
const ResumePreviewPage = lazy(() => import('./pages/resume/ResumePreviewPage'));
const PublicResumePage = lazy(() => import('./pages/resume/PublicResumePage'));
const SharedResumePage = lazy(() => import('./pages/resume/SharedResumePage'));
const MyResumePage = lazy(() => import('./pages/resume/MyResumePage'));

// Settings pages
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'));
const SessionsPage = lazy(() => import('./pages/settings/SessionsPage'));

// Placeholder pages for upcoming features
const JournalPage = lazy(() => import('./pages/JournalPage'));
const SchedulePage = lazy(() => import('./pages/SchedulePage'));
const FinancePage = lazy(() => import('./pages/FinancePage'));
const LibraryPage = lazy(() => import('./pages/LibraryPage'));
const NetworkPage = lazy(() => import('./pages/NetworkPage'));
const StatsPage = lazy(() => import('./pages/StatsPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));

// Legal pages
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));

// Design System
const DesignSystemPage = lazy(() => import('./pages/DesignSystemPage'));

/**
 * Suspense wrapper for lazy-loaded components
 * Provides consistent loading state across all routes
 */
function SuspenseWrapper({ children }: { children: ReactNode }) {
  return <Suspense fallback={<LoadingSpinner fullScreen />}>{children}</Suspense>;
}

/**
 * Helper to wrap element with Suspense and optionally PrivateRoute
 */
function lazyElement(element: ReactNode, isPrivate = false): ReactNode {
  const wrapped = <SuspenseWrapper>{element}</SuspenseWrapper>;
  return isPrivate ? <PrivateRoute>{wrapped}</PrivateRoute> : wrapped;
}

export const router = createBrowserRouter([
  // Main layout - standard pages with container constraints
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: lazyElement(<HomePage />),
      },
      {
        path: 'login',
        element: lazyElement(<LoginPage />),
      },
      {
        path: 'login/mfa',
        element: lazyElement(<MfaVerificationPage />),
      },
      {
        path: 'auth/callback',
        element: lazyElement(<OAuthCallbackPage />),
      },
      {
        path: 'consent',
        element: lazyElement(<ConsentPage />),
      },
      {
        path: 'register',
        element: lazyElement(<RegisterPage />),
      },
      {
        path: 'forgot-password',
        element: lazyElement(<ForgotPasswordPage />),
      },
      {
        path: 'change-password',
        element: lazyElement(<ChangePasswordPage />, true),
      },
      {
        path: 'settings',
        element: lazyElement(<SettingsPage />, true),
      },
      {
        path: 'settings/sessions',
        element: lazyElement(<SessionsPage />, true),
      },
      {
        path: 'resume/my',
        element: lazyElement(<MyResumePage />, true),
      },
      // Placeholder routes for upcoming features
      {
        path: 'journal',
        element: lazyElement(<JournalPage />, true),
      },
      {
        path: 'schedule',
        element: lazyElement(<SchedulePage />, true),
      },
      {
        path: 'finance',
        element: lazyElement(<FinancePage />, true),
      },
      {
        path: 'library',
        element: lazyElement(<LibraryPage />, true),
      },
      {
        path: 'network',
        element: lazyElement(<NetworkPage />, true),
      },
      {
        path: 'stats',
        element: lazyElement(<StatsPage />, true),
      },
      {
        path: 'notifications',
        element: lazyElement(<NotificationsPage />, true),
      },
      // Legal pages (public)
      {
        path: 'privacy',
        element: lazyElement(<PrivacyPage />),
      },
      {
        path: 'terms',
        element: lazyElement(<TermsPage />),
      },
      // Design System (public - for development reference)
      {
        path: 'design-system',
        element: lazyElement(<DesignSystemPage />),
      },
      {
        path: '*',
        element: lazyElement(<NotFoundPage />),
      },
    ],
  },
  // Full-width layout - pages that need full control of their layout
  {
    path: '/',
    element: <FullWidthLayout />,
    children: [
      {
        path: 'resume/edit',
        element: lazyElement(<ResumeEditPage />, true),
      },
      {
        path: 'resume/edit/:resumeId',
        element: lazyElement(<ResumeEditPage />, true),
      },
      {
        path: 'resume/preview/:resumeId',
        element: lazyElement(<ResumePreviewPage />, true),
      },
      {
        path: 'resume/:username',
        element: lazyElement(<PublicResumePage />),
      },
      {
        path: 'shared/:token',
        element: lazyElement(<SharedResumePage />),
      },
    ],
  },
]);

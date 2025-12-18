import { createBrowserRouter } from 'react-router';
import { MainLayout, FullWidthLayout } from './layouts';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import NotFoundPage from './pages/NotFoundPage';
import PrivateRoute from './components/PrivateRoute';
import ResumeEditPage from './pages/resume/ResumeEditPage';
import ResumePreviewPage from './pages/resume/ResumePreviewPage';
import PublicResumePage from './pages/resume/PublicResumePage';
import SharedResumePage from './pages/resume/SharedResumePage';
import MyResumePage from './pages/resume/MyResumePage';
import SettingsPage from './pages/settings/SettingsPage';
// Placeholder pages for upcoming features
import JournalPage from './pages/JournalPage';
import FinancePage from './pages/FinancePage';
import LibraryPage from './pages/LibraryPage';
import NetworkPage from './pages/NetworkPage';
import StatsPage from './pages/StatsPage';
import NotificationsPage from './pages/NotificationsPage';

export const router = createBrowserRouter([
  // Main layout - standard pages with container constraints
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'register',
        element: <RegisterPage />,
      },
      {
        path: 'change-password',
        element: (
          <PrivateRoute>
            <ChangePasswordPage />
          </PrivateRoute>
        ),
      },
      {
        path: 'settings',
        element: (
          <PrivateRoute>
            <SettingsPage />
          </PrivateRoute>
        ),
      },
      {
        path: 'resume/my',
        element: (
          <PrivateRoute>
            <MyResumePage />
          </PrivateRoute>
        ),
      },
      // Placeholder routes for upcoming features
      {
        path: 'journal',
        element: (
          <PrivateRoute>
            <JournalPage />
          </PrivateRoute>
        ),
      },
      {
        path: 'finance',
        element: (
          <PrivateRoute>
            <FinancePage />
          </PrivateRoute>
        ),
      },
      {
        path: 'library',
        element: (
          <PrivateRoute>
            <LibraryPage />
          </PrivateRoute>
        ),
      },
      {
        path: 'network',
        element: (
          <PrivateRoute>
            <NetworkPage />
          </PrivateRoute>
        ),
      },
      {
        path: 'stats',
        element: (
          <PrivateRoute>
            <StatsPage />
          </PrivateRoute>
        ),
      },
      {
        path: 'notifications',
        element: (
          <PrivateRoute>
            <NotificationsPage />
          </PrivateRoute>
        ),
      },
      {
        path: '*',
        element: <NotFoundPage />,
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
        element: (
          <PrivateRoute>
            <ResumeEditPage />
          </PrivateRoute>
        ),
      },
      {
        path: 'resume/edit/:resumeId',
        element: (
          <PrivateRoute>
            <ResumeEditPage />
          </PrivateRoute>
        ),
      },
      {
        path: 'resume/preview/:resumeId',
        element: (
          <PrivateRoute>
            <ResumePreviewPage />
          </PrivateRoute>
        ),
      },
      {
        path: 'resume/:username',
        element: <PublicResumePage />,
      },
      {
        path: 'shared/:token',
        element: <SharedResumePage />,
      },
    ],
  },
]);

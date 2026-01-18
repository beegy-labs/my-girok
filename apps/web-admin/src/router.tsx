import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router';
import AdminLayout from './layouts/AdminLayout';
import PrivateRoute from './components/PrivateRoute';
import LoginPage from './pages/LoginPage';
import MfaPage from './pages/MfaPage';
import { PageErrorBoundary } from './components/PageErrorBoundary';
import { Spinner } from './components/atoms/Spinner';

// Lazy load all page components for code splitting
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const DocumentsPage = lazy(() => import('./pages/legal/DocumentsPage'));
const DocumentEditPage = lazy(() => import('./pages/legal/DocumentEditPage'));
const ConsentsPage = lazy(() => import('./pages/legal/ConsentsPage'));
const ConsentStatsPage = lazy(() => import('./pages/legal/ConsentStatsPage'));
const ConsentExamplesPage = lazy(() => import('./pages/legal/ConsentExamplesPage'));
const TenantsPage = lazy(() => import('./pages/tenants/TenantsPage'));
const TenantEditPage = lazy(() => import('./pages/tenants/TenantEditPage'));
const AuditLogsPage = lazy(() => import('./pages/AuditLogsPage'));
const LoginHistoryPage = lazy(() => import('./pages/LoginHistoryPage'));
const ServicesPage = lazy(() => import('./pages/services/ServicesPage'));
const ServiceDetailPage = lazy(() => import('./pages/services/ServiceDetailPage'));
const ServiceConsentsPage = lazy(() => import('./pages/services/ServiceConsentsPage'));
const SupportedCountriesPage = lazy(() => import('./pages/system/SupportedCountriesPage'));
const SupportedLocalesPage = lazy(() => import('./pages/system/SupportedLocalesPage'));
const OAuthSettingsPage = lazy(() => import('./pages/system/OAuthSettingsPage'));
const SessionRecordingsPage = lazy(
  () => import('./pages/system/session-recordings/SessionRecordingsPage'),
);
const SessionDetailPage = lazy(() => import('./pages/system/session-recordings/SessionDetailPage'));
const SessionAnalyticsPage = lazy(
  () => import('./pages/system/session-recordings/SessionAnalyticsPage'),
);
const UsersOverviewPage = lazy(() => import('./pages/users/UsersOverviewPage'));
const UserActivityPage = lazy(() => import('./pages/users/UserActivityPage'));
const AuthorizationPage = lazy(() => import('./pages/authorization/AuthorizationPage'));
const SharedSessionPage = lazy(() => import('./pages/shared/SharedSessionPage'));

// HR Pages
const EmployeesPage = lazy(() => import('./pages/employees/EmployeesPage'));
const EmployeeDetailPage = lazy(() => import('./pages/employees/EmployeeDetailPage'));
const AttendancePage = lazy(() => import('./pages/attendance/AttendancePage'));
const LeavePage = lazy(() => import('./pages/leave/LeavePage'));
const DelegationsPage = lazy(() => import('./pages/delegations/DelegationsPage'));

// Page wrapper with Suspense and Error Boundary
function PageWrapper() {
  return (
    <PageErrorBoundary>
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-64">
            <Spinner size="lg" />
          </div>
        }
      >
        <Outlet />
      </Suspense>
    </PageErrorBoundary>
  );
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/login/mfa',
    element: <MfaPage />,
  },
  {
    path: '/shared/:shareToken',
    element: (
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-screen">
            <Spinner size="lg" />
          </div>
        }
      >
        <SharedSessionPage />
      </Suspense>
    ),
  },
  {
    path: '/',
    element: (
      <PrivateRoute>
        <AdminLayout />
      </PrivateRoute>
    ),
    children: [
      {
        element: <PageWrapper />,
        children: [
          // Dashboard
          {
            index: true,
            element: <DashboardPage />,
          },

          // Services
          {
            path: 'services',
            element: (
              <PrivateRoute permission="service:read">
                <ServicesPage />
              </PrivateRoute>
            ),
          },
          {
            path: 'services/:serviceId',
            element: (
              <PrivateRoute permission="service:read">
                <ServiceDetailPage />
              </PrivateRoute>
            ),
          },
          {
            path: 'services/:serviceId/consents',
            element: (
              <PrivateRoute permission="service:read">
                <ServiceConsentsPage />
              </PrivateRoute>
            ),
          },

          // Compliance (new structure)
          {
            path: 'compliance/documents',
            element: (
              <PrivateRoute permission="legal:read">
                <DocumentsPage />
              </PrivateRoute>
            ),
          },
          {
            path: 'compliance/documents/new',
            element: (
              <PrivateRoute permission="legal:create">
                <DocumentEditPage />
              </PrivateRoute>
            ),
          },
          {
            path: 'compliance/documents/:id',
            element: (
              <PrivateRoute permission="legal:read">
                <DocumentEditPage />
              </PrivateRoute>
            ),
          },
          {
            path: 'compliance/consents',
            element: (
              <PrivateRoute permission="legal:read">
                <ConsentsPage />
              </PrivateRoute>
            ),
          },
          {
            path: 'compliance/analytics',
            element: (
              <PrivateRoute permission="legal:read">
                <ConsentStatsPage />
              </PrivateRoute>
            ),
          },
          {
            path: 'compliance/regions',
            element: (
              <PrivateRoute permission="legal:read">
                <ConsentExamplesPage />
              </PrivateRoute>
            ),
          },

          // Organization
          {
            path: 'organization/partners',
            element: (
              <PrivateRoute permission="tenant:read">
                <TenantsPage />
              </PrivateRoute>
            ),
          },
          {
            path: 'organization/partners/new',
            element: (
              <PrivateRoute permission="tenant:create">
                <TenantEditPage />
              </PrivateRoute>
            ),
          },
          {
            path: 'organization/partners/:id',
            element: (
              <PrivateRoute permission="tenant:read">
                <TenantEditPage />
              </PrivateRoute>
            ),
          },

          // System
          {
            path: 'system/countries',
            element: (
              <PrivateRoute permission="settings:read">
                <SupportedCountriesPage />
              </PrivateRoute>
            ),
          },
          {
            path: 'system/locales',
            element: (
              <PrivateRoute permission="settings:read">
                <SupportedLocalesPage />
              </PrivateRoute>
            ),
          },
          {
            path: 'system/oauth',
            element: (
              <PrivateRoute permission="settings:read">
                <OAuthSettingsPage />
              </PrivateRoute>
            ),
          },
          {
            path: 'system/audit-logs',
            element: (
              <PrivateRoute permission="audit:read">
                <AuditLogsPage />
              </PrivateRoute>
            ),
          },
          {
            path: 'system/login-history',
            element: (
              <PrivateRoute permission="audit:read">
                <LoginHistoryPage />
              </PrivateRoute>
            ),
          },
          {
            path: 'system/session-recordings',
            element: (
              <PrivateRoute permission="audit:read">
                <SessionRecordingsPage />
              </PrivateRoute>
            ),
          },
          {
            path: 'system/session-recordings/analytics',
            element: (
              <PrivateRoute permission="audit:read">
                <SessionAnalyticsPage />
              </PrivateRoute>
            ),
          },
          {
            path: 'system/session-recordings/:sessionId',
            element: (
              <PrivateRoute permission="audit:read">
                <SessionDetailPage />
              </PrivateRoute>
            ),
          },
          {
            path: 'system/settings',
            element: <SettingsPage />,
          },

          // Users
          {
            path: 'users',
            element: (
              <PrivateRoute permission="audit:read">
                <UsersOverviewPage />
              </PrivateRoute>
            ),
          },
          {
            path: 'users/:userId',
            element: (
              <PrivateRoute permission="audit:read">
                <UserActivityPage />
              </PrivateRoute>
            ),
          },

          // Authorization
          {
            path: 'authorization',
            element: (
              <PrivateRoute permission="authorization:manage">
                <AuthorizationPage />
              </PrivateRoute>
            ),
          },

          // HR Management
          {
            path: 'hr/employees',
            element: (
              <PrivateRoute permission="admin:read">
                <EmployeesPage />
              </PrivateRoute>
            ),
          },
          {
            path: 'hr/employees/:id',
            element: (
              <PrivateRoute permission="admin:read">
                <EmployeeDetailPage />
              </PrivateRoute>
            ),
          },
          {
            path: 'hr/attendance',
            element: (
              <PrivateRoute permission="attendance:read">
                <AttendancePage />
              </PrivateRoute>
            ),
          },
          {
            path: 'hr/leave',
            element: (
              <PrivateRoute permission="leave:read">
                <LeavePage />
              </PrivateRoute>
            ),
          },
          {
            path: 'hr/delegations',
            element: (
              <PrivateRoute permission="delegation:read">
                <DelegationsPage />
              </PrivateRoute>
            ),
          },

          // Legacy redirects for backward compatibility
          { path: 'legal/documents', element: <Navigate to="/compliance/documents" replace /> },
          { path: 'legal/documents/*', element: <Navigate to="/compliance/documents" replace /> },
          { path: 'legal/consents', element: <Navigate to="/compliance/consents" replace /> },
          { path: 'legal/consent-stats', element: <Navigate to="/compliance/analytics" replace /> },
          { path: 'legal/examples', element: <Navigate to="/compliance/regions" replace /> },
          { path: 'tenants', element: <Navigate to="/organization/partners" replace /> },
          { path: 'tenants/*', element: <Navigate to="/organization/partners" replace /> },
          { path: 'audit-logs', element: <Navigate to="/system/audit-logs" replace /> },
        ],
      },
    ],
  },
]);

import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router';
import AdminLayout from './layouts/AdminLayout';
import PrivateRoute from './components/PrivateRoute';
import LoginPage from './pages/LoginPage';
import { PageErrorBoundary } from './components/PageErrorBoundary';
import { Spinner } from './components/atoms/Spinner';

// Lazy load all page components for code splitting
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const DocumentsPage = lazy(() => import('./pages/legal/DocumentsPage'));
const DocumentEditPage = lazy(() => import('./pages/legal/DocumentEditPage'));
const ConsentsPage = lazy(() => import('./pages/legal/ConsentsPage'));
const ConsentStatsPage = lazy(() => import('./pages/legal/ConsentStatsPage'));
const ConsentExamplesPage = lazy(() => import('./pages/legal/ConsentExamplesPage'));
const TenantsPage = lazy(() => import('./pages/tenants/TenantsPage'));
const TenantEditPage = lazy(() => import('./pages/tenants/TenantEditPage'));
const AuditLogsPage = lazy(() => import('./pages/AuditLogsPage'));
const ServicesPage = lazy(() => import('./pages/services/ServicesPage'));
const ServiceDetailPage = lazy(() => import('./pages/services/ServiceDetailPage'));
const ServiceConsentsPage = lazy(() => import('./pages/services/ServiceConsentsPage'));

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
            path: 'system/audit-logs',
            element: (
              <PrivateRoute permission="audit:read">
                <AuditLogsPage />
              </PrivateRoute>
            ),
          },
          {
            path: 'system/settings',
            element: <div className="text-theme-text-primary">Settings page coming soon</div>,
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

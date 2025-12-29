import { lazy, Suspense } from 'react';
import { createBrowserRouter, Outlet } from 'react-router';
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
          {
            index: true,
            element: <DashboardPage />,
          },
          {
            path: 'legal/documents',
            element: (
              <PrivateRoute permission="legal:read">
                <DocumentsPage />
              </PrivateRoute>
            ),
          },
          {
            path: 'legal/documents/new',
            element: (
              <PrivateRoute permission="legal:create">
                <DocumentEditPage />
              </PrivateRoute>
            ),
          },
          {
            path: 'legal/documents/:id',
            element: (
              <PrivateRoute permission="legal:read">
                <DocumentEditPage />
              </PrivateRoute>
            ),
          },
          {
            path: 'legal/consents',
            element: (
              <PrivateRoute permission="legal:read">
                <ConsentsPage />
              </PrivateRoute>
            ),
          },
          {
            path: 'legal/consent-stats',
            element: (
              <PrivateRoute permission="legal:read">
                <ConsentStatsPage />
              </PrivateRoute>
            ),
          },
          {
            path: 'legal/examples',
            element: (
              <PrivateRoute permission="legal:read">
                <ConsentExamplesPage />
              </PrivateRoute>
            ),
          },
          {
            path: 'tenants',
            element: (
              <PrivateRoute permission="tenant:read">
                <TenantsPage />
              </PrivateRoute>
            ),
          },
          {
            path: 'tenants/new',
            element: (
              <PrivateRoute permission="tenant:create">
                <TenantEditPage />
              </PrivateRoute>
            ),
          },
          {
            path: 'tenants/:id',
            element: (
              <PrivateRoute permission="tenant:read">
                <TenantEditPage />
              </PrivateRoute>
            ),
          },
          {
            path: 'audit-logs',
            element: (
              <PrivateRoute permission="audit:read">
                <AuditLogsPage />
              </PrivateRoute>
            ),
          },
          {
            path: 'services',
            element: (
              <PrivateRoute permission="service:read">
                <ServicesPage />
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
        ],
      },
    ],
  },
]);

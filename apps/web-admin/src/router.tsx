import { createBrowserRouter } from 'react-router';
import AdminLayout from './layouts/AdminLayout';
import PrivateRoute from './components/PrivateRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import DocumentsPage from './pages/legal/DocumentsPage';
import DocumentEditPage from './pages/legal/DocumentEditPage';
import ConsentsPage from './pages/legal/ConsentsPage';
import TenantsPage from './pages/tenants/TenantsPage';
import TenantEditPage from './pages/tenants/TenantEditPage';

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
    ],
  },
]);

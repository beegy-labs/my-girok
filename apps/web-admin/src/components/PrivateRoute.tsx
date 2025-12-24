import { Navigate, useLocation } from 'react-router';
import { useAdminAuthStore } from '../stores/adminAuthStore';
import { ReactNode } from 'react';

interface PrivateRouteProps {
  children: ReactNode;
  permission?: string;
}

export default function PrivateRoute({ children, permission }: PrivateRouteProps) {
  const { isAuthenticated, hasPermission } = useAdminAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (permission && !hasPermission(permission)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

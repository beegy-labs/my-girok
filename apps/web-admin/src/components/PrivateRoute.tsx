import { Navigate, useLocation } from 'react-router';
import { useAdminAuthStore } from '../stores/adminAuthStore';
import { useAuth } from '../contexts/AuthContext';
import { Spinner } from './atoms';
import { ReactNode } from 'react';

interface PrivateRouteProps {
  children: ReactNode;
  permission?: string;
}

export default function PrivateRoute({ children, permission }: PrivateRouteProps) {
  const { isAuthenticated, hasPermission } = useAdminAuthStore();
  const { isInitializing } = useAuth();
  const location = useLocation();

  // Show loading state while validating session
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-theme-bg-page">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (permission && !hasPermission(permission)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

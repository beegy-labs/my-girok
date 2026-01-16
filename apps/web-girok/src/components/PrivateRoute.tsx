import { Navigate, useLocation } from 'react-router';
import { useAuthStore } from '../stores/authStore';

interface PrivateRouteProps {
  children: React.ReactNode;
}

export default function PrivateRoute({ children }: PrivateRouteProps) {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    // Preserve the current URL to redirect back after login
    const returnUrl = location.pathname + location.search;
    return <Navigate to={`/login?returnUrl=${encodeURIComponent(returnUrl)}`} replace />;
  }

  return <>{children}</>;
}

// apps/web-admin/src/components/PageErrorBoundary.tsx
import { useCallback, ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { ErrorBoundary } from './ErrorBoundary';

interface Props {
  children: ReactNode;
}

export function PageErrorBoundary({ children }: Props) {
  const navigate = useNavigate();

  const handleReset = useCallback(() => {
    navigate(0); // Refresh current route
  }, [navigate]);

  return <ErrorBoundary onReset={handleReset}>{children}</ErrorBoundary>;
}

/**
 * User Tracking Hook
 * Phase 6.2 - Admin Audit System (#416)
 */
import { useEffect } from 'react';
import { setUserContext, clearUserContext } from '../lib/otel';
import { useAdminAuthStore } from '../stores/adminAuthStore';

/**
 * Hook for syncing user context with OTEL
 * Updates OTEL user context when auth state changes
 */
export function useUserTracking() {
  const admin = useAdminAuthStore((state) => state.admin);
  const isAuthenticated = useAdminAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated && admin) {
      setUserContext({
        userId: admin.id,
        email: admin.email,
        role: admin.roleName,
      });
    } else {
      clearUserContext();
    }
  }, [isAuthenticated, admin]);
}

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAdminAuthStore } from '../stores/adminAuthStore';
import { authApi } from '../api';
import { logger } from '../utils/logger';

interface AuthContextValue {
  isInitializing: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isInitializing, setIsInitializing] = useState(true);
  const { isAuthenticated, setAuth, clearAuth } = useAdminAuthStore();

  useEffect(() => {
    const validateSession = async () => {
      // If not authenticated, no need to validate
      if (!isAuthenticated) {
        setIsInitializing(false);
        return;
      }

      try {
        // Validate session by calling /admin/me
        const adminInfo = await authApi.getMe();
        // Update store with fresh admin info
        setAuth(adminInfo);
        logger.info('Session validated successfully');
      } catch (error) {
        // Session invalid - clear auth (401 interceptor will also clear)
        logger.warn('Session validation failed, clearing auth');
        clearAuth();
      } finally {
        setIsInitializing(false);
      }
    };

    validateSession();
  }, []); // Run once on mount

  return <AuthContext.Provider value={{ isInitializing }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

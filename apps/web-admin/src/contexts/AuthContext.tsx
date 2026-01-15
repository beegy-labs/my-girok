import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { AxiosError } from 'axios';
import { useAdminAuthStore } from '../stores/adminAuthStore';
import { authApi } from '../api';
import { logger } from '../utils/logger';

// Session refresh interval (5 minutes)
const SESSION_REFRESH_INTERVAL = 5 * 60 * 1000;

// Activity debounce time (30 seconds)
const ACTIVITY_DEBOUNCE = 30 * 1000;

// Inactivity timeout before stopping proactive refresh (30 minutes)
const INACTIVITY_TIMEOUT = 30 * 60 * 1000;

interface AuthContextValue {
  isInitializing: boolean;
  refreshSession: () => Promise<boolean>;
  lastActivity: number;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isInitializing, setIsInitializing] = useState(true);
  const { isAuthenticated, setAuth, clearAuth } = useAdminAuthStore();

  // Track last activity time
  const lastActivityRef = useRef<number>(Date.now());
  const [lastActivity, setLastActivity] = useState<number>(Date.now());

  // Refresh interval ref for cleanup
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * Refresh the session and update admin info
   */
  const refreshSession = useCallback(async (): Promise<boolean> => {
    if (!isAuthenticated) return false;

    try {
      const result = await authApi.refresh();
      if (result.success) {
        // Optionally refresh admin info after session refresh
        const adminInfo = await authApi.getMe();
        setAuth(adminInfo);
        logger.debug('Session refreshed proactively');
        return true;
      }
      return false;
    } catch (error) {
      logger.warn('Proactive session refresh failed', error);
      return false;
    }
  }, [isAuthenticated, setAuth]);

  /**
   * Update activity timestamp (debounced)
   */
  const updateActivity = useCallback(() => {
    const now = Date.now();
    // Only update if enough time has passed (debounce)
    if (now - lastActivityRef.current > ACTIVITY_DEBOUNCE) {
      lastActivityRef.current = now;
      setLastActivity(now);
    }
  }, []);

  /**
   * Check if user is active (had activity within timeout)
   */
  const isUserActive = useCallback((): boolean => {
    return Date.now() - lastActivityRef.current < INACTIVITY_TIMEOUT;
  }, []);

  // Initial session validation
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
        // Only clear auth on 401 (unauthorized) errors
        // Other errors (network, 5xx) should not cause logout
        const axiosError = error as AxiosError;
        if (axiosError.response?.status === 401) {
          logger.warn('Session validation failed (401), clearing auth');
          clearAuth();
        } else {
          // Log other errors but don't clear auth
          // The session might still be valid, just the validation request failed
          logger.warn('Session validation request failed, but keeping auth', error);
        }
      } finally {
        setIsInitializing(false);
      }
    };

    validateSession();
  }, []); // Run once on mount

  // Setup proactive session refresh
  useEffect(() => {
    if (!isAuthenticated) {
      // Clear interval when not authenticated
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      return;
    }

    // Start proactive refresh interval
    refreshIntervalRef.current = setInterval(() => {
      // Only refresh if user is still active
      if (isUserActive()) {
        refreshSession();
      } else {
        logger.debug('Skipping proactive refresh - user inactive');
      }
    }, SESSION_REFRESH_INTERVAL);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [isAuthenticated, refreshSession, isUserActive]);

  // Track user activity events
  useEffect(() => {
    if (!isAuthenticated) return;

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];

    events.forEach((event) => {
      window.addEventListener(event, updateActivity, { passive: true });
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, updateActivity);
      });
    };
  }, [isAuthenticated, updateActivity]);

  return (
    <AuthContext.Provider value={{ isInitializing, refreshSession, lastActivity }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

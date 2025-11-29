import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { shouldRefreshToken } from '../utils/tokenUtils';

interface User {
  id: string;
  email: string;
  username: string;
  name: string | null;
  role: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  lastRefreshCheck: number | null;

  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  updateAccessToken: (accessToken: string) => void;
  updateTokens: (accessToken: string, refreshToken: string) => void;
  needsProactiveRefresh: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      lastRefreshCheck: null,

      setAuth: (user, accessToken, refreshToken) =>
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          lastRefreshCheck: Date.now(),
        }),

      clearAuth: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          lastRefreshCheck: null,
        }),

      updateAccessToken: (accessToken) =>
        set({ accessToken }),

      updateTokens: (accessToken, refreshToken) =>
        set({
          accessToken,
          refreshToken,
          lastRefreshCheck: Date.now(),
        }),

      needsProactiveRefresh: () => {
        const { refreshToken, lastRefreshCheck } = get();
        if (!refreshToken) return false;

        // Check only once per hour to avoid excessive checks
        const oneHour = 60 * 60 * 1000;
        if (lastRefreshCheck && Date.now() - lastRefreshCheck < oneHour) {
          return false;
        }

        // Check if refresh token has 7 days or less remaining
        return shouldRefreshToken(refreshToken, 7);
      },
    }),
    {
      name: 'auth-storage',
    },
  ),
);

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserInfo } from '@my-girok/types';

interface AuthState {
  user: UserInfo | null;
  isAuthenticated: boolean;
  // MFA challenge state (transient, not persisted)
  mfaChallenge: {
    challengeId: string;
    availableMethods: string[];
  } | null;

  setAuth: (user: UserInfo) => void;
  setMfaChallenge: (challengeId: string, methods: string[]) => void;
  clearMfaChallenge: () => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      mfaChallenge: null,

      setAuth: (user) =>
        set({
          user,
          isAuthenticated: true,
          mfaChallenge: null,
        }),

      setMfaChallenge: (challengeId, availableMethods) =>
        set({
          mfaChallenge: { challengeId, availableMethods },
          isAuthenticated: false,
        }),

      clearMfaChallenge: () => set({ mfaChallenge: null }),

      clearAuth: () =>
        set({
          user: null,
          isAuthenticated: false,
          mfaChallenge: null,
        }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        // Only persist user info, not MFA challenge
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

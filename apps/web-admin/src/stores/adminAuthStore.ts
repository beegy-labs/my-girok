import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AdminInfo } from '@my-girok/types';

interface AdminAuthState {
  admin: AdminInfo | null;
  isAuthenticated: boolean;
  // MFA challenge state (transient, not persisted)
  mfaChallenge: {
    challengeId: string;
    availableMethods: string[];
  } | null;

  setAuth: (admin: AdminInfo) => void;
  setMfaChallenge: (challengeId: string, methods: string[]) => void;
  clearMfaChallenge: () => void;
  clearAuth: () => void;
  hasPermission: (permission: string) => boolean;
}

export const useAdminAuthStore = create<AdminAuthState>()(
  persist(
    (set, get) => ({
      admin: null,
      isAuthenticated: false,
      mfaChallenge: null,

      setAuth: (admin) =>
        set({
          admin,
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
          admin: null,
          isAuthenticated: false,
          mfaChallenge: null,
        }),

      hasPermission: (required: string) => {
        const { admin } = get();
        if (!admin) return false;

        const permissions = admin.permissions || [];

        // Check wildcard (super admin)
        if (permissions.includes('*')) return true;

        // Check exact match
        if (permissions.includes(required)) return true;

        // Check resource wildcard (e.g., 'legal:*' matches 'legal:read')
        const [resource] = required.split(':');
        if (permissions.includes(`${resource}:*`)) return true;

        return false;
      },
    }),
    {
      name: 'admin-auth-storage',
      partialize: (state) => ({
        // Only persist admin info, not MFA challenge
        admin: state.admin,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

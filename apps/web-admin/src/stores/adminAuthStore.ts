import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  scope: 'SYSTEM' | 'TENANT';
  tenantId: string | null;
  tenantSlug: string | null;
  roleName: string;
  permissions: string[];
}

interface AdminAuthState {
  admin: AdminUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;

  setAuth: (admin: AdminUser, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  updateTokens: (accessToken: string, refreshToken: string) => void;
  hasPermission: (permission: string) => boolean;
}

export const useAdminAuthStore = create<AdminAuthState>()(
  persist(
    (set, get) => ({
      admin: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      setAuth: (admin, accessToken, refreshToken) =>
        set({
          admin,
          accessToken,
          refreshToken,
          isAuthenticated: true,
        }),

      clearAuth: () =>
        set({
          admin: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        }),

      updateTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),

      hasPermission: (required: string) => {
        const { admin } = get();
        if (!admin) return false;

        const { permissions } = admin;

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
    },
  ),
);

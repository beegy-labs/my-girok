import { create, type StateCreator } from 'zustand';
import { persist, type PersistOptions } from 'zustand/middleware';

/**
 * MFA challenge state (transient, not persisted)
 */
export interface MfaChallenge {
  challengeId: string;
  availableMethods: string[];
}

/**
 * Base auth state interface - common across all auth stores
 */
export interface BaseAuthState<TUser> {
  user: TUser | null;
  isAuthenticated: boolean;
  mfaChallenge: MfaChallenge | null;

  setAuth: (user: TUser) => void;
  setMfaChallenge: (challengeId: string, methods: string[]) => void;
  clearMfaChallenge: () => void;
  clearAuth: () => void;
}

/**
 * Configuration options for creating an auth store
 */
export interface CreateAuthStoreOptions<TUser> {
  /** Storage key for persistence */
  storageName: string;
  /** Optional custom partialize function for persistence */
  partialize?: PersistOptions<BaseAuthState<TUser>>['partialize'];
}

/**
 * Creates a base auth state slice (for use with zustand create)
 */
export function createBaseAuthSlice<TUser>(): StateCreator<
  BaseAuthState<TUser>,
  [],
  [],
  BaseAuthState<TUser>
> {
  return (set) => ({
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
  });
}

/**
 * Creates a persisted auth store with common auth state management.
 *
 * @example
 * ```typescript
 * // Basic usage
 * const useAuthStore = createAuthStore<UserInfo>({
 *   storageName: 'auth-storage',
 * });
 *
 * // In component
 * const { user, isAuthenticated, setAuth, clearAuth } = useAuthStore();
 * ```
 */
export function createAuthStore<TUser>(options: CreateAuthStoreOptions<TUser>) {
  const { storageName, partialize } = options;

  return create<BaseAuthState<TUser>>()(
    persist(createBaseAuthSlice<TUser>(), {
      name: storageName,
      partialize:
        partialize ??
        ((state) => ({
          // Only persist user info, not MFA challenge (security best practice)
          user: state.user,
          isAuthenticated: state.isAuthenticated,
        })),
    }),
  );
}

/**
 * Creates an extended auth store with additional methods.
 * Use this when you need app-specific methods like hasPermission.
 *
 * @example
 * ```typescript
 * interface AdminExtensions {
 *   hasPermission: (permission: string) => boolean;
 * }
 *
 * const useAdminAuthStore = createExtendedAuthStore<AdminInfo, AdminExtensions>({
 *   storageName: 'admin-auth-storage',
 *   extend: (set, get) => ({
 *     hasPermission: (required) => {
 *       const admin = get().user;
 *       if (!admin) return false;
 *       return admin.permissions?.includes(required) ?? false;
 *     },
 *   }),
 * });
 * ```
 */
export function createExtendedAuthStore<TUser, TExtensions extends object>(options: {
  storageName: string;
  extend: (
    set: (
      partial:
        | Partial<BaseAuthState<TUser> & TExtensions>
        | ((
            state: BaseAuthState<TUser> & TExtensions,
          ) => Partial<BaseAuthState<TUser> & TExtensions>),
    ) => void,
    get: () => BaseAuthState<TUser> & TExtensions,
  ) => TExtensions;
  partialize?: PersistOptions<BaseAuthState<TUser> & TExtensions>['partialize'];
}) {
  const { storageName, extend, partialize } = options;

  return create<BaseAuthState<TUser> & TExtensions>()(
    persist(
      (set, get, store) => ({
        ...createBaseAuthSlice<TUser>()(
          set as Parameters<StateCreator<BaseAuthState<TUser>>>[0],
          get as Parameters<StateCreator<BaseAuthState<TUser>>>[1],
          store as Parameters<StateCreator<BaseAuthState<TUser>>>[2],
        ),
        ...extend(set, get),
      }),
      {
        name: storageName,
        partialize:
          partialize ??
          ((state) => ({
            user: state.user,
            isAuthenticated: state.isAuthenticated,
          })),
      },
    ),
  );
}

import { create } from 'zustand';
import {
  Theme,
  SectionOrderItem,
  UserPreferences,
  getUserPreferences,
  updateUserPreferences as updateUserPreferencesAPI,
  UpdateUserPreferencesDto,
} from '../api/userPreferences';
import {
  getCookieJSON,
  setCookieJSON,
  deleteCookie,
} from '../utils/cookies';

const THEME_COOKIE_KEY = 'user-theme';
const SECTION_ORDER_COOKIE_KEY = 'user-section-order';

interface UserPreferencesState {
  preferences: UserPreferences | null;
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadPreferences: () => Promise<void>;
  setTheme: (theme: Theme) => Promise<void>;
  setSectionOrder: (sectionOrder: SectionOrderItem[]) => Promise<void>;
  updatePreferences: (dto: UpdateUserPreferencesDto) => Promise<void>;
  clearPreferences: () => void;

  // Cookie-based getters
  getThemeFromCookie: () => Theme | null;
  getSectionOrderFromCookie: () => SectionOrderItem[] | null;
}

export const useUserPreferencesStore = create<UserPreferencesState>(
  (set, get) => ({
    preferences: null,
    isLoaded: false,
    isLoading: false,
    error: null,

    /**
     * Load user preferences
     * Priority: Cookie > Server > Default
     */
    loadPreferences: async () => {
      // Check if already loaded
      if (get().isLoaded) {
        return;
      }

      set({ isLoading: true, error: null });

      try {
        // Try to load from cookies first
        const themeCookie = get().getThemeFromCookie();
        const sectionOrderCookie = get().getSectionOrderFromCookie();

        // If cookies exist, use them without calling server
        if (themeCookie && sectionOrderCookie) {
          set({
            preferences: {
              id: 'cookie',
              userId: 'cookie',
              theme: themeCookie,
              sectionOrder: sectionOrderCookie,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            isLoaded: true,
            isLoading: false,
          });
          return;
        }

        // No cookies, fetch from server
        const preferences = await getUserPreferences();
        set({
          preferences,
          isLoaded: true,
          isLoading: false,
        });

        // Save to cookies
        if (preferences.theme) {
          setCookieJSON(THEME_COOKIE_KEY, preferences.theme, {
            expires: 365,
          });
        }
        if (preferences.sectionOrder) {
          setCookieJSON(
            SECTION_ORDER_COOKIE_KEY,
            preferences.sectionOrder,
            { expires: 365 },
          );
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to load preferences';
        set({
          error: errorMessage,
          isLoaded: true,
          isLoading: false,
        });
      }
    },

    /**
     * Set theme preference
     */
    setTheme: async (theme: Theme) => {
      try {
        // Update cookie first (optimistic update)
        setCookieJSON(THEME_COOKIE_KEY, theme, { expires: 365 });

        // Update local state
        const currentPrefs = get().preferences;
        if (currentPrefs) {
          set({
            preferences: {
              ...currentPrefs,
              theme,
            },
          });
        }

        // Update server in background
        await updateUserPreferencesAPI({ theme });
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to update theme';
        set({ error: errorMessage });
        throw error;
      }
    },

    /**
     * Set section order preference
     */
    setSectionOrder: async (sectionOrder: SectionOrderItem[]) => {
      try {
        // Update cookie first (optimistic update)
        setCookieJSON(SECTION_ORDER_COOKIE_KEY, sectionOrder, {
          expires: 365,
        });

        // Update local state
        const currentPrefs = get().preferences;
        if (currentPrefs) {
          set({
            preferences: {
              ...currentPrefs,
              sectionOrder,
            },
          });
        }

        // Update server in background
        await updateUserPreferencesAPI({ sectionOrder });
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to update section order';
        set({ error: errorMessage });
        throw error;
      }
    },

    /**
     * Update preferences (partial)
     */
    updatePreferences: async (dto: UpdateUserPreferencesDto) => {
      try {
        // Update cookies
        if (dto.theme) {
          setCookieJSON(THEME_COOKIE_KEY, dto.theme, { expires: 365 });
        }
        if (dto.sectionOrder !== undefined) {
          if (dto.sectionOrder === null) {
            deleteCookie(SECTION_ORDER_COOKIE_KEY);
          } else {
            setCookieJSON(SECTION_ORDER_COOKIE_KEY, dto.sectionOrder, {
              expires: 365,
            });
          }
        }

        // Update local state
        const currentPrefs = get().preferences;
        if (currentPrefs) {
          set({
            preferences: {
              ...currentPrefs,
              ...(dto.theme && { theme: dto.theme }),
              ...(dto.sectionOrder !== undefined && {
                sectionOrder: dto.sectionOrder,
              }),
            },
          });
        }

        // Update server
        await updateUserPreferencesAPI(dto);
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to update preferences';
        set({ error: errorMessage });
        throw error;
      }
    },

    /**
     * Clear preferences (logout)
     */
    clearPreferences: () => {
      deleteCookie(THEME_COOKIE_KEY);
      deleteCookie(SECTION_ORDER_COOKIE_KEY);
      set({
        preferences: null,
        isLoaded: false,
        isLoading: false,
        error: null,
      });
    },

    /**
     * Get theme from cookie
     */
    getThemeFromCookie: () => {
      return getCookieJSON<Theme>(THEME_COOKIE_KEY);
    },

    /**
     * Get section order from cookie
     */
    getSectionOrderFromCookie: () => {
      return getCookieJSON<SectionOrderItem[]>(
        SECTION_ORDER_COOKIE_KEY,
      );
    },
  }),
);

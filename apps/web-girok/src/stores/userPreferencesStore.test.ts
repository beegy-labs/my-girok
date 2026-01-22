/**
 * userPreferencesStore Tests
 *
 * Tests for the user preferences store with optimistic update and rollback.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from '@testing-library/react';
import { useUserPreferencesStore } from './userPreferencesStore';
import {
  Theme,
  SectionType,
  type SectionOrderItem,
  type UserPreferences,
} from '../api/userPreferences';

// Mock the API module (preserve types/enums with importOriginal)
vi.mock('../api/userPreferences', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/userPreferences')>();
  return {
    ...actual,
    getUserPreferences: vi.fn(),
    updateUserPreferences: vi.fn(),
  };
});

// Mock the cookies module
vi.mock('../utils/cookies', () => ({
  getCookieJSON: vi.fn(),
  setCookieJSON: vi.fn(),
  deleteCookie: vi.fn(),
}));

import { updateUserPreferences as updateUserPreferencesAPI } from '../api/userPreferences';
import { getCookieJSON, setCookieJSON, deleteCookie } from '../utils/cookies';

// Type assertions for mocks
const mockUpdateUserPreferencesAPI = updateUserPreferencesAPI as ReturnType<typeof vi.fn>;
const mockGetCookieJSON = getCookieJSON as ReturnType<typeof vi.fn>;
const mockSetCookieJSON = setCookieJSON as ReturnType<typeof vi.fn>;
const mockDeleteCookie = deleteCookie as ReturnType<typeof vi.fn>;

describe('userPreferencesStore', () => {
  const mockPreferences: UserPreferences = {
    id: 'test-id',
    userId: 'user-1',
    theme: Theme.LIGHT,
    sectionOrder: [{ type: SectionType.SKILLS, order: 1, visible: true }],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    // Reset store state before each test
    useUserPreferencesStore.setState({
      preferences: mockPreferences,
      isLoaded: true,
      isLoading: false,
      error: null,
    });

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('setTheme with rollback', () => {
    it('should update theme optimistically on success', async () => {
      mockGetCookieJSON.mockReturnValue(Theme.LIGHT);
      mockUpdateUserPreferencesAPI.mockResolvedValue(undefined);

      const store = useUserPreferencesStore.getState();

      await act(async () => {
        await store.setTheme(Theme.DARK);
      });

      const state = useUserPreferencesStore.getState();
      expect(state.preferences?.theme).toBe(Theme.DARK);
      expect(mockSetCookieJSON).toHaveBeenCalledWith('user-theme', Theme.DARK, { expires: 365 });
      expect(mockUpdateUserPreferencesAPI).toHaveBeenCalledWith({ theme: Theme.DARK });
    });

    it('should rollback theme on API failure', async () => {
      mockGetCookieJSON.mockReturnValue(Theme.LIGHT);
      mockUpdateUserPreferencesAPI.mockRejectedValue(new Error('API Error'));

      const store = useUserPreferencesStore.getState();

      await expect(
        act(async () => {
          await store.setTheme(Theme.DARK);
        }),
      ).rejects.toThrow('API Error');

      const state = useUserPreferencesStore.getState();

      // State should be rolled back
      expect(state.preferences?.theme).toBe(Theme.LIGHT);
      expect(state.error).toBe('API Error');

      // Cookie should be restored (Theme.LIGHT = 'LIGHT')
      expect(mockSetCookieJSON).toHaveBeenCalledWith('user-theme', Theme.LIGHT, { expires: 365 });
    });

    it('should delete cookie on rollback when no previous cookie existed', async () => {
      mockGetCookieJSON.mockReturnValue(null); // No previous cookie
      mockUpdateUserPreferencesAPI.mockRejectedValue(new Error('API Error'));

      const store = useUserPreferencesStore.getState();

      await expect(
        act(async () => {
          await store.setTheme(Theme.DARK);
        }),
      ).rejects.toThrow();

      expect(mockDeleteCookie).toHaveBeenCalledWith('user-theme');
    });
  });

  describe('setSectionOrder with rollback', () => {
    it('should update section order optimistically on success', async () => {
      const newOrder: SectionOrderItem[] = [
        { type: SectionType.EXPERIENCE, order: 1, visible: true },
        { type: SectionType.SKILLS, order: 2, visible: true },
      ];
      mockGetCookieJSON.mockReturnValue([{ type: SectionType.SKILLS, order: 1, visible: true }]);
      mockUpdateUserPreferencesAPI.mockResolvedValue(undefined);

      const store = useUserPreferencesStore.getState();

      await act(async () => {
        await store.setSectionOrder(newOrder);
      });

      const state = useUserPreferencesStore.getState();
      expect(state.preferences?.sectionOrder).toEqual(newOrder);
      expect(mockSetCookieJSON).toHaveBeenCalledWith('user-section-order', newOrder, {
        expires: 365,
      });
    });

    it('should rollback section order on API failure', async () => {
      const originalOrder: SectionOrderItem[] = [
        { type: SectionType.SKILLS, order: 1, visible: true },
      ];
      const newOrder: SectionOrderItem[] = [
        { type: SectionType.EXPERIENCE, order: 1, visible: true },
        { type: SectionType.SKILLS, order: 2, visible: true },
      ];

      mockGetCookieJSON.mockReturnValue(originalOrder);
      mockUpdateUserPreferencesAPI.mockRejectedValue(new Error('API Error'));

      const store = useUserPreferencesStore.getState();

      await expect(
        act(async () => {
          await store.setSectionOrder(newOrder);
        }),
      ).rejects.toThrow('API Error');

      const state = useUserPreferencesStore.getState();

      // State should be rolled back
      expect(state.preferences?.sectionOrder).toEqual(originalOrder);
      expect(state.error).toBe('API Error');

      // Cookie should be restored
      expect(mockSetCookieJSON).toHaveBeenCalledWith('user-section-order', originalOrder, {
        expires: 365,
      });
    });

    it('should delete cookie on rollback when no previous cookie existed', async () => {
      mockGetCookieJSON.mockReturnValue(null);
      mockUpdateUserPreferencesAPI.mockRejectedValue(new Error('API Error'));

      const store = useUserPreferencesStore.getState();

      await expect(
        act(async () => {
          await store.setSectionOrder([{ type: SectionType.SKILLS, order: 1, visible: true }]);
        }),
      ).rejects.toThrow();

      expect(mockDeleteCookie).toHaveBeenCalledWith('user-section-order');
    });
  });

  describe('updatePreferences with rollback', () => {
    it('should update both theme and section order optimistically', async () => {
      const newOrder: SectionOrderItem[] = [
        { type: SectionType.EXPERIENCE, order: 1, visible: true },
      ];
      mockGetCookieJSON.mockReturnValue(null);
      mockUpdateUserPreferencesAPI.mockResolvedValue(undefined);

      const store = useUserPreferencesStore.getState();

      await act(async () => {
        await store.updatePreferences({
          theme: Theme.DARK,
          sectionOrder: newOrder,
        });
      });

      const state = useUserPreferencesStore.getState();
      expect(state.preferences?.theme).toBe(Theme.DARK);
      expect(state.preferences?.sectionOrder).toEqual(newOrder);
    });

    it('should rollback both theme and section order on API failure', async () => {
      const originalTheme = Theme.LIGHT;
      const originalOrder: SectionOrderItem[] = [
        { type: SectionType.SKILLS, order: 1, visible: true },
      ];

      // Mock to return previous values
      mockGetCookieJSON
        .mockReturnValueOnce(originalTheme) // First call for theme
        .mockReturnValueOnce(originalOrder); // Second call for section order

      mockUpdateUserPreferencesAPI.mockRejectedValue(new Error('API Error'));

      const store = useUserPreferencesStore.getState();

      await expect(
        act(async () => {
          await store.updatePreferences({
            theme: Theme.DARK,
            sectionOrder: [{ type: SectionType.EXPERIENCE, order: 1, visible: true }],
          });
        }),
      ).rejects.toThrow('API Error');

      const state = useUserPreferencesStore.getState();

      // State should be rolled back to original
      expect(state.preferences?.theme).toBe(originalTheme);
      expect(state.preferences?.sectionOrder).toEqual(originalOrder);
      expect(state.error).toBe('API Error');
    });

    it('should handle null sectionOrder (deletion)', async () => {
      mockGetCookieJSON.mockReturnValue(null);
      mockUpdateUserPreferencesAPI.mockResolvedValue(undefined);

      const store = useUserPreferencesStore.getState();

      await act(async () => {
        await store.updatePreferences({
          sectionOrder: null as unknown as undefined, // null triggers deletion
        });
      });

      expect(mockDeleteCookie).toHaveBeenCalledWith('user-section-order');
    });

    it('should only rollback changed fields on failure', async () => {
      // Only updating theme, not section order
      mockGetCookieJSON.mockReturnValue(Theme.LIGHT);
      mockUpdateUserPreferencesAPI.mockRejectedValue(new Error('API Error'));

      const store = useUserPreferencesStore.getState();

      await expect(
        act(async () => {
          await store.updatePreferences({ theme: Theme.DARK });
        }),
      ).rejects.toThrow();

      // Only theme cookie should be restored, not section order
      expect(mockSetCookieJSON).toHaveBeenCalledWith('user-theme', Theme.LIGHT, { expires: 365 });
      // deleteCookie for section-order should NOT be called
      const sectionOrderDeleteCalls = mockDeleteCookie.mock.calls.filter(
        (call) => call[0] === 'user-section-order',
      );
      expect(sectionOrderDeleteCalls.length).toBe(0);
    });
  });

  describe('clearPreferences', () => {
    it('should clear all preferences and cookies', () => {
      const store = useUserPreferencesStore.getState();

      act(() => {
        store.clearPreferences();
      });

      const state = useUserPreferencesStore.getState();
      expect(state.preferences).toBeNull();
      expect(state.isLoaded).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();

      expect(mockDeleteCookie).toHaveBeenCalledWith('user-theme');
      expect(mockDeleteCookie).toHaveBeenCalledWith('user-section-order');
    });
  });
});

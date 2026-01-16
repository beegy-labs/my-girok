/**
 * userPreferencesStore Tests
 *
 * Tests for the user preferences store with optimistic update and rollback.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from '@testing-library/react';
import { useUserPreferencesStore } from './userPreferencesStore';
import type { Theme, SectionOrderItem, UserPreferences } from '../api/userPreferences';

// Mock the API module
vi.mock('../api/userPreferences', () => ({
  getUserPreferences: vi.fn(),
  updateUserPreferences: vi.fn(),
}));

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
    theme: 'light' as Theme,
    sectionOrder: [{ type: 'skills', order: 1 }] as SectionOrderItem[],
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
      mockGetCookieJSON.mockReturnValue('light');
      mockUpdateUserPreferencesAPI.mockResolvedValue(undefined);

      const store = useUserPreferencesStore.getState();

      await act(async () => {
        await store.setTheme('dark' as Theme);
      });

      const state = useUserPreferencesStore.getState();
      expect(state.preferences?.theme).toBe('dark');
      expect(mockSetCookieJSON).toHaveBeenCalledWith('user-theme', 'dark', { expires: 365 });
      expect(mockUpdateUserPreferencesAPI).toHaveBeenCalledWith({ theme: 'dark' });
    });

    it('should rollback theme on API failure', async () => {
      mockGetCookieJSON.mockReturnValue('light');
      mockUpdateUserPreferencesAPI.mockRejectedValue(new Error('API Error'));

      const store = useUserPreferencesStore.getState();

      await expect(
        act(async () => {
          await store.setTheme('dark' as Theme);
        }),
      ).rejects.toThrow('API Error');

      const state = useUserPreferencesStore.getState();

      // State should be rolled back
      expect(state.preferences?.theme).toBe('light');
      expect(state.error).toBe('API Error');

      // Cookie should be restored
      expect(mockSetCookieJSON).toHaveBeenCalledWith('user-theme', 'light', { expires: 365 });
    });

    it('should delete cookie on rollback when no previous cookie existed', async () => {
      mockGetCookieJSON.mockReturnValue(null); // No previous cookie
      mockUpdateUserPreferencesAPI.mockRejectedValue(new Error('API Error'));

      const store = useUserPreferencesStore.getState();

      await expect(
        act(async () => {
          await store.setTheme('dark' as Theme);
        }),
      ).rejects.toThrow();

      expect(mockDeleteCookie).toHaveBeenCalledWith('user-theme');
    });
  });

  describe('setSectionOrder with rollback', () => {
    it('should update section order optimistically on success', async () => {
      const newOrder: SectionOrderItem[] = [
        { type: 'experience', order: 1 },
        { type: 'skills', order: 2 },
      ];
      mockGetCookieJSON.mockReturnValue([{ type: 'skills', order: 1 }]);
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
      const originalOrder: SectionOrderItem[] = [{ type: 'skills', order: 1 }];
      const newOrder: SectionOrderItem[] = [
        { type: 'experience', order: 1 },
        { type: 'skills', order: 2 },
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
          await store.setSectionOrder([{ type: 'skills', order: 1 }]);
        }),
      ).rejects.toThrow();

      expect(mockDeleteCookie).toHaveBeenCalledWith('user-section-order');
    });
  });

  describe('updatePreferences with rollback', () => {
    it('should update both theme and section order optimistically', async () => {
      const newOrder: SectionOrderItem[] = [{ type: 'experience', order: 1 }];
      mockGetCookieJSON.mockReturnValue(null);
      mockUpdateUserPreferencesAPI.mockResolvedValue(undefined);

      const store = useUserPreferencesStore.getState();

      await act(async () => {
        await store.updatePreferences({
          theme: 'dark' as Theme,
          sectionOrder: newOrder,
        });
      });

      const state = useUserPreferencesStore.getState();
      expect(state.preferences?.theme).toBe('dark');
      expect(state.preferences?.sectionOrder).toEqual(newOrder);
    });

    it('should rollback both theme and section order on API failure', async () => {
      const originalTheme = 'light' as Theme;
      const originalOrder: SectionOrderItem[] = [{ type: 'skills', order: 1 }];

      // Mock to return previous values
      mockGetCookieJSON
        .mockReturnValueOnce(originalTheme) // First call for theme
        .mockReturnValueOnce(originalOrder); // Second call for section order

      mockUpdateUserPreferencesAPI.mockRejectedValue(new Error('API Error'));

      const store = useUserPreferencesStore.getState();

      await expect(
        act(async () => {
          await store.updatePreferences({
            theme: 'dark' as Theme,
            sectionOrder: [{ type: 'experience', order: 1 }],
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
          sectionOrder: null,
        });
      });

      expect(mockDeleteCookie).toHaveBeenCalledWith('user-section-order');
    });

    it('should only rollback changed fields on failure', async () => {
      // Only updating theme, not section order
      mockGetCookieJSON.mockReturnValue('light');
      mockUpdateUserPreferencesAPI.mockRejectedValue(new Error('API Error'));

      const store = useUserPreferencesStore.getState();

      await expect(
        act(async () => {
          await store.updatePreferences({ theme: 'dark' as Theme });
        }),
      ).rejects.toThrow();

      // Only theme cookie should be restored, not section order
      expect(mockSetCookieJSON).toHaveBeenCalledWith('user-theme', 'light', { expires: 365 });
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

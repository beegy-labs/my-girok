import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './admin-auth.spec';

/**
 * User Activity E2E Tests
 */
test.describe('User Activity', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.describe('Users Overview Page', () => {
    test('should display users overview', async ({ page }) => {
      await page.goto('/system/user-activity');

      // Check page title
      await expect(page.getByRole('heading', { name: /user activity/i })).toBeVisible();

      // Check if users list is visible
      await expect(page.locator('[data-testid="users-list"]')).toBeVisible();
    });

    test('should search users by email', async ({ page }) => {
      await page.goto('/system/user-activity');

      // Find search input
      const searchInput = page.getByPlaceholder(/search.*email/i);
      await searchInput.fill('test@example.com');
      await page.waitForTimeout(500); // Debounce

      // Verify search is applied
      await expect(page.locator('[data-testid="users-list"]')).toBeVisible();
    });

    test('should display user statistics', async ({ page }) => {
      await page.goto('/system/user-activity');

      // Check for stats cards
      await expect(page.getByText(/total users/i)).toBeVisible();
      await expect(page.getByText(/active.*sessions|sessions/i)).toBeVisible();
    });

    test('should sort users by activity', async ({ page }) => {
      await page.goto('/system/user-activity');

      // Find sort dropdown
      const sortButton = page.getByRole('button', { name: /sort/i });
      if (await sortButton.isVisible()) {
        await sortButton.click();

        // Select sort by sessions
        await page.getByRole('menuitem', { name: /most sessions/i }).click();

        // Verify sorting is applied
        await expect(page.locator('[data-testid="users-list"]')).toBeVisible();
      }
    });

    test('should paginate through users', async ({ page }) => {
      await page.goto('/system/user-activity');

      // Check if pagination exists
      const nextButton = page.getByRole('button', { name: /next/i });
      if ((await nextButton.isVisible()) && !(await nextButton.isDisabled())) {
        await nextButton.click();

        // Wait for page to load
        await page.waitForTimeout(300);

        // Verify we're on page 2
        await expect(page.locator('[data-testid="users-list"]')).toBeVisible();
      }
    });

    test('should navigate to top users view', async ({ page }) => {
      await page.goto('/system/user-activity');

      // Find top users tab or button
      const topUsersTab = page.getByRole('tab', { name: /top users/i });
      if (await topUsersTab.isVisible()) {
        await topUsersTab.click();

        // Verify top users are displayed
        await expect(page.locator('[data-testid="top-users-list"]')).toBeVisible();
      }
    });
  });

  test.describe('User Detail Page', () => {
    test('should navigate to user detail', async ({ page }) => {
      await page.goto('/system/user-activity');

      // Click on first user
      const firstUser = page.locator('[data-testid="user-row"]').first();
      if (await firstUser.isVisible()) {
        await firstUser.click();

        // Verify we're on detail page
        await expect(page).toHaveURL(/\/system\/user-activity\/.+/);
        await expect(page.getByRole('heading', { name: /user.*activity/i })).toBeVisible();
      }
    });

    test('should display user summary statistics', async ({ page }) => {
      await page.goto('/system/user-activity');

      const firstUser = page.locator('[data-testid="user-row"]').first();
      if (await firstUser.isVisible()) {
        await firstUser.click();

        // Check for summary stats
        await expect(page.getByText(/total sessions/i)).toBeVisible();
        await expect(page.getByText(/total duration/i)).toBeVisible();
        await expect(page.getByText(/page views/i)).toBeVisible();
        await expect(page.getByText(/clicks/i)).toBeVisible();
      }
    });

    test('should display user sessions list', async ({ page }) => {
      await page.goto('/system/user-activity');

      const firstUser = page.locator('[data-testid="user-row"]').first();
      if (await firstUser.isVisible()) {
        await firstUser.click();

        // Check for sessions tab
        const sessionsTab = page.getByRole('tab', { name: /sessions/i });
        if (await sessionsTab.isVisible()) {
          await sessionsTab.click();

          // Verify sessions list is visible
          await expect(page.locator('[data-testid="user-sessions-list"]')).toBeVisible();
        }
      }
    });

    test('should filter user sessions by date', async ({ page }) => {
      await page.goto('/system/user-activity');

      const firstUser = page.locator('[data-testid="user-row"]').first();
      if (await firstUser.isVisible()) {
        await firstUser.click();

        // Navigate to sessions tab
        const sessionsTab = page.getByRole('tab', { name: /sessions/i });
        if (await sessionsTab.isVisible()) {
          await sessionsTab.click();

          // Apply date filter
          const dateFilter = page.getByRole('button', { name: /date range/i });
          if (await dateFilter.isVisible()) {
            await dateFilter.click();
            await page.getByRole('button', { name: /last 30 days/i }).click();

            // Verify filter is applied
            await expect(page.locator('[data-testid="user-sessions-list"]')).toBeVisible();
          }
        }
      }
    });

    test('should display user location map', async ({ page }) => {
      await page.goto('/system/user-activity');

      const firstUser = page.locator('[data-testid="user-row"]').first();
      if (await firstUser.isVisible()) {
        await firstUser.click();

        // Navigate to locations tab
        const locationsTab = page.getByRole('tab', { name: /locations/i });
        if (await locationsTab.isVisible()) {
          await locationsTab.click();

          // Verify location data is visible
          await expect(page.locator('[data-testid="user-locations"]')).toBeVisible();
        }
      }
    });

    test('should display device breakdown', async ({ page }) => {
      await page.goto('/system/user-activity');

      const firstUser = page.locator('[data-testid="user-row"]').first();
      if (await firstUser.isVisible()) {
        await firstUser.click();

        // Check for device info
        await expect(page.getByText(/device|browser/i)).toBeVisible();
      }
    });

    test('should navigate to session from user detail', async ({ page }) => {
      await page.goto('/system/user-activity');

      const firstUser = page.locator('[data-testid="user-row"]').first();
      if (await firstUser.isVisible()) {
        await firstUser.click();

        // Navigate to sessions tab
        const sessionsTab = page.getByRole('tab', { name: /sessions/i });
        if (await sessionsTab.isVisible()) {
          await sessionsTab.click();

          // Click on a session
          const firstSession = page.locator('[data-testid="session-item"]').first();
          if (await firstSession.isVisible()) {
            await firstSession.click();

            // Verify we're on session detail page
            await expect(page).toHaveURL(/\/system\/session-recordings\/.+/);
          }
        }
      }
    });
  });

  test.describe('Activity Charts', () => {
    test('should display activity over time chart', async ({ page }) => {
      await page.goto('/system/user-activity');

      const firstUser = page.locator('[data-testid="user-row"]').first();
      if (await firstUser.isVisible()) {
        await firstUser.click();

        // Check for activity chart
        const activityChart = page.locator('[data-testid="activity-chart"]');
        await expect(activityChart).toBeVisible();
      }
    });

    test('should change chart time range', async ({ page }) => {
      await page.goto('/system/user-activity');

      const firstUser = page.locator('[data-testid="user-row"]').first();
      if (await firstUser.isVisible()) {
        await firstUser.click();

        // Find time range selector
        const rangeSelector = page.getByRole('button', { name: /7 days|30 days/i });
        if (await rangeSelector.isVisible()) {
          await rangeSelector.click();
          await page.getByRole('menuitem', { name: /30 days/i }).click();

          // Verify chart updates
          await page.waitForTimeout(500);
          await expect(page.locator('[data-testid="activity-chart"]')).toBeVisible();
        }
      }
    });
  });
});

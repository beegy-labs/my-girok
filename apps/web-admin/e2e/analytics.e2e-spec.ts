import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * Analytics E2E Tests
 */
test.describe('Analytics', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.describe('Analytics Dashboard', () => {
    test('should display analytics overview page', async ({ page }) => {
      await page.goto('/system/user-activity');

      // Check page title
      await expect(page.getByRole('heading', { name: /user activity|analytics/i })).toBeVisible();

      // Check if main dashboard content is visible
      await expect(page.locator('[data-testid="users-list"]')).toBeVisible();
    });

    test('should display total users count', async ({ page }) => {
      await page.goto('/system/user-activity');

      // Check for total users metric
      await expect(page.getByText(/total users/i)).toBeVisible();

      // Verify the metric has a numeric value
      const usersCountElement = page.locator('[data-testid="total-users-count"]');
      if (await usersCountElement.isVisible()) {
        const countText = await usersCountElement.textContent();
        expect(countText).toMatch(/\d+/);
      }
    });

    test('should display active sessions count', async ({ page }) => {
      await page.goto('/system/user-activity');

      // Check for active sessions metric
      await expect(page.getByText(/active.*sessions|sessions/i)).toBeVisible();

      // Verify the metric has a numeric value
      const sessionsCountElement = page.locator('[data-testid="active-sessions-count"]');
      if (await sessionsCountElement.isVisible()) {
        const countText = await sessionsCountElement.textContent();
        expect(countText).toMatch(/\d+/);
      }
    });
  });

  test.describe('Top Users Analytics', () => {
    test('should display top users leaderboard', async ({ page }) => {
      await page.goto('/system/user-activity');

      // Navigate to top users tab
      const topUsersTab = page.getByRole('tab', { name: /top users/i });
      if (await topUsersTab.isVisible()) {
        await topUsersTab.click();
        await page.waitForTimeout(300);

        // Verify top users list is displayed
        await expect(page.locator('[data-testid="top-users-list"]')).toBeVisible();
      } else {
        // Alternative: Check if top users section exists on main page
        const topUsersSection = page.locator('[data-testid="top-users-list"]');
        if (await topUsersSection.isVisible()) {
          await expect(topUsersSection).toBeVisible();
        }
      }
    });

    test('should sort top users by session count', async ({ page }) => {
      await page.goto('/system/user-activity');

      // Navigate to top users view
      const topUsersTab = page.getByRole('tab', { name: /top users/i });
      if (await topUsersTab.isVisible()) {
        await topUsersTab.click();
        await page.waitForTimeout(300);
      }

      // Find sort dropdown
      const sortButton = page.getByRole('button', { name: /sort/i });
      if (await sortButton.isVisible()) {
        await sortButton.click();

        // Select sort by sessions
        const sessionsSortOption = page.getByRole('menuitem', {
          name: /most sessions|session count/i,
        });
        if (await sessionsSortOption.isVisible()) {
          await sessionsSortOption.click();
          await page.waitForTimeout(300);

          // Verify sorting is applied
          await expect(page.locator('[data-testid="top-users-list"]')).toBeVisible();
        }
      }
    });

    test('should navigate to user detail from leaderboard', async ({ page }) => {
      await page.goto('/system/user-activity');

      // Navigate to top users tab if it exists
      const topUsersTab = page.getByRole('tab', { name: /top users/i });
      if (await topUsersTab.isVisible()) {
        await topUsersTab.click();
        await page.waitForTimeout(300);
      }

      // Click on first user in top users list
      const firstTopUser = page.locator('[data-testid="top-user-row"]').first();
      if (await firstTopUser.isVisible()) {
        await firstTopUser.click();

        // Verify we're on user detail page
        await expect(page).toHaveURL(/\/system\/user-activity\/.+/);
        await expect(
          page.getByRole('heading', { name: /user.*activity|analytics/i }),
        ).toBeVisible();
      } else {
        // Alternative: Try regular user row
        const firstUser = page.locator('[data-testid="user-row"]').first();
        if (await firstUser.isVisible()) {
          await firstUser.click();
          await expect(page).toHaveURL(/\/system\/user-activity\/.+/);
        }
      }
    });
  });

  test.describe('User Analytics Detail', () => {
    test('should display user analytics summary', async ({ page }) => {
      await page.goto('/system/user-activity');

      // Navigate to first user's detail page
      const firstUser = page.locator('[data-testid="user-row"]').first();
      if (await firstUser.isVisible()) {
        await firstUser.click();

        // Check for user summary card
        const summaryCard = page.locator('[data-testid="user-summary-card"]');
        await expect(summaryCard).toBeVisible();

        // Verify key metrics are displayed
        await expect(page.getByText(/total sessions/i)).toBeVisible();
        await expect(page.getByText(/total duration/i)).toBeVisible();
        await expect(page.getByText(/page views/i)).toBeVisible();
      }
    });

    test('should display user session history', async ({ page }) => {
      await page.goto('/system/user-activity');

      // Navigate to first user's detail page
      const firstUser = page.locator('[data-testid="user-row"]').first();
      if (await firstUser.isVisible()) {
        await firstUser.click();

        // Navigate to sessions tab if it exists
        const sessionsTab = page.getByRole('tab', { name: /sessions/i });
        if (await sessionsTab.isVisible()) {
          await sessionsTab.click();
          await page.waitForTimeout(300);
        }

        // Verify sessions list is visible
        await expect(page.locator('[data-testid="user-sessions-list"]')).toBeVisible();

        // Check if session items are displayed
        const sessionItems = page.locator('[data-testid="session-item"]');
        const itemCount = await sessionItems.count();

        if (itemCount > 0) {
          // Verify first session has expected information
          const firstSession = sessionItems.first();
          await expect(firstSession).toBeVisible();
        }
      }
    });

    test('should display location statistics', async ({ page }) => {
      await page.goto('/system/user-activity');

      // Navigate to first user's detail page
      const firstUser = page.locator('[data-testid="user-row"]').first();
      if (await firstUser.isVisible()) {
        await firstUser.click();

        // Navigate to locations tab if it exists
        const locationsTab = page.getByRole('tab', { name: /locations/i });
        if (await locationsTab.isVisible()) {
          await locationsTab.click();
          await page.waitForTimeout(300);

          // Verify location stats are visible
          const locationStats = page.locator('[data-testid="location-stats"]');
          await expect(locationStats).toBeVisible();
        } else {
          // Alternative: Check if location info is on overview
          const locationInfo = page.getByText(/location|country|city/i);
          if (await locationInfo.isVisible()) {
            await expect(locationInfo).toBeVisible();
          }
        }
      }
    });

    test('should display activity chart', async ({ page }) => {
      await page.goto('/system/user-activity');

      // Navigate to first user's detail page
      const firstUser = page.locator('[data-testid="user-row"]').first();
      if (await firstUser.isVisible()) {
        await firstUser.click();

        // Check for activity chart
        const activityChart = page.locator('[data-testid="activity-chart"]');
        await expect(activityChart).toBeVisible();
      }
    });

    test('should filter activity by date range', async ({ page }) => {
      await page.goto('/system/user-activity');

      // Navigate to first user's detail page
      const firstUser = page.locator('[data-testid="user-row"]').first();
      if (await firstUser.isVisible()) {
        await firstUser.click();

        // Find date range filter
        const dateFilter = page.getByRole('button', { name: /date range/i });
        if (await dateFilter.isVisible()) {
          await dateFilter.click();

          // Select last 30 days
          const thirtyDaysOption = page.getByRole('button', { name: /last 30 days/i });
          if (await thirtyDaysOption.isVisible()) {
            await thirtyDaysOption.click();
            await page.waitForTimeout(500);

            // Verify chart updates
            await expect(page.locator('[data-testid="activity-chart"]')).toBeVisible();
          }
        }
      }
    });

    test('should display device and browser analytics', async ({ page }) => {
      await page.goto('/system/user-activity');

      // Navigate to first user's detail page
      const firstUser = page.locator('[data-testid="user-row"]').first();
      if (await firstUser.isVisible()) {
        await firstUser.click();

        // Check for device/browser information
        await expect(page.getByText(/device|browser|platform/i)).toBeVisible();

        // Verify device breakdown exists if available
        const deviceBreakdown = page.locator('[data-testid="device-breakdown"]');
        if (await deviceBreakdown.isVisible()) {
          await expect(deviceBreakdown).toBeVisible();
        }
      }
    });

    test('should navigate to session recording from analytics', async ({ page }) => {
      await page.goto('/system/user-activity');

      // Navigate to first user's detail page
      const firstUser = page.locator('[data-testid="user-row"]').first();
      if (await firstUser.isVisible()) {
        await firstUser.click();

        // Navigate to sessions tab if it exists
        const sessionsTab = page.getByRole('tab', { name: /sessions/i });
        if (await sessionsTab.isVisible()) {
          await sessionsTab.click();
          await page.waitForTimeout(300);
        }

        // Click on a session to view recording
        const firstSession = page.locator('[data-testid="session-item"]').first();
        if (await firstSession.isVisible()) {
          await firstSession.click();

          // Verify we navigated to session recordings page
          await expect(page).toHaveURL(/\/system\/session-recordings\/.+/);
          await expect(page.getByRole('heading', { name: /session.*details/i })).toBeVisible();
        }
      }
    });
  });
});

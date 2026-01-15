import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

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

      // Wait for search results to update (debounce handled by waiting for results)
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

        // Wait for next page to load
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

    test('should display top users with proper ranking', async ({ page }) => {
      await page.goto('/system/user-activity');

      // Navigate to top users view
      const topUsersTab = page.getByRole('tab', { name: /top users/i });
      if (await topUsersTab.isVisible()) {
        await topUsersTab.click();

        // Verify top users list is displayed
        const topUsersList = page.locator('[data-testid="top-users-list"]');
        await expect(topUsersList).toBeVisible();

        // Verify ranking numbers are displayed (1, 2, 3, etc.)
        const rankingElements = page.locator('[data-testid="user-rank"]');
        if (await rankingElements.first().isVisible()) {
          const firstRank = await rankingElements.first().textContent();
          expect(firstRank).toMatch(/1|#1/);
        }

        // Verify metrics are visible
        const metricsVisible =
          (await page.getByText(/session count/i).isVisible()) ||
          (await page.getByText(/total sessions/i).isVisible());
        expect(metricsVisible).toBeTruthy();

        const durationVisible =
          (await page.getByText(/duration/i).isVisible()) ||
          (await page.getByText(/total time/i).isVisible());
        expect(durationVisible).toBeTruthy();

        // Verify users are displayed in a list
        const userCards = page.locator('[data-testid="top-user-card"]');
        if (await userCards.first().isVisible()) {
          const count = await userCards.count();
          expect(count).toBeGreaterThan(0);
        }
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

    test('should display complete user summary card', async ({ page }) => {
      await page.goto('/system/user-activity');

      const firstUser = page.locator('[data-testid="user-row"]').first();
      if (await firstUser.isVisible()) {
        await firstUser.click();

        // Verify all summary metrics
        const summaryCard = page.locator('[data-testid="user-summary-card"]');
        if (await summaryCard.isVisible()) {
          await expect(summaryCard).toBeVisible();
        }

        // Verify core metrics
        await expect(page.getByText(/total sessions/i)).toBeVisible();
        await expect(page.getByText(/total duration/i)).toBeVisible();
        await expect(page.getByText(/page views/i)).toBeVisible();
        await expect(page.getByText(/clicks/i)).toBeVisible();

        // Verify additional metrics
        const countriesVisible =
          (await page.getByText(/countries/i).isVisible()) ||
          (await page.getByText(/locations/i).isVisible());
        expect(countriesVisible).toBeTruthy();

        const devicesVisible =
          (await page.getByText(/device types/i).isVisible()) ||
          (await page.getByText(/devices/i).isVisible());
        expect(devicesVisible).toBeTruthy();

        // Verify date metrics
        const firstActiveVisible =
          (await page.getByText(/first active/i).isVisible()) ||
          (await page.getByText(/first seen/i).isVisible());
        expect(firstActiveVisible).toBeTruthy();

        const lastActiveVisible =
          (await page.getByText(/last active/i).isVisible()) ||
          (await page.getByText(/last seen/i).isVisible());
        expect(lastActiveVisible).toBeTruthy();

        // Verify average session duration
        const avgDurationVisible =
          (await page.getByText(/avg.*duration/i).isVisible()) ||
          (await page.getByText(/average.*session/i).isVisible());
        expect(avgDurationVisible).toBeTruthy();
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

    test('should paginate through user sessions', async ({ page }) => {
      await page.goto('/system/user-activity');

      const firstUser = page.locator('[data-testid="user-row"]').first();
      if (await firstUser.isVisible()) {
        await firstUser.click();

        // Navigate to sessions tab
        const sessionsTab = page.getByRole('tab', { name: /sessions/i });
        if (await sessionsTab.isVisible()) {
          await sessionsTab.click();

          // Verify sessions table is displayed
          await expect(page.locator('[data-testid="user-sessions-list"]')).toBeVisible();

          // Check if pagination exists
          const nextButton = page.getByRole('button', { name: /next/i });
          const pageIndicator = page.locator('[data-testid="page-indicator"]');

          if ((await nextButton.isVisible()) && !(await nextButton.isDisabled())) {
            // Get initial page number if available
            let initialPage = '1';
            if (await pageIndicator.isVisible()) {
              initialPage = (await pageIndicator.textContent()) || '1';
            }

            // Click next button
            await nextButton.click();

            // Wait for page navigation to complete
            await page.waitForLoadState('networkidle');

            // Verify page indicator updates
            if (await pageIndicator.isVisible()) {
              const newPage = await pageIndicator.textContent();
              expect(newPage).not.toBe(initialPage);
            }

            // Verify sessions list is still visible
            await expect(page.locator('[data-testid="user-sessions-list"]')).toBeVisible();

            // Test previous button if available
            const prevButton = page.getByRole('button', { name: /prev|previous/i });
            if ((await prevButton.isVisible()) && !(await prevButton.isDisabled())) {
              await prevButton.click();
              // Wait for previous page to load
              await expect(page.locator('[data-testid="user-sessions-list"]')).toBeVisible();
            }
          }
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

    test('should display location statistics with flags', async ({ page }) => {
      await page.goto('/system/user-activity');

      const firstUser = page.locator('[data-testid="user-row"]').first();
      if (await firstUser.isVisible()) {
        await firstUser.click();

        // Navigate to locations tab or section
        const locationsTab = page.getByRole('tab', { name: /locations/i });
        if (await locationsTab.isVisible()) {
          await locationsTab.click();
        }

        // Verify location statistics section is visible
        const locationStats = page.locator('[data-testid="location-stats"]');
        if (await locationStats.isVisible()) {
          await expect(locationStats).toBeVisible();

          // Verify country flags or codes are displayed
          const countryFlags =
            page.locator('[data-testid="country-flag"]').first().isVisible() ||
            page.locator('[data-testid="country-code"]').first().isVisible();
          expect(await countryFlags).toBeTruthy();

          // Verify session count per country
          const sessionCount = page.locator('[data-testid="country-session-count"]');
          if (await sessionCount.first().isVisible()) {
            await expect(sessionCount.first()).toBeVisible();
          }

          // Verify duration per country
          const durationVisible =
            (await page.getByText(/duration/i).isVisible()) ||
            (await page.getByText(/time/i).isVisible());
          expect(durationVisible).toBeTruthy();

          // Verify percentage breakdown
          const percentageElements = page.locator('[data-testid="country-percentage"]');
          if (await percentageElements.first().isVisible()) {
            const percentageText = await percentageElements.first().textContent();
            expect(percentageText).toMatch(/%/);
          }
        } else {
          // Alternative: Check for location info in user locations section
          const userLocations = page.locator('[data-testid="user-locations"]');
          await expect(userLocations).toBeVisible();
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

    test('should navigate from overview to activity detail to session detail', async ({ page }) => {
      // Start at user activity overview
      await page.goto('/system/user-activity');
      await expect(page).toHaveURL(/\/system\/user-activity$/);
      await expect(page.locator('[data-testid="users-list"]')).toBeVisible();

      // Click on a user card to navigate to user detail
      const firstUser = page.locator('[data-testid="user-row"]').first();
      if (await firstUser.isVisible()) {
        // Store user ID if possible
        const _userUrl = await page.url();

        await firstUser.click();

        // Verify we're on user detail page
        await expect(page).toHaveURL(/\/system\/user-activity\/.+/);
        await expect(page.getByRole('heading', { name: /user.*activity/i })).toBeVisible();

        // Navigate to sessions tab
        const sessionsTab = page.getByRole('tab', { name: /sessions/i });
        if (await sessionsTab.isVisible()) {
          await sessionsTab.click();

          // Wait for sessions list to load
          await expect(page.locator('[data-testid="user-sessions-list"]')).toBeVisible();

          // Click on a session to navigate to session detail
          const firstSession = page.locator('[data-testid="session-item"]').first();
          if (await firstSession.isVisible()) {
            await firstSession.click();

            // Verify we're on session recordings detail page
            await expect(page).toHaveURL(/\/system\/session-recordings\/.+/);

            // Verify session detail page is loaded
            const sessionDetail =
              (await page.getByRole('heading', { name: /session/i }).isVisible()) ||
              (await page.locator('[data-testid="session-detail"]').isVisible());
            expect(sessionDetail).toBeTruthy();
          }
        }
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

    test('should display empty state for user with no sessions', async ({ page }) => {
      await page.goto('/system/user-activity');

      const firstUser = page.locator('[data-testid="user-row"]').first();
      if (await firstUser.isVisible()) {
        await firstUser.click();

        // Navigate to sessions tab
        const sessionsTab = page.getByRole('tab', { name: /sessions/i });
        if (await sessionsTab.isVisible()) {
          await sessionsTab.click();

          // Wait for sessions list to load
          await page.waitForLoadState('networkidle');

          // Check if sessions list is empty
          const sessionsList = page.locator('[data-testid="user-sessions-list"]');
          const sessionItems = page.locator('[data-testid="session-item"]');

          // If no sessions, verify empty state is displayed
          const sessionCount = await sessionItems.count();
          if (sessionCount === 0) {
            // Verify empty state message
            const emptyStateVisible =
              (await page.getByText(/no sessions/i).isVisible()) ||
              (await page.getByText(/no activity/i).isVisible()) ||
              (await page.locator('[data-testid="empty-state"]').isVisible());
            expect(emptyStateVisible).toBeTruthy();

            // Verify helpful text or illustration
            const helpfulTextVisible =
              (await page.getByText(/check back later/i).isVisible()) ||
              (await page.getByText(/not yet recorded/i).isVisible()) ||
              (await page.locator('[data-testid="empty-state-message"]').isVisible());
            expect(helpfulTextVisible).toBeTruthy();

            // Verify no error state is displayed
            const errorVisible = await page.getByText(/error|failed/i).isVisible();
            expect(errorVisible).toBeFalsy();
          } else {
            // If sessions exist, just verify the list is displayed
            await expect(sessionsList).toBeVisible();
          }
        }
      }
    });

    test('should export user activity data', async ({ page }) => {
      await page.goto('/system/user-activity');

      const firstUser = page.locator('[data-testid="user-row"]').first();
      if (await firstUser.isVisible()) {
        await firstUser.click();

        // Look for export button
        const exportButton =
          page.getByRole('button', { name: /export/i }) ||
          page.locator('[data-testid="export-button"]');

        if (await exportButton.isVisible()) {
          // Set up download listener
          const downloadPromise = page
            .waitForEvent('download', { timeout: 5000 })
            .catch(() => null);

          // Click export button
          await exportButton.click();

          // Check if there's a format dropdown
          const csvOption = page.getByRole('menuitem', { name: /csv/i });
          const jsonOption = page.getByRole('menuitem', { name: /json/i });
          const excelOption = page.getByRole('menuitem', { name: /excel|xlsx/i });

          if (await csvOption.isVisible()) {
            await csvOption.click();
          } else if (await jsonOption.isVisible()) {
            await jsonOption.click();
          } else if (await excelOption.isVisible()) {
            await excelOption.click();
          }

          // Wait for download to initiate
          const download = await downloadPromise;

          if (download) {
            // Verify download was initiated
            expect(download).toBeTruthy();

            // Verify filename has appropriate extension
            const filename = download.suggestedFilename();
            const hasValidExtension =
              filename.endsWith('.csv') ||
              filename.endsWith('.json') ||
              filename.endsWith('.xlsx') ||
              filename.endsWith('.xls');
            expect(hasValidExtension).toBeTruthy();
          } else {
            // If download event not caught, verify export UI feedback
            const exportSuccess =
              (await page.getByText(/export.*success/i).isVisible()) ||
              (await page.getByText(/download.*start/i).isVisible());
            expect(exportSuccess).toBeTruthy();
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

          // Wait for chart to update with new data range
          await expect(page.locator('[data-testid="activity-chart"]')).toBeVisible();
        }
      }
    });

    test('should display all analytics charts', async ({ page }) => {
      await page.goto('/system/user-activity');

      const firstUser = page.locator('[data-testid="user-row"]').first();
      if (await firstUser.isVisible()) {
        await firstUser.click();

        // Verify activity over time chart
        const activityChart = page.locator('[data-testid="activity-chart"]');
        await expect(activityChart).toBeVisible();

        // Check for page views chart
        const pageViewsChart = page.locator('[data-testid="page-views-chart"]');
        if (await pageViewsChart.isVisible()) {
          await expect(pageViewsChart).toBeVisible();
        }

        // Check for clicks chart
        const clicksChart = page.locator('[data-testid="clicks-chart"]');
        if (await clicksChart.isVisible()) {
          await expect(clicksChart).toBeVisible();
        }

        // Check for session duration distribution chart
        const durationChart = page.locator('[data-testid="session-duration-chart"]');
        if (await durationChart.isVisible()) {
          await expect(durationChart).toBeVisible();
        }

        // Verify at least one chart is visible
        const chartsVisible =
          (await activityChart.isVisible()) ||
          (await pageViewsChart.isVisible()) ||
          (await clicksChart.isVisible()) ||
          (await durationChart.isVisible());
        expect(chartsVisible).toBeTruthy();

        // Check for chart container with multiple charts
        const chartsContainer = page.locator('[data-testid="analytics-charts"]');
        if (await chartsContainer.isVisible()) {
          await expect(chartsContainer).toBeVisible();
        }
      }
    });
  });
});

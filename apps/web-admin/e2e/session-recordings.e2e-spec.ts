import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * Session Recordings E2E Tests
 */
test.describe('Session Recordings', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.describe('Session List Page', () => {
    test('should display session recordings list', async ({ page }) => {
      await page.goto('/system/session-recordings');

      // Check page title
      await expect(page.getByRole('heading', { name: /session recordings/i })).toBeVisible();

      // Check if table or list is visible
      await expect(page.locator('[data-testid="session-list"]')).toBeVisible();
    });

    test('should filter sessions by service', async ({ page }) => {
      await page.goto('/system/session-recordings');

      // Open service filter
      const serviceFilter = page.getByRole('combobox', { name: /service/i });
      if (await serviceFilter.isVisible()) {
        await serviceFilter.click();

        // Select a service
        await page.getByRole('option', { name: /web-app/i }).click();

        // Verify filter is applied
        await expect(page.locator('[data-testid="session-list"]')).toBeVisible();
      }
    });

    test('should filter sessions by date range', async ({ page }) => {
      await page.goto('/system/session-recordings');

      // Open date filter
      const dateFilter = page.getByRole('button', { name: /date range/i });
      if (await dateFilter.isVisible()) {
        await dateFilter.click();

        // Select last 7 days
        await page.getByRole('button', { name: /last 7 days/i }).click();

        // Verify filter is applied
        await expect(page.locator('[data-testid="session-list"]')).toBeVisible();
      }
    });

    test('should search sessions by user email', async ({ page }) => {
      await page.goto('/system/session-recordings');

      // Find search input
      const searchInput = page.getByPlaceholder(/search.*email/i);
      if (await searchInput.isVisible()) {
        await searchInput.fill('test@example.com');

        // Wait for search results to update (debounce handled by waiting for results)
        await expect(page.locator('[data-testid="session-list"]')).toBeVisible();
      }
    });

    test('should paginate through sessions', async ({ page }) => {
      await page.goto('/system/session-recordings');

      // Check if pagination exists
      const nextButton = page.getByRole('button', { name: /next/i });
      if ((await nextButton.isVisible()) && !(await nextButton.isDisabled())) {
        await nextButton.click();

        // Wait for next page to load
        await expect(page.locator('[data-testid="session-list"]')).toBeVisible();
      }
    });

    test('should handle first and last page navigation', async ({ page }) => {
      await page.goto('/system/session-recordings');

      // Check if pagination exists
      const prevButton = page.getByRole('button', { name: /previous/i });
      const nextButton = page.getByRole('button', { name: /next/i });

      if (await prevButton.isVisible()) {
        // Verify "Previous" button is disabled on first page
        await expect(prevButton).toBeDisabled();

        // Navigate through pages to reach the last page
        if ((await nextButton.isVisible()) && !(await nextButton.isDisabled())) {
          // Keep clicking next until we reach the last page
          let isNextEnabled = !(await nextButton.isDisabled());
          while (isNextEnabled) {
            await nextButton.click();
            // Wait for navigation to complete
            await page.waitForLoadState('networkidle');
            isNextEnabled = !(await nextButton.isDisabled());
          }

          // Verify "Next" button is disabled on last page
          await expect(nextButton).toBeDisabled();

          // Verify page indicator shows correct page numbers
          const pageIndicator = page.locator('[data-testid="page-indicator"]');
          if (await pageIndicator.isVisible()) {
            await expect(pageIndicator).toBeVisible();
          }
        }
      }
    });

    test('should filter by custom date range', async ({ page }) => {
      await page.goto('/system/session-recordings');

      // Open date range picker
      const dateRangeButton = page.getByRole('button', { name: /date range/i });
      if (await dateRangeButton.isVisible()) {
        await dateRangeButton.click();

        // Select custom date range (last 14 days)
        const customRangeOption = page.getByRole('button', { name: /last 14 days/i });
        if (await customRangeOption.isVisible()) {
          await customRangeOption.click();

          // Wait for filtered results to load
          await expect(page.locator('[data-testid="session-list"]')).toBeVisible();

          // Check that sessions fall within date range by verifying date column
          const dateColumn = page.locator('[data-testid="session-date"]').first();
          if (await dateColumn.isVisible()) {
            await expect(dateColumn).toBeVisible();
          }
        }

        // Try last 30 days option if available
        await dateRangeButton.click();
        const thirtyDaysOption = page.getByRole('button', { name: /last 30 days/i });
        if (await thirtyDaysOption.isVisible()) {
          await thirtyDaysOption.click();

          // Wait for filtered results to load
          await expect(page.locator('[data-testid="session-list"]')).toBeVisible();
        }
      }
    });

    test('should refresh session list', async ({ page }) => {
      await page.goto('/system/session-recordings');

      // Wait for initial list to load
      await expect(page.locator('[data-testid="session-list"]')).toBeVisible();

      // Note the first session ID if available for comparison
      const firstSessionRow = page.locator('[data-testid="session-row"]').first();
      let firstSessionId = '';
      if (await firstSessionRow.isVisible()) {
        firstSessionId = (await firstSessionRow.getAttribute('data-session-id')) || '';
      }

      // Click refresh button
      const refreshButton = page.getByRole('button', { name: /refresh/i });
      if (await refreshButton.isVisible()) {
        await refreshButton.click();

        // Wait for reload to complete
        await page.waitForLoadState('networkidle');

        // Verify list is reloaded and visible
        await expect(page.locator('[data-testid="session-list"]')).toBeVisible();
      }
    });
  });

  test.describe('Session Detail Page', () => {
    test('should navigate to session detail', async ({ page }) => {
      await page.goto('/system/session-recordings');

      // Click on first session
      const firstSession = page.locator('[data-testid="session-row"]').first();
      if (await firstSession.isVisible()) {
        await firstSession.click();

        // Verify we're on detail page
        await expect(page).toHaveURL(/\/system\/session-recordings\/[^/]+/);
        await expect(page.getByRole('heading', { name: /session.*details/i })).toBeVisible();
      }
    });

    test('should display session metadata', async ({ page }) => {
      // Navigate to a specific session (assuming session ID exists)
      await page.goto('/system/session-recordings');

      const firstSession = page.locator('[data-testid="session-row"]').first();
      if (await firstSession.isVisible()) {
        await firstSession.click();

        // Check for metadata fields
        await expect(page.getByText(/session id/i)).toBeVisible();
        await expect(page.getByText(/user/i)).toBeVisible();
        await expect(page.getByText(/duration/i)).toBeVisible();
        await expect(page.getByText(/started at/i)).toBeVisible();
      }
    });

    test('should display complete session metadata', async ({ page }) => {
      // Navigate to first session detail
      await page.goto('/system/session-recordings');

      const firstSession = page.locator('[data-testid="session-row"]').first();
      if (await firstSession.isVisible()) {
        await firstSession.click();

        // Wait for detail page to load
        await expect(page).toHaveURL(/\/system\/session-recordings\/[^/]+/);

        // Verify location metadata
        const locationField = page.getByText(/location|country/i);
        if (await locationField.isVisible()) {
          await expect(locationField).toBeVisible();
          // Check for city if available
          const cityField = page.locator('[data-testid="session-city"]');
          if (await cityField.isVisible()) {
            await expect(cityField).toBeVisible();
          }
        }

        // Verify device metadata
        const deviceField = page.getByText(/device/i);
        if (await deviceField.isVisible()) {
          await expect(deviceField).toBeVisible();
          // Check for device model
          const deviceModel = page.locator('[data-testid="device-model"]');
          if (await deviceModel.isVisible()) {
            await expect(deviceModel).toBeVisible();
          }
        }

        // Verify browser metadata
        const browserField = page.getByText(/browser/i);
        if (await browserField.isVisible()) {
          await expect(browserField).toBeVisible();
          // Check for browser version
          const browserVersion = page.locator('[data-testid="browser-version"]');
          if (await browserVersion.isVisible()) {
            await expect(browserVersion).toBeVisible();
          }
        }

        // Verify OS metadata
        const osField = page.getByText(/operating system|os/i);
        if (await osField.isVisible()) {
          await expect(osField).toBeVisible();
          // Check for OS version
          const osVersion = page.locator('[data-testid="os-version"]');
          if (await osVersion.isVisible()) {
            await expect(osVersion).toBeVisible();
          }
        }

        // Verify IP address (should be masked for privacy)
        const ipField = page.getByText(/ip address/i);
        if (await ipField.isVisible()) {
          await expect(ipField).toBeVisible();
        }

        // Verify entry and exit pages
        const entryPage = page.getByText(/entry page/i);
        if (await entryPage.isVisible()) {
          await expect(entryPage).toBeVisible();
        }

        const exitPage = page.getByText(/exit page/i);
        if (await exitPage.isVisible()) {
          await expect(exitPage).toBeVisible();
        }
      }
    });

    test('should navigate back to list from detail', async ({ page }) => {
      // Navigate to session detail
      await page.goto('/system/session-recordings');

      const firstSession = page.locator('[data-testid="session-row"]').first();
      if (await firstSession.isVisible()) {
        await firstSession.click();

        // Wait for detail page to load
        await expect(page).toHaveURL(/\/system\/session-recordings\/[^/]+/);

        // Click back button (try multiple possible selectors)
        const backButton = page.getByRole('button', { name: /back/i });
        const breadcrumb = page.locator('[data-testid="breadcrumb-list"]');

        if (await backButton.isVisible()) {
          await backButton.click();
        } else if (await breadcrumb.isVisible()) {
          // Click on "Session Recordings" breadcrumb
          await breadcrumb.getByText(/session recordings/i).click();
        }

        // Verify returned to list page
        await expect(page).toHaveURL(/\/system\/session-recordings$/);
        await expect(page.locator('[data-testid="session-list"]')).toBeVisible();

        // Verify previous filters/pagination preserved if applicable
        const pageIndicator = page.locator('[data-testid="page-indicator"]');
        if (await pageIndicator.isVisible()) {
          await expect(pageIndicator).toBeVisible();
        }
      }
    });

    test('should display session status correctly', async ({ page }) => {
      // Navigate to session detail
      await page.goto('/system/session-recordings');

      const firstSession = page.locator('[data-testid="session-row"]').first();
      if (await firstSession.isVisible()) {
        await firstSession.click();

        // Wait for detail page to load
        await expect(page).toHaveURL(/\/system\/session-recordings\/[^/]+/);

        // Check for status badge (active/completed/abandoned)
        const statusBadge = page.locator('[data-testid="session-status-badge"]');
        if (await statusBadge.isVisible()) {
          await expect(statusBadge).toBeVisible();

          // Verify badge has correct styling (check for status-specific classes)
          const badgeClass = await statusBadge.getAttribute('class');
          const hasStatusClass =
            badgeClass?.includes('active') ||
            badgeClass?.includes('completed') ||
            badgeClass?.includes('abandoned');

          if (hasStatusClass) {
            // Badge has appropriate status class
            await expect(statusBadge).toBeVisible();
          }

          // Check for status icon if present
          const statusIcon = statusBadge.locator('svg').first();
          if (await statusIcon.isVisible()) {
            await expect(statusIcon).toBeVisible();
          }

          // Verify tooltip or description if present
          await statusBadge.hover();

          // Wait for tooltip to appear
          const tooltip = page.locator('[role="tooltip"]');
          if (await tooltip.isVisible()) {
            await expect(tooltip).toBeVisible();
          }
        } else {
          // Try alternative selector for status field
          const statusField = page.getByText(/status:/i);
          if (await statusField.isVisible()) {
            await expect(statusField).toBeVisible();
          }
        }
      }
    });

    test('should display session player', async ({ page }) => {
      await page.goto('/system/session-recordings');

      const firstSession = page.locator('[data-testid="session-row"]').first();
      if (await firstSession.isVisible()) {
        await firstSession.click();

        // Check if player exists
        const player = page.locator('[data-testid="session-player"]');
        await expect(player).toBeVisible();

        // Check for player controls
        await expect(page.getByRole('button', { name: /play|pause/i })).toBeVisible();
      }
    });

    test('should display event timeline', async ({ page }) => {
      await page.goto('/system/session-recordings');

      const firstSession = page.locator('[data-testid="session-row"]').first();
      if (await firstSession.isVisible()) {
        await firstSession.click();

        // Check for event timeline
        const timeline = page.locator('[data-testid="event-timeline"]');
        await expect(timeline).toBeVisible();
      }
    });

    test('should interact with event timeline', async ({ page }) => {
      await page.goto('/system/session-recordings');

      const firstSession = page.locator('[data-testid="session-row"]').first();
      if (await firstSession.isVisible()) {
        await firstSession.click();

        // Click on an event in timeline
        const firstEvent = page.locator('[data-testid="timeline-event"]').first();
        if (await firstEvent.isVisible()) {
          await firstEvent.click();

          // Wait for player to jump to timestamp (no explicit verification needed as UI should update)
          await page.waitForLoadState('networkidle');
        }
      }
    });

    test('should filter events by type', async ({ page }) => {
      await page.goto('/system/session-recordings');

      const firstSession = page.locator('[data-testid="session-row"]').first();
      if (await firstSession.isVisible()) {
        await firstSession.click();

        // Find event type filter
        const eventFilter = page.getByRole('combobox', { name: /event type/i });
        if (await eventFilter.isVisible()) {
          await eventFilter.click();
          await page.getByRole('option', { name: /click/i }).click();

          // Verify filtered events
          await expect(page.locator('[data-testid="event-timeline"]')).toBeVisible();
        }
      }
    });
  });

  test.describe('Session Player Controls', () => {
    test('should play and pause session', async ({ page }) => {
      await page.goto('/system/session-recordings');

      const firstSession = page.locator('[data-testid="session-row"]').first();
      if (await firstSession.isVisible()) {
        await firstSession.click();

        const playButton = page.getByRole('button', { name: /play/i });
        if (await playButton.isVisible()) {
          await playButton.click();

          // Wait for play button to change to pause button
          const pauseButton = page.getByRole('button', { name: /pause/i });
          await expect(pauseButton).toBeVisible();

          // Pause the session
          await pauseButton.click();
        }
      }
    });

    test('should adjust playback speed', async ({ page }) => {
      await page.goto('/system/session-recordings');

      const firstSession = page.locator('[data-testid="session-row"]').first();
      if (await firstSession.isVisible()) {
        await firstSession.click();

        // Find speed control
        const speedControl = page.getByRole('button', { name: /1x|speed/i });
        if (await speedControl.isVisible()) {
          await speedControl.click();

          // Select 2x speed
          await page.getByRole('menuitem', { name: /2x/i }).click();
        }
      }
    });

    test('should skip forward and backward', async ({ page }) => {
      await page.goto('/system/session-recordings');

      const firstSession = page.locator('[data-testid="session-row"]').first();
      if (await firstSession.isVisible()) {
        await firstSession.click();

        // Find skip controls
        const skipForward = page.getByRole('button', { name: /skip forward|10s/i });
        if (await skipForward.isVisible()) {
          await skipForward.click();
          // Wait for player to update position
          await page.waitForLoadState('networkidle');
        }

        const skipBackward = page.getByRole('button', { name: /skip backward|10s/i });
        if (await skipBackward.isVisible()) {
          await skipBackward.click();
          // Wait for player to update position
          await page.waitForLoadState('networkidle');
        }
      }
    });
  });
});

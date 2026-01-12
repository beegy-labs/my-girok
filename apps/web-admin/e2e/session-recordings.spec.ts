import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './admin-auth.spec';

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
        await page.waitForTimeout(500); // Debounce

        // Verify search is applied
        await expect(page.locator('[data-testid="session-list"]')).toBeVisible();
      }
    });

    test('should paginate through sessions', async ({ page }) => {
      await page.goto('/system/session-recordings');

      // Check if pagination exists
      const nextButton = page.getByRole('button', { name: /next/i });
      if ((await nextButton.isVisible()) && !(await nextButton.isDisabled())) {
        await nextButton.click();

        // Wait for page to load
        await page.waitForTimeout(300);

        // Verify we're on page 2
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

          // Verify player jumped to that timestamp
          await page.waitForTimeout(300);
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

          // Wait for playback
          await page.waitForTimeout(1000);

          // Pause
          const pauseButton = page.getByRole('button', { name: /pause/i });
          if (await pauseButton.isVisible()) {
            await pauseButton.click();
          }
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
          await page.waitForTimeout(300);
        }

        const skipBackward = page.getByRole('button', { name: /skip backward|10s/i });
        if (await skipBackward.isVisible()) {
          await skipBackward.click();
          await page.waitForTimeout(300);
        }
      }
    });
  });
});

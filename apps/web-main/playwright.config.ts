import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Improved: Use 50% of CPU cores for parallel execution (per TESTING.md policy)
  workers: process.env.CI ? Math.max(2, Math.floor(require('os').cpus().length * 0.5)) : undefined,
  reporter: process.env.CI ? [['html'], ['github']] : 'html',

  // Individual test timeout: 30 seconds
  timeout: 30000,

  use: {
    baseURL: 'http://localhost:3002',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3002',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});

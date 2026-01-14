/**
 * E2E Test Configuration
 *
 * Uses environment variables with fallback defaults for local development.
 * Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD in your environment or .env.test file.
 */

export const TEST_CONFIG = {
  // Admin credentials for testing
  admin: {
    email: process.env.E2E_TEST_EMAIL || 'super_admin@girok.dev',
    password: process.env.E2E_TEST_PASSWORD || 'SuperAdmin123!',
  },

  // Service URLs
  baseUrl: process.env.E2E_BASE_URL || 'http://localhost:3002',
  authBffUrl: process.env.E2E_AUTH_BFF_URL || 'http://localhost:4005',

  // API endpoints
  endpoints: {
    analytics: '/admin/analytics',
    authorization: '/admin/authorization',
    teams: '/admin/teams',
    recordings: '/recordings',
  },

  // Test timeouts (in ms)
  timeouts: {
    short: 1000,
    medium: 3000,
    long: 5000,
  },
} as const;

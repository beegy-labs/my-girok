# E2E Tests - Web Admin

> End-to-end testing suite for the web-admin application using Playwright

## Overview

This directory contains E2E tests for the my-girok web-admin application. Tests cover critical user flows including authentication, session recordings, user activity, authorization management, and analytics.

### Test Framework

- **Framework**: Playwright 1.57.0
- **Language**: TypeScript
- **Browser**: Chromium (Desktop)
- **Base URL**: `http://localhost:3002`

### Test Coverage

| Feature              | Test File                        | Test Cases | Status      |
| -------------------- | -------------------------------- | ---------- | ----------- |
| Admin Authentication | `admin-auth.spec.ts`             | 5          | ✅ Complete |
| Session Recordings   | `session-recordings.e2e-spec.ts` | 10+        | ✅ Enhanced |
| User Activity        | `user-activity.e2e-spec.ts`      | 12+        | ✅ Enhanced |
| Authorization        | `authorization.e2e-spec.ts`      | 15+        | ✅ Enhanced |
| Analytics            | `analytics.e2e-spec.ts`          | 8          | ✅ New      |
| API Integration      | `api-integration.e2e-spec.ts`    | 20+        | ✅ New      |
| Audit Logs           | `audit-logs.spec.ts`             | 6          | ✅ Complete |
| Menu Navigation      | `menu-navigation.spec.ts`        | 5          | ✅ Complete |
| Legal Documents      | `legal-documents.spec.ts`        | 6          | ✅ Complete |
| Tenants              | `tenants.spec.ts`                | 5          | ✅ Complete |

**Total**: 10 test files, 90+ test cases

---

## Running Tests

### Prerequisites

1. Start the web-admin development server:

```bash
cd apps/web-admin
pnpm dev
```

2. Ensure backend services are running:
   - `auth-bff` (port 4005)
   - `analytics-service` (port 50056)
   - `authorization-service` (port 50055)
   - `audit-service` (port 50054)

### Commands

```bash
# Run all E2E tests
pnpm test:e2e

# Run specific test file
pnpm test:e2e session-recordings

# Run in UI mode (interactive debugging)
pnpm test:e2e:ui

# Run in headed mode (see browser)
pnpm test:e2e:headed

# Run with specific grep pattern
pnpm test:e2e --grep "should display analytics"

# Run in debug mode
PWDEBUG=1 pnpm test:e2e
```

### CI Mode

Tests automatically run in CI with:

- 2 retries on failure
- 1 worker (no parallel execution)
- HTML reporter
- Screenshots on failure
- Trace on first retry

---

## Writing Tests

### Test Pattern: Inline Helpers

We use inline helper functions for common operations to keep tests simple and maintainable.

#### Authentication Helper

```typescript
import { loginAsAdmin } from './helpers/auth';

test.beforeEach(async ({ page }) => {
  await loginAsAdmin(page);
});
```

#### Navigation Pattern

```typescript
test('should navigate to page', async ({ page }) => {
  await page.goto('/system/session-recordings');
  await expect(page).toHaveURL('/system/session-recordings');
});
```

#### Element Interaction

```typescript
test('should filter sessions', async ({ page }) => {
  // Use semantic selectors
  await page.getByRole('button', { name: /filter/i }).click();
  await page.getByLabel(/device type/i).selectOption('desktop');

  // Use data-testid for complex components
  const sessionList = page.locator('[data-testid="session-list"]');
  await expect(sessionList).toBeVisible();
});
```

#### API Testing

```typescript
test('should return valid response', async ({ request }) => {
  const response = await request.get('/admin/analytics/users/top', {
    headers: { Cookie: 'sessionId=...' },
  });

  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  expect(data).toHaveProperty('data');
  expect(Array.isArray(data.data)).toBeTruthy();
});
```

---

## Test Organization

### File Naming Convention

- `*.spec.ts` - Unit/component tests (Vitest)
- `*.e2e-spec.ts` - E2E tests (Playwright)

### Test Structure

```typescript
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/feature-path');
  });

  test.describe('Sub-feature', () => {
    test('should perform action', async ({ page }) => {
      // Arrange
      const button = page.getByRole('button', { name: /click me/i });

      // Act
      await button.click();

      // Assert
      await expect(page.getByText(/success/i)).toBeVisible();
    });
  });
});
```

---

## Locator Strategies

### Preferred Order

1. **Semantic selectors** (Accessible to users and screen readers):

   ```typescript
   page.getByRole('button', { name: /submit/i });
   page.getByLabel(/email/i);
   page.getByPlaceholder(/search/i);
   page.getByText(/welcome/i);
   ```

2. **Data attributes** (For components without semantic meaning):

   ```typescript
   page.locator('[data-testid="session-list"]');
   page.locator('[data-testid="user-summary-card"]');
   ```

3. **CSS selectors** (As last resort):
   ```typescript
   page.locator('.recharts-responsive-container');
   page.locator('table tbody tr');
   ```

### Anti-Patterns

❌ Avoid:

- Brittle selectors tied to implementation: `.css-abc123`
- Text selectors without i18n consideration: `getByText('Submit')`
- XPath selectors: `//div[@class='container']/button[1]`

---

## Best Practices

### 1. Use `waitFor` for Dynamic Content

```typescript
// Wait for specific state
await page.waitForLoadState('networkidle');

// Wait for selector
await page.waitForSelector('[data-testid="list-loaded"]');

// Wait with assertion
await expect(page.getByText(/loaded/i)).toBeVisible({ timeout: 5000 });
```

### 2. Isolate Tests

Each test should be independent and not rely on previous tests:

```typescript
test.beforeEach(async ({ page }) => {
  // Fresh state for each test
  await loginAsAdmin(page);
  await page.goto('/teams');
});

test.afterEach(async ({ page }) => {
  // Clean up if needed
});
```

### 3. Use Descriptive Test Names

```typescript
✅ test('should display error toast when login fails with invalid credentials')
❌ test('login error')
```

### 4. Handle Flaky Tests

```typescript
// Retry individual assertions
await expect(async () => {
  await page.getByRole('button').click();
  await expect(page.getByText('Success')).toBeVisible();
}).toPass({ timeout: 10000 });

// Wait for specific conditions
await page.waitForFunction(() => {
  return document.querySelectorAll('.item').length > 5;
});
```

### 5. Test Real User Flows

```typescript
test('should complete team creation workflow', async ({ page }) => {
  // Step 1: Navigate
  await page.goto('/authorization');

  // Step 2: Switch tab
  await page.getByRole('tab', { name: /teams/i }).click();

  // Step 3: Create team
  await page.getByRole('button', { name: /create team/i }).click();
  await page.getByLabel(/team name/i).fill('Engineering');
  await page.getByRole('button', { name: /save/i }).click();

  // Step 4: Verify success
  await expect(page.getByText(/team created/i)).toBeVisible();
  await expect(page.getByText('Engineering')).toBeVisible();
});
```

---

## Debugging Tests

### 1. UI Mode (Recommended)

```bash
pnpm test:e2e:ui
```

- Interactive test explorer
- Time-travel debugging
- Watch mode
- Visual step-through

### 2. Headed Mode

```bash
pnpm test:e2e:headed
```

Watch tests run in real browser

### 3. Debug Mode

```bash
PWDEBUG=1 pnpm test:e2e
```

Playwright Inspector with:

- Step-by-step execution
- Locator picker
- Console logs

### 4. Console Logging

```typescript
test('debug test', async ({ page }) => {
  // Log to console
  console.log(await page.title());

  // Capture console from page
  page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));

  // Take screenshot
  await page.screenshot({ path: 'debug.png' });
});
```

---

## Common Issues & Solutions

### Issue: Test Timeout

**Problem**: Test fails with timeout error

**Solutions**:

1. Increase timeout:

   ```typescript
   test('slow test', async ({ page }) => {
     test.setTimeout(60000); // 60 seconds
     // ...
   });
   ```

2. Wait for specific condition:
   ```typescript
   await page.waitForLoadState('networkidle');
   await expect(element).toBeVisible({ timeout: 10000 });
   ```

### Issue: Element Not Found

**Problem**: `Error: Element not found`

**Solutions**:

1. Verify selector:

   ```bash
   # Use Playwright Inspector
   PWDEBUG=1 pnpm test:e2e
   ```

2. Wait for element:

   ```typescript
   await page.waitForSelector('[data-testid="element"]');
   ```

3. Check visibility:
   ```typescript
   const isVisible = await element.isVisible();
   if (isVisible) {
     await element.click();
   }
   ```

### Issue: Flaky Tests

**Problem**: Test passes sometimes, fails other times

**Solutions**:

1. Remove race conditions:

   ```typescript
   // ❌ Bad: Race condition
   await page.click('button');
   expect(await page.textContent('.result')).toBe('Success');

   // ✅ Good: Wait for state
   await page.click('button');
   await expect(page.locator('.result')).toHaveText('Success');
   ```

2. Use built-in waits:
   ```typescript
   // Playwright auto-waits for:
   // - Element to be visible
   // - Element to be enabled
   // - Element to be stable (not animating)
   await page.click('button'); // Auto-waits
   ```

### Issue: Authentication Required

**Problem**: Test fails because not logged in

**Solution**: Use auth helper in `beforeEach`:

```typescript
import { loginAsAdmin } from './helpers/auth';

test.beforeEach(async ({ page }) => {
  await loginAsAdmin(page);
});
```

---

## Test Data

### Test Credentials

```typescript
// DO NOT commit real credentials
const TEST_ADMIN = {
  email: 'super_admin@girok.dev',
  password: 'SuperAdmin123!',
};
```

**Recommendation**: Use environment variables:

```typescript
const TEST_ADMIN = {
  email: process.env.E2E_TEST_EMAIL,
  password: process.env.E2E_TEST_PASSWORD,
};
```

### Test Data Strategy

1. **Fixtures**: Create test data before tests
2. **Cleanup**: Remove test data after tests
3. **Isolation**: Each test uses unique data

---

## Configuration

### Playwright Config

Location: `/apps/web-admin/playwright.config.ts`

Key settings:

```typescript
{
  testDir: './e2e',
  baseURL: 'http://localhost:3002',
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  use: {
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
}
```

### Update Configuration

```bash
# Edit config
vim playwright.config.ts

# Validate config
pnpm test:e2e --list
```

---

## CI/CD Integration

Tests run automatically on:

- Pull requests to `develop` or `main`
- Push to `develop` or `main`

### GitHub Actions Workflow

```yaml
- name: Run E2E tests
  run: pnpm test:e2e
  env:
    CI: true
```

### Test Reports

- **HTML Report**: Generated in `playwright-report/`
- **JUnit XML**: For CI integration
- **Screenshots**: Captured on failure
- **Traces**: Captured on retry

View HTML report:

```bash
pnpm playwright show-report
```

---

## Contributing

### Adding New Tests

1. Create new test file: `feature-name.e2e-spec.ts`
2. Import helpers: `import { loginAsAdmin } from './helpers/auth';`
3. Write tests following patterns above
4. Run tests: `pnpm test:e2e feature-name`
5. Verify in CI mode: `CI=1 pnpm test:e2e feature-name`
6. Update this README if adding new features

### Code Review Checklist

- [ ] Tests follow existing patterns
- [ ] Semantic selectors used where possible
- [ ] Tests are isolated and independent
- [ ] Descriptive test names
- [ ] No hardcoded waits (`page.waitForTimeout`)
- [ ] Error cases tested
- [ ] Tests pass in CI mode

---

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Test Coverage Report](../../docs/test-coverage.md)
- [Integration Checklist](../../.tasks/integration-checklist.md)

---

**Last Updated**: 2026-01-13

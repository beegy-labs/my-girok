# E2E and Integration Testing

> End-to-end testing patterns and best practices

## Overview

This document covers end-to-end (E2E) testing patterns, API integration testing, and system integration testing strategies for the my-girok platform.

## E2E Testing Patterns

### Best Practices

**DO:**

- Use semantic selectors: `getByRole()`, `getByLabel()`, `getByText()`
- Use data-testid for complex components
- Use Playwright's auto-waiting: `expect(locator).toBeVisible()`
- Wait for conditions: `page.waitForLoadState('networkidle')`
- Use environment variables for credentials
- Use test data factories
- Isolate tests - each should be independent

**DON'T:**

- Use `page.waitForTimeout()` - causes flaky tests
- Hardcode credentials
- Use CSS selectors tied to implementation
- Use XPath selectors
- Rely on test execution order

## Test Data Management

Use factories to generate consistent test data:

```typescript
import { TEST_CONFIG } from './fixtures/test-config';
import { testData } from './fixtures/test-data';

test('should create team', async ({ page }) => {
  await loginAsAdmin(page);

  const teamName = testData.team().name;
  await page.getByLabel(/team name/i).fill(teamName);
  await page.getByRole('button', { name: /save/i }).click();
  await expect(page.getByText(teamName)).toBeVisible();
});
```

## API Integration Testing

### Benefits

- Faster than E2E (no browser overhead)
- More stable (no UI flakiness)
- Tests API contract independently

### Pattern

```typescript
test('should return user summary via API', async ({ request }) => {
  const response = await request.get('/admin/analytics/users/top', {
    headers: { Cookie: sessionCookie },
  });

  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  expect(data).toHaveProperty('data');
  expect(Array.isArray(data.data)).toBeTruthy();
});
```

## System Integration Testing

### Script

**Location**: `scripts/test-integration.sh`

### Checks Performed

- Service health endpoints
- gRPC port availability
- API endpoint responses
- Service-to-service communication

### Usage

```bash
./scripts/test-integration.sh

# With custom URLs
AUTH_BFF_URL=http://staging:4005 ./scripts/test-integration.sh
```

### Environment Variables

| Variable             | Description                   |
| -------------------- | ----------------------------- |
| `AUTH_BFF_URL`       | Auth BFF service URL          |
| `ANALYTICS_PORT`     | Analytics gRPC port           |
| `AUTHORIZATION_PORT` | Authorization gRPC port       |
| `SESSION_COOKIE`     | Session cookie for auth tests |

## Test Types Overview

| Type               | Pattern                       | Purpose           | Location                           |
| ------------------ | ----------------------------- | ----------------- | ---------------------------------- |
| Unit               | `*.spec.ts`                   | Service logic     | `src/**/*.spec.ts`                 |
| E2E                | `*.e2e-spec.ts`               | User flows        | `apps/web-admin/e2e/`              |
| API Integration    | `api-integration.e2e-spec.ts` | Backend endpoints | `apps/web-admin/e2e/`              |
| System Integration | `test-integration.sh`         | Service health    | `scripts/`                         |
| gRPC Controller    | `*.grpc.controller.spec.ts`   | gRPC endpoints    | `src/**/*.grpc.controller.spec.ts` |

## Playwright Configuration

### Page Object Model

```typescript
// pages/login.page.ts
export class LoginPage {
  constructor(private page: Page) {}

  async login(email: string, password: string) {
    await this.page.getByLabel(/email/i).fill(email);
    await this.page.getByLabel(/password/i).fill(password);
    await this.page.getByRole('button', { name: /sign in/i }).click();
  }
}
```

### Test Fixtures

```typescript
// fixtures.ts
import { test as base } from '@playwright/test';
import { LoginPage } from './pages/login.page';

export const test = base.extend<{ loginPage: LoginPage }>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
});
```

## Running Tests

```bash
# Run all E2E tests
pnpm --filter web-admin test:e2e

# Run specific test file
pnpm --filter web-admin test:e2e auth.e2e-spec.ts

# Run with UI mode
pnpm --filter web-admin test:e2e --ui

# Run with debug
pnpm --filter web-admin test:e2e --debug
```

## Related Documentation

- E2E Guide: `apps/web-admin/e2e/README.md`
- Error Handling: `docs/en/guides/frontend-error-handling.md`
- Testing Utilities: `docs/en/policies/testing-utilities.md`
- Main Testing Policy: `docs/en/policies/testing.md`

---

_This document is auto-generated from `docs/llm/policies/testing-e2e.md`_

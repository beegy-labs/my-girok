# E2E and Integration Testing

> End-to-end testing patterns and best practices

## E2E Testing Patterns

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

**Benefits:**

- Faster than E2E (no browser overhead)
- More stable (no UI flakiness)
- Tests API contract independently

**Pattern:**

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

**Script**: `scripts/test-integration.sh`

**Checks:**

- Service health endpoints
- gRPC port availability
- API endpoint responses
- Service-to-service communication

**Usage:**

```bash
./scripts/test-integration.sh

# With custom URLs
AUTH_BFF_URL=http://staging:4005 ./scripts/test-integration.sh
```

**Environment Variables:**

- `AUTH_BFF_URL` - Auth BFF service URL
- `ANALYTICS_PORT` - Analytics gRPC port
- `AUTHORIZATION_PORT` - Authorization gRPC port
- `SESSION_COOKIE` - Session cookie for authenticated tests

## Test Types Overview

| Type               | Pattern                       | Purpose           | Location                           |
| ------------------ | ----------------------------- | ----------------- | ---------------------------------- |
| Unit               | `*.spec.ts`                   | Service logic     | `src/**/*.spec.ts`                 |
| E2E                | `*.e2e-spec.ts`               | User flows        | `apps/web-admin/e2e/`              |
| API Integration    | `api-integration.e2e-spec.ts` | Backend endpoints | `apps/web-admin/e2e/`              |
| System Integration | `test-integration.sh`         | Service health    | `scripts/`                         |
| gRPC Controller    | `*.grpc.controller.spec.ts`   | gRPC endpoints    | `src/**/*.grpc.controller.spec.ts` |

## References

- **E2E Guide**: `apps/web-admin/e2e/README.md`
- **Error Handling**: `docs/llm/guides/frontend-error-handling.md`

---

_Related: `testing.md` | `testing-utilities.md`_

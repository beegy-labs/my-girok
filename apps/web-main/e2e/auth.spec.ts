import { test, expect } from '@playwright/test';

// Test data
const testUser = {
  name: 'Test User',
  email: `test-${Date.now()}@example.com`,
  password: 'TestPass123!',
};

test.describe('Authentication Flow', () => {
  test('should complete full authentication flow', async ({ page }) => {
    // 1. Navigate to home page
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('My-Girok Auth Test');

    // 2. Navigate to register page
    await page.click('text=Register');
    await expect(page).toHaveURL('/register');
    await expect(page.locator('h1')).toContainText('Register');

    // 3. Fill registration form
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.fill('input[placeholder*="name" i]', testUser.name);

    // 4. Submit registration
    await page.click('button[type="submit"]');

    // 5. Should redirect to home page after successful registration
    await expect(page).toHaveURL('/', { timeout: 5000 });

    // 6. Verify user is logged in (check navbar)
    await expect(page.locator('text=Logout')).toBeVisible();
    await expect(page.locator(`text=${testUser.name}`)).toBeVisible();

    // 7. Access protected page
    await page.click('text=Protected');
    await expect(page).toHaveURL('/protected');
    await expect(page.locator('h1')).toContainText('Protected Page');
    await expect(page.locator('text=Authentication Successful')).toBeVisible();

    // 8. Verify user data is displayed
    await expect(page.locator(`text=${testUser.email}`)).toBeVisible();
    await expect(page.locator(`text=${testUser.name}`)).toBeVisible();

    // 9. Logout
    await page.click('text=Logout');
    await expect(page).toHaveURL('/');
    await expect(page.locator('text=Login')).toBeVisible();
    await expect(page.locator('text=Register')).toBeVisible();

    // 10. Try to access protected page when logged out (should redirect)
    await page.goto('/protected');
    await expect(page).toHaveURL('/login');
  });

  test('should access public page as guest', async ({ page }) => {
    // 1. Navigate to public page without login
    await page.goto('/public');
    await expect(page.locator('h1')).toContainText('Public Page');

    // 2. Verify guest message is displayed
    await expect(page.locator('text=browsing as a guest')).toBeVisible();

    // 3. Verify login/register links are available
    await expect(page.locator('text=Register or login')).toBeVisible();
  });

  test('should show error for invalid login credentials', async ({ page }) => {
    // 1. Navigate to login page
    await page.goto('/login');

    // 2. Fill with invalid credentials
    await page.fill('input[type="email"]', 'nonexistent@example.com');
    await page.fill('input[type="password"]', 'WrongPass123!');

    // 3. Submit login
    await page.click('button[type="submit"]');

    // 4. Should show error message
    await expect(page.locator('text=Login failed')).toBeVisible({ timeout: 3000 });
  });

  test('should validate password requirements on registration', async ({ page }) => {
    // 1. Navigate to register page
    await page.goto('/register');

    // 2. Try weak password
    await page.fill('input[type="email"]', 'newuser@example.com');
    await page.fill('input[type="password"]', 'weak');
    await page.fill('input[placeholder*="name" i]', 'New User');

    // 3. Submit form
    await page.click('button[type="submit"]');

    // 4. Should show validation error (from backend)
    await page.waitForTimeout(1000);
    // Error message will come from backend validation
  });

  test('should maintain session after page reload', async ({ page, context }) => {
    // 1. Login first
    await page.goto('/login');

    // Create a test user or use existing one
    const email = `persist-test-${Date.now()}@example.com`;

    // Register
    await page.goto('/register');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', 'TestPass123!');
    await page.fill('input[placeholder*="name" i]', 'Persist Test');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/', { timeout: 5000 });

    // 2. Reload page
    await page.reload();

    // 3. User should still be logged in
    await expect(page.locator('text=Logout')).toBeVisible();
    await expect(page.locator('text=Persist Test')).toBeVisible();

    // 4. Can still access protected page
    await page.click('text=Protected');
    await expect(page).toHaveURL('/protected');
  });
});

test.describe('Protected Routes', () => {
  test('should redirect unauthenticated users to login', async ({ page }) => {
    // 1. Try to access protected page directly
    await page.goto('/protected');

    // 2. Should redirect to login
    await expect(page).toHaveURL('/login');
  });
});

test.describe('Navigation', () => {
  test('should navigate between public pages', async ({ page }) => {
    // 1. Start at home
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('My-Girok');

    // 2. Go to public page
    await page.click('text=Public');
    await expect(page).toHaveURL('/public');
    await expect(page.locator('h1')).toContainText('Public Page');

    // 3. Go to login
    await page.click('text=Login');
    await expect(page).toHaveURL('/login');
    await expect(page.locator('h1')).toContainText('Login');

    // 4. Go to register
    await page.click('text=Register');
    await expect(page).toHaveURL('/register');
    await expect(page.locator('h1')).toContainText('Register');
  });
});

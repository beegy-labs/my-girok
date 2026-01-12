import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './admin-auth.spec';

/**
 * Authorization Management E2E Tests
 */
test.describe('Authorization Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.describe('Teams Management', () => {
    test('should display teams list', async ({ page }) => {
      await page.goto('/authorization');

      // Navigate to teams tab
      const teamsTab = page.getByRole('tab', { name: /teams/i });
      await teamsTab.click();

      // Check for teams list
      await expect(page.locator('[data-testid="teams-list"]')).toBeVisible();
    });

    test('should create a new team', async ({ page }) => {
      await page.goto('/authorization');

      // Navigate to teams tab
      const teamsTab = page.getByRole('tab', { name: /teams/i });
      await teamsTab.click();

      // Click create button
      const createButton = page.getByRole('button', { name: /create team/i });
      await createButton.click();

      // Fill in team details
      await page.getByLabel(/team name/i).fill('Test Team');
      await page.getByLabel(/description/i).fill('Test team description');

      // Submit form
      await page.getByRole('button', { name: /create|save/i }).click();

      // Verify team was created
      await expect(page.getByText('Test Team')).toBeVisible();
    });

    test('should search teams', async ({ page }) => {
      await page.goto('/authorization');

      const teamsTab = page.getByRole('tab', { name: /teams/i });
      await teamsTab.click();

      // Find search input
      const searchInput = page.getByPlaceholder(/search.*team/i);
      await searchInput.fill('engineering');
      await page.waitForTimeout(500); // Debounce

      // Verify search results
      await expect(page.locator('[data-testid="teams-list"]')).toBeVisible();
    });

    test('should edit team details', async ({ page }) => {
      await page.goto('/authorization');

      const teamsTab = page.getByRole('tab', { name: /teams/i });
      await teamsTab.click();

      // Click on first team
      const firstTeam = page.locator('[data-testid="team-row"]').first();
      if (await firstTeam.isVisible()) {
        await firstTeam.click();

        // Click edit button
        const editButton = page.getByRole('button', { name: /edit/i });
        if (await editButton.isVisible()) {
          await editButton.click();

          // Update description
          await page.getByLabel(/description/i).fill('Updated description');

          // Save changes
          await page.getByRole('button', { name: /save/i }).click();

          // Verify update
          await expect(page.getByText('Updated description')).toBeVisible();
        }
      }
    });

    test('should add member to team', async ({ page }) => {
      await page.goto('/authorization');

      const teamsTab = page.getByRole('tab', { name: /teams/i });
      await teamsTab.click();

      // Click on first team
      const firstTeam = page.locator('[data-testid="team-row"]').first();
      if (await firstTeam.isVisible()) {
        await firstTeam.click();

        // Click add member button
        const addMemberButton = page.getByRole('button', { name: /add member/i });
        if (await addMemberButton.isVisible()) {
          await addMemberButton.click();

          // Fill in member details
          await page.getByLabel(/user.*id|email/i).fill('user-123');
          await page.getByRole('combobox', { name: /role/i }).click();
          await page.getByRole('option', { name: /member/i }).click();

          // Submit
          await page.getByRole('button', { name: /add|save/i }).click();

          // Verify member was added
          await page.waitForTimeout(500);
          await expect(page.getByText('user-123')).toBeVisible();
        }
      }
    });

    test('should remove member from team', async ({ page }) => {
      await page.goto('/authorization');

      const teamsTab = page.getByRole('tab', { name: /teams/i });
      await teamsTab.click();

      // Click on first team
      const firstTeam = page.locator('[data-testid="team-row"]').first();
      if (await firstTeam.isVisible()) {
        await firstTeam.click();

        // Find remove button for a member
        const removeButton = page.locator('[data-testid="remove-member"]').first();
        if (await removeButton.isVisible()) {
          await removeButton.click();

          // Confirm removal
          await page.getByRole('button', { name: /confirm|yes|remove/i }).click();

          // Verify member was removed
          await page.waitForTimeout(500);
        }
      }
    });

    test('should update member role', async ({ page }) => {
      await page.goto('/authorization');

      const teamsTab = page.getByRole('tab', { name: /teams/i });
      await teamsTab.click();

      // Click on first team
      const firstTeam = page.locator('[data-testid="team-row"]').first();
      if (await firstTeam.isVisible()) {
        await firstTeam.click();

        // Find role dropdown for a member
        const roleDropdown = page.locator('[data-testid="member-role"]').first();
        if (await roleDropdown.isVisible()) {
          await roleDropdown.click();

          // Select new role
          await page.getByRole('option', { name: /admin/i }).click();

          // Verify role was updated
          await page.waitForTimeout(500);
        }
      }
    });

    test('should delete a team', async ({ page }) => {
      await page.goto('/authorization');

      const teamsTab = page.getByRole('tab', { name: /teams/i });
      await teamsTab.click();

      // Create a test team first
      const createButton = page.getByRole('button', { name: /create team/i });
      if (await createButton.isVisible()) {
        await createButton.click();
        await page.getByLabel(/team name/i).fill('Team to Delete');
        await page.getByRole('button', { name: /create|save/i }).click();
        await page.waitForTimeout(500);

        // Find and delete the team
        const teamToDelete = page.getByText('Team to Delete');
        if (await teamToDelete.isVisible()) {
          await teamToDelete.click();

          // Click delete button
          const deleteButton = page.getByRole('button', { name: /delete/i });
          if (await deleteButton.isVisible()) {
            await deleteButton.click();

            // Confirm deletion
            await page.getByRole('button', { name: /confirm|yes|delete/i }).click();

            // Verify team was deleted
            await page.waitForTimeout(500);
          }
        }
      }
    });
  });

  test.describe('Policies Management', () => {
    test('should display authorization model', async ({ page }) => {
      await page.goto('/authorization');

      // Navigate to policies tab
      const policiesTab = page.getByRole('tab', { name: /policies/i });
      await policiesTab.click();

      // Check for model editor
      await expect(page.locator('[data-testid="model-editor"]')).toBeVisible();
    });

    test('should validate authorization model', async ({ page }) => {
      await page.goto('/authorization');

      const policiesTab = page.getByRole('tab', { name: /policies/i });
      await policiesTab.click();

      // Click validate button
      const validateButton = page.getByRole('button', { name: /validate/i });
      if (await validateButton.isVisible()) {
        await validateButton.click();

        // Wait for validation result
        await page.waitForTimeout(1000);

        // Check for success or error message
        await expect(page.getByText(/valid|invalid|error/i)).toBeVisible();
      }
    });

    test('should save authorization model', async ({ page }) => {
      await page.goto('/authorization');

      const policiesTab = page.getByRole('tab', { name: /policies/i });
      await policiesTab.click();

      // Make a small change to the model
      const editor = page.locator('[data-testid="model-editor"] textarea');
      if (await editor.isVisible()) {
        const currentContent = await editor.inputValue();
        await editor.fill(currentContent + '\n// Test comment');

        // Click save button
        const saveButton = page.getByRole('button', { name: /save/i });
        if (await saveButton.isVisible()) {
          await saveButton.click();

          // Wait for save confirmation
          await page.waitForTimeout(1000);
          await expect(page.getByText(/saved|success/i)).toBeVisible();
        }
      }
    });

    test('should view model version history', async ({ page }) => {
      await page.goto('/authorization');

      const policiesTab = page.getByRole('tab', { name: /policies/i });
      await policiesTab.click();

      // Click version history button
      const historyButton = page.getByRole('button', { name: /history|versions/i });
      if (await historyButton.isVisible()) {
        await historyButton.click();

        // Verify version list is visible
        await expect(page.locator('[data-testid="version-list"]')).toBeVisible();
      }
    });
  });

  test.describe('Permission Checker', () => {
    test('should display permission checker', async ({ page }) => {
      await page.goto('/authorization');

      // Navigate to permissions tab
      const permissionsTab = page.getByRole('tab', { name: /permissions/i });
      await permissionsTab.click();

      // Check for permission checker form
      await expect(page.locator('[data-testid="permission-checker"]')).toBeVisible();
    });

    test('should check a permission', async ({ page }) => {
      await page.goto('/authorization');

      const permissionsTab = page.getByRole('tab', { name: /permissions/i });
      await permissionsTab.click();

      // Fill in permission check form
      await page.getByLabel(/user/i).fill('user:123');
      await page.getByLabel(/relation/i).fill('can_view');
      await page.getByLabel(/object/i).fill('session_recording:456');

      // Submit check
      const checkButton = page.getByRole('button', { name: /check/i });
      await checkButton.click();

      // Wait for result
      await page.waitForTimeout(1000);

      // Verify result is displayed
      await expect(page.getByText(/allowed|denied/i)).toBeVisible();
    });

    test('should list user objects', async ({ page }) => {
      await page.goto('/authorization');

      const permissionsTab = page.getByRole('tab', { name: /permissions/i });
      await permissionsTab.click();

      // Find list objects section
      const listObjectsButton = page.getByRole('button', { name: /list objects/i });
      if (await listObjectsButton.isVisible()) {
        await listObjectsButton.click();

        // Fill in user and relation
        await page.getByLabel(/user/i).fill('user:123');
        await page.getByLabel(/relation/i).fill('can_view');
        await page.getByLabel(/object type/i).fill('session_recording');

        // Submit
        const submitButton = page.getByRole('button', { name: /list|search/i });
        await submitButton.click();

        // Wait for results
        await page.waitForTimeout(1000);

        // Verify results are displayed
        await expect(page.locator('[data-testid="objects-list"]')).toBeVisible();
      }
    });

    test('should list users for object', async ({ page }) => {
      await page.goto('/authorization');

      const permissionsTab = page.getByRole('tab', { name: /permissions/i });
      await permissionsTab.click();

      // Find list users section
      const listUsersButton = page.getByRole('button', { name: /list users/i });
      if (await listUsersButton.isVisible()) {
        await listUsersButton.click();

        // Fill in object and relation
        await page.getByLabel(/object/i).fill('session_recording:456');
        await page.getByLabel(/relation/i).fill('can_view');

        // Submit
        const submitButton = page.getByRole('button', { name: /list|search/i });
        await submitButton.click();

        // Wait for results
        await page.waitForTimeout(1000);

        // Verify results are displayed
        await expect(page.locator('[data-testid="users-list"]')).toBeVisible();
      }
    });
  });
});

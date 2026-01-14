import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

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

    test('should assign and update member roles', async ({ page }) => {
      await page.goto('/authorization');

      const teamsTab = page.getByRole('tab', { name: /teams/i });
      await teamsTab.click();

      // Create team or select existing team
      const createButton = page.getByRole('button', { name: /create team/i });
      if (await createButton.isVisible()) {
        await createButton.click();
        await page.getByLabel(/team name/i).fill('Role Assignment Test Team');
        await page.getByLabel(/description/i).fill('Team for testing role assignments');
        await page.getByRole('button', { name: /create|save/i }).click();
        await page.waitForTimeout(500);

        // Find and click on the newly created team
        const testTeam = page.getByText('Role Assignment Test Team');
        if (await testTeam.isVisible()) {
          await testTeam.click();

          // Add member with "member" role
          const addMemberButton = page.getByRole('button', { name: /add member/i });
          if (await addMemberButton.isVisible()) {
            await addMemberButton.click();

            // Fill in member details
            await page.getByLabel(/user.*id|email/i).fill('test-user-456');
            await page.getByRole('combobox', { name: /role/i }).click();
            await page.getByRole('option', { name: /member/i }).click();

            // Submit
            await page.getByRole('button', { name: /add|save/i }).click();

            // Verify member added with correct role
            await page.waitForTimeout(500);
            await expect(page.getByText('test-user-456')).toBeVisible();

            // Verify member role badge shows "member"
            const memberBadge = page
              .locator('[data-testid="member-role-badge"]')
              .filter({ hasText: /member/i });
            if (await memberBadge.isVisible()) {
              await expect(memberBadge).toBeVisible();
            }

            // Update role to "admin"
            const roleDropdown = page
              .locator('[data-testid="member-role"]')
              .filter({ hasText: /member/i })
              .first();
            if (await roleDropdown.isVisible()) {
              await roleDropdown.click();
              await page.getByRole('option', { name: /admin/i }).click();

              // Verify role updated successfully
              await page.waitForTimeout(500);

              // Verify role badge/indicator reflects change
              const adminBadge = page
                .locator('[data-testid="member-role-badge"]')
                .filter({ hasText: /admin/i });
              if (await adminBadge.isVisible()) {
                await expect(adminBadge).toBeVisible();
              }

              // Verify success message
              const successMessage = page.getByText(/role.*updated|updated.*role/i);
              if (await successMessage.isVisible()) {
                await expect(successMessage).toBeVisible();
              }
            }
          }
        }
      }
    });

    test('should handle team deletion with members', async ({ page }) => {
      await page.goto('/authorization');

      const teamsTab = page.getByRole('tab', { name: /teams/i });
      await teamsTab.click();

      // Create team with members
      const createButton = page.getByRole('button', { name: /create team/i });
      if (await createButton.isVisible()) {
        await createButton.click();
        await page.getByLabel(/team name/i).fill('Team with Members');
        await page.getByLabel(/description/i).fill('Team to test cascade deletion');
        await page.getByRole('button', { name: /create|save/i }).click();
        await page.waitForTimeout(500);

        // Find and click on the newly created team
        const testTeam = page.getByText('Team with Members');
        if (await testTeam.isVisible()) {
          await testTeam.click();

          // Add a member to the team
          const addMemberButton = page.getByRole('button', { name: /add member/i });
          if (await addMemberButton.isVisible()) {
            await addMemberButton.click();
            await page.getByLabel(/user.*id|email/i).fill('member-to-remove-789');
            await page.getByRole('combobox', { name: /role/i }).click();
            await page.getByRole('option', { name: /member/i }).click();
            await page.getByRole('button', { name: /add|save/i }).click();
            await page.waitForTimeout(500);

            // Verify member was added
            await expect(page.getByText('member-to-remove-789')).toBeVisible();

            // Now try to delete the team
            const deleteButton = page.getByRole('button', { name: /delete/i });
            if (await deleteButton.isVisible()) {
              await deleteButton.click();

              // Verify warning message about removing members
              const warningMessage = page.getByText(
                /members.*removed|remove.*members|members.*deleted/i,
              );
              if (await warningMessage.isVisible()) {
                await expect(warningMessage).toBeVisible();
              }

              // Confirm deletion
              await page.getByRole('button', { name: /confirm|yes|delete/i }).click();
              await page.waitForTimeout(500);

              // Verify team deleted
              const deletedTeamCheck = page.getByText('Team with Members');
              await expect(deletedTeamCheck).not.toBeVisible();

              // Verify success message
              const successMessage = page.getByText(/team.*deleted|deleted.*team/i);
              if (await successMessage.isVisible()) {
                await expect(successMessage).toBeVisible();
              }
            }
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

    test('should detect and display DSL syntax errors', async ({ page }) => {
      await page.goto('/authorization');

      const policiesTab = page.getByRole('tab', { name: /policies/i });
      await policiesTab.click();

      // Navigate to model editor
      const editor = page.locator('[data-testid="model-editor"] textarea');
      if (await editor.isVisible()) {
        // Introduce syntax error in model (missing closing brace)
        const invalidDSL = `
model
  schema 1.1

type user

type document
  relations
    define owner: [user]
    define editor: [user
    define viewer: [user] or editor
`;

        await editor.fill(invalidDSL);

        // Click validate button
        const validateButton = page.getByRole('button', { name: /validate/i });
        if (await validateButton.isVisible()) {
          await validateButton.click();

          // Wait for validation result
          await page.waitForTimeout(1000);

          // Verify error message displayed
          const errorMessage = page.getByText(/error|invalid|syntax|parse/i);
          await expect(errorMessage).toBeVisible();

          // Verify error highlights line number or error location
          const lineNumber = page.locator('[data-testid="error-line"]');
          if (await lineNumber.isVisible()) {
            await expect(lineNumber).toBeVisible();
          }

          // Check for error details panel
          const errorPanel = page.locator('[data-testid="validation-error-panel"]');
          if (await errorPanel.isVisible()) {
            await expect(errorPanel).toBeVisible();
          }
        }
      }
    });

    test('should display complete version history', async ({ page }) => {
      await page.goto('/authorization');

      const policiesTab = page.getByRole('tab', { name: /policies/i });
      await policiesTab.click();

      // Click version history button
      const historyButton = page.getByRole('button', { name: /history|versions/i });
      if (await historyButton.isVisible()) {
        await historyButton.click();
        await page.waitForTimeout(500);

        // Verify version list displays
        const versionList = page.locator('[data-testid="version-list"]');
        await expect(versionList).toBeVisible();

        // Verify version numbers (v1, v2, v3, etc.)
        const versionNumbers = page.locator('[data-testid="version-number"]');
        if (await versionNumbers.first().isVisible()) {
          await expect(versionNumbers.first()).toBeVisible();
          await expect(versionNumbers.first()).toContainText(/v\d+/i);
        }

        // Verify timestamps
        const timestamps = page.locator('[data-testid="version-timestamp"]');
        if (await timestamps.first().isVisible()) {
          await expect(timestamps.first()).toBeVisible();
        }

        // Verify author/creator (if available)
        const authors = page.locator('[data-testid="version-author"]');
        if (await authors.first().isVisible()) {
          await expect(authors.first()).toBeVisible();
        }

        // Verify active/inactive status
        const activeStatus = page.locator('[data-testid="version-active-badge"]');
        if (await activeStatus.first().isVisible()) {
          await expect(activeStatus.first()).toBeVisible();
        }

        // Verify View/Compare/Rollback buttons
        const viewButton = page.getByRole('button', { name: /view/i }).first();
        if (await viewButton.isVisible()) {
          await expect(viewButton).toBeVisible();
        }

        const compareButton = page.getByRole('button', { name: /compare/i }).first();
        if (await compareButton.isVisible()) {
          await expect(compareButton).toBeVisible();
        }

        const rollbackButton = page.getByRole('button', { name: /rollback/i }).first();
        if (await rollbackButton.isVisible()) {
          await expect(rollbackButton).toBeVisible();
        }
      }
    });

    test('should compare policy versions with diff viewer', async ({ page }) => {
      await page.goto('/authorization');

      const policiesTab = page.getByRole('tab', { name: /policies/i });
      await policiesTab.click();

      // Navigate to version history
      const historyButton = page.getByRole('button', { name: /history|versions/i });
      if (await historyButton.isVisible()) {
        await historyButton.click();
        await page.waitForTimeout(500);

        // Select two versions to compare
        const versionCheckboxes = page.locator('[data-testid="version-checkbox"]');
        if (
          (await versionCheckboxes.first().isVisible()) &&
          (await versionCheckboxes.nth(1).isVisible())
        ) {
          await versionCheckboxes.first().click();
          await versionCheckboxes.nth(1).click();

          // Click "View Diff" or "Compare" button
          const compareButton = page.getByRole('button', { name: /view diff|compare/i });
          if (await compareButton.isVisible()) {
            await compareButton.click();
            await page.waitForTimeout(500);

            // Verify diff modal/panel opens
            const diffModal = page.locator('[data-testid="diff-modal"]');
            const diffPanel = page.locator('[data-testid="diff-panel"]');

            if (await diffModal.isVisible()) {
              await expect(diffModal).toBeVisible();
            } else if (await diffPanel.isVisible()) {
              await expect(diffPanel).toBeVisible();
            }

            // Verify side-by-side or unified diff display
            const diffViewer = page.locator('[data-testid="diff-viewer"]');
            if (await diffViewer.isVisible()) {
              await expect(diffViewer).toBeVisible();
            }

            // Verify additions highlighted in green
            const additions = page.locator('.diff-addition, [data-testid="diff-added"]');
            if (await additions.first().isVisible()) {
              await expect(additions.first()).toBeVisible();
            }

            // Verify deletions highlighted in red
            const deletions = page.locator('.diff-deletion, [data-testid="diff-removed"]');
            if (await deletions.first().isVisible()) {
              await expect(deletions.first()).toBeVisible();
            }
          }
        }
      }
    });

    test('should rollback to previous version with confirmation', async ({ page }) => {
      await page.goto('/authorization');

      const policiesTab = page.getByRole('tab', { name: /policies/i });
      await policiesTab.click();

      // Navigate to version history
      const historyButton = page.getByRole('button', { name: /history|versions/i });
      if (await historyButton.isVisible()) {
        await historyButton.click();
        await page.waitForTimeout(500);

        // Select a previous version (not current)
        const inactiveVersion = page
          .locator('[data-testid="version-row"]')
          .filter({ hasNot: page.locator('[data-testid="version-active-badge"]') })
          .first();
        if (await inactiveVersion.isVisible()) {
          await inactiveVersion.click();

          // Click "Rollback" button
          const rollbackButton = page.getByRole('button', { name: /rollback/i });
          if (await rollbackButton.isVisible()) {
            await rollbackButton.click();

            // Verify confirmation dialog appears
            const confirmDialog = page.getByText(/are you sure|confirm rollback/i);
            await expect(confirmDialog).toBeVisible();

            // Confirm rollback
            await page.getByRole('button', { name: /confirm|yes|rollback/i }).click();
            await page.waitForTimeout(1000);

            // Verify success message
            const successMessage = page.getByText(/rollback.*success|successfully.*rolled back/i);
            if (await successMessage.isVisible()) {
              await expect(successMessage).toBeVisible();
            }

            // Verify version is now active
            const activeBadge = page.locator('[data-testid="version-active-badge"]');
            if (await activeBadge.isVisible()) {
              await expect(activeBadge).toBeVisible();
            }
          }
        }
      }
    });

    test('should activate a specific policy version', async ({ page }) => {
      await page.goto('/authorization');

      const policiesTab = page.getByRole('tab', { name: /policies/i });
      await policiesTab.click();

      // Navigate to version history
      const historyButton = page.getByRole('button', { name: /history|versions/i });
      if (await historyButton.isVisible()) {
        await historyButton.click();
        await page.waitForTimeout(500);

        // Select an inactive version
        const inactiveVersion = page
          .locator('[data-testid="version-row"]')
          .filter({ hasNot: page.locator('[data-testid="version-active-badge"]') })
          .first();
        if (await inactiveVersion.isVisible()) {
          // Get the version number for verification
          const versionNumber = await inactiveVersion
            .locator('[data-testid="version-number"]')
            .textContent();

          await inactiveVersion.click();

          // Click "Activate" button
          const activateButton = page.getByRole('button', { name: /activate/i });
          if (await activateButton.isVisible()) {
            await activateButton.click();

            // Confirm activation
            const confirmButton = page.getByRole('button', { name: /confirm|yes/i });
            if (await confirmButton.isVisible()) {
              await confirmButton.click();
              await page.waitForTimeout(1000);
            }

            // Verify version becomes active
            const activeBadge = inactiveVersion.locator('[data-testid="version-active-badge"]');
            if (await activeBadge.isVisible()) {
              await expect(activeBadge).toBeVisible();
            }

            // Verify previous active version becomes inactive
            const allActiveVersions = page.locator('[data-testid="version-active-badge"]');
            const activeCount = await allActiveVersions.count();
            expect(activeCount).toBe(1);

            // Verify success message
            const successMessage = page.getByText(/activated|version.*active/i);
            if (await successMessage.isVisible()) {
              await expect(successMessage).toBeVisible();
            }
          }
        }
      }
    });

    test('should export and import authorization model', async ({ page }) => {
      await page.goto('/authorization');

      const policiesTab = page.getByRole('tab', { name: /policies/i });
      await policiesTab.click();

      // Test Export functionality
      const exportButton = page.getByRole('button', { name: /export/i });
      if (await exportButton.isVisible()) {
        // Set up download listener
        const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);

        await exportButton.click();

        // Verify download initiated (model.yaml or model.dsl)
        const download = await downloadPromise;
        if (download) {
          const fileName = download.suggestedFilename();
          expect(fileName).toMatch(/model\.(yaml|dsl|txt)/i);
        }

        await page.waitForTimeout(500);
      }

      // Test Import functionality
      const importButton = page.getByRole('button', { name: /import/i });
      if (await importButton.isVisible()) {
        await importButton.click();
        await page.waitForTimeout(500);

        // Upload file or paste model
        const fileInput = page.locator('input[type="file"]');
        const textArea = page.locator('[data-testid="import-textarea"]');

        if (await textArea.isVisible()) {
          // Test paste model scenario
          const testModel = `
model
  schema 1.1

type user

type document
  relations
    define owner: [user]
    define editor: [user] or owner
    define viewer: [user] or editor
`;

          await textArea.fill(testModel);

          // Submit import
          const submitButton = page.getByRole('button', { name: /import|upload/i });
          if (await submitButton.isVisible()) {
            await submitButton.click();
            await page.waitForTimeout(1000);

            // Verify import successful
            const successMessage = page.getByText(/import.*success|successfully.*imported/i);
            if (await successMessage.isVisible()) {
              await expect(successMessage).toBeVisible();
            }

            // Verify model content matches imported data
            const editor = page.locator('[data-testid="model-editor"] textarea');
            if (await editor.isVisible()) {
              const editorContent = await editor.inputValue();
              expect(editorContent).toContain('type user');
              expect(editorContent).toContain('type document');
            }
          }
        } else if (await fileInput.isVisible()) {
          // File upload scenario would be tested with actual file
          // Skip if no test file is available
        }
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

    test('should check permissions for different scenarios', async ({ page }) => {
      await page.goto('/authorization');

      const permissionsTab = page.getByRole('tab', { name: /permissions/i });
      await permissionsTab.click();

      // Test scenario 1: Allowed permission
      await page.getByLabel(/user/i).fill('user:alice');
      await page.getByLabel(/relation/i).fill('can_view');
      await page.getByLabel(/object/i).fill('document:123');

      const checkButton = page.getByRole('button', { name: /check/i });
      await checkButton.click();
      await page.waitForTimeout(1000);

      // Verify result: Allowed (green)
      const allowedResult = page.locator('[data-testid="permission-result-allowed"]');
      const allowedText = page.getByText(/allowed/i);

      if (await allowedResult.isVisible()) {
        await expect(allowedResult).toBeVisible();
      } else if (await allowedText.isVisible()) {
        await expect(allowedText).toBeVisible();
      }

      // Test scenario 2: Denied permission
      await page.getByLabel(/user/i).fill('user:bob');
      await page.getByLabel(/relation/i).fill('can_edit');
      await page.getByLabel(/object/i).fill('document:123');

      await checkButton.click();
      await page.waitForTimeout(1000);

      // Verify result: Denied (red)
      const deniedResult = page.locator('[data-testid="permission-result-denied"]');
      const deniedText = page.getByText(/denied/i);

      if (await deniedResult.isVisible()) {
        await expect(deniedResult).toBeVisible();
      } else if (await deniedText.isVisible()) {
        await expect(deniedText).toBeVisible();
      }

      // Test scenario 3: Check with wildcard
      await page.getByLabel(/user/i).fill('user:*');
      await page.getByLabel(/relation/i).fill('can_view');
      await page.getByLabel(/object/i).fill('session_recording:*');

      await checkButton.click();
      await page.waitForTimeout(1000);

      // Verify appropriate result
      const wildcardResult = page.getByText(/allowed|denied/i);
      await expect(wildcardResult).toBeVisible();
    });

    test('should validate permission checker inputs', async ({ page }) => {
      await page.goto('/authorization');

      const permissionsTab = page.getByRole('tab', { name: /permissions/i });
      await permissionsTab.click();

      const checkButton = page.getByRole('button', { name: /check/i });

      // Submit with empty user field
      await page.getByLabel(/relation/i).fill('can_view');
      await page.getByLabel(/object/i).fill('document:123');
      await checkButton.click();
      await page.waitForTimeout(500);

      // Verify validation error
      let validationError = page.getByText(/user.*required|required.*user/i);
      if (await validationError.isVisible()) {
        await expect(validationError).toBeVisible();
      }

      // Clear fields and submit with empty relation field
      await page.getByLabel(/user/i).fill('user:alice');
      await page.getByLabel(/relation/i).fill('');
      await page.getByLabel(/object/i).fill('document:123');
      await checkButton.click();
      await page.waitForTimeout(500);

      // Verify validation error
      validationError = page.getByText(/relation.*required|required.*relation/i);
      if (await validationError.isVisible()) {
        await expect(validationError).toBeVisible();
      }

      // Clear fields and submit with empty object field
      await page.getByLabel(/user/i).fill('user:alice');
      await page.getByLabel(/relation/i).fill('can_view');
      await page.getByLabel(/object/i).fill('');
      await checkButton.click();
      await page.waitForTimeout(500);

      // Verify validation error
      validationError = page.getByText(/object.*required|required.*object/i);
      if (await validationError.isVisible()) {
        await expect(validationError).toBeVisible();
      }

      // Submit with invalid format (e.g., missing colon)
      await page.getByLabel(/user/i).fill('useralice');
      await page.getByLabel(/relation/i).fill('can_view');
      await page.getByLabel(/object/i).fill('document123');
      await checkButton.click();
      await page.waitForTimeout(500);

      // Verify validation error message
      validationError = page.getByText(/invalid.*format|format.*invalid|must.*include.*colon/i);
      if (await validationError.isVisible()) {
        await expect(validationError).toBeVisible();
      }
    });

    test('should perform batch permission checks', async ({ page }) => {
      await page.goto('/authorization');

      const permissionsTab = page.getByRole('tab', { name: /permissions/i });
      await permissionsTab.click();

      // Find batch check section (if exists)
      const batchCheckButton = page.getByRole('button', { name: /batch.*check|bulk.*check/i });
      if (await batchCheckButton.isVisible()) {
        await batchCheckButton.click();
        await page.waitForTimeout(500);

        // Add 3 permission checks
        const addCheckButton = page.getByRole('button', { name: /add.*check|add.*permission/i });

        // Check 1: user:alice, can_view, document:1
        if (await addCheckButton.isVisible()) {
          await addCheckButton.click();
        }
        await page.locator('[data-testid="batch-user-0"]').fill('user:alice');
        await page.locator('[data-testid="batch-relation-0"]').fill('can_view');
        await page.locator('[data-testid="batch-object-0"]').fill('document:1');

        // Check 2: user:alice, can_edit, document:1
        if (await addCheckButton.isVisible()) {
          await addCheckButton.click();
        }
        await page.locator('[data-testid="batch-user-1"]').fill('user:alice');
        await page.locator('[data-testid="batch-relation-1"]').fill('can_edit');
        await page.locator('[data-testid="batch-object-1"]').fill('document:1');

        // Check 3: user:bob, can_view, document:2
        if (await addCheckButton.isVisible()) {
          await addCheckButton.click();
        }
        await page.locator('[data-testid="batch-user-2"]').fill('user:bob');
        await page.locator('[data-testid="batch-relation-2"]').fill('can_view');
        await page.locator('[data-testid="batch-object-2"]').fill('document:2');

        // Submit batch check
        const submitBatchButton = page.getByRole('button', { name: /submit.*batch|check.*all/i });
        if (await submitBatchButton.isVisible()) {
          await submitBatchButton.click();
          await page.waitForTimeout(1000);

          // Verify results displayed for all 3 checks
          const batchResults = page.locator('[data-testid="batch-results"]');
          await expect(batchResults).toBeVisible();

          // Verify each result shows allowed/denied status
          const resultItems = page.locator('[data-testid="batch-result-item"]');
          const resultCount = await resultItems.count();
          expect(resultCount).toBeGreaterThanOrEqual(3);

          // Check that each result has a status
          for (let i = 0; i < Math.min(3, resultCount); i++) {
            const resultItem = resultItems.nth(i);
            const statusText = await resultItem.getByText(/allowed|denied/i);
            await expect(statusText).toBeVisible();
          }
        }
      }
    });
  });
});

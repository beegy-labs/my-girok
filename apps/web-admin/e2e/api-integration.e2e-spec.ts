import { test, expect } from '@playwright/test';
import { TEST_CONFIG } from './fixtures/test-config';
import { testData } from './fixtures/test-data';

/**
 * API Integration E2E Tests
 * Tests direct API endpoints using Playwright's request context
 *
 * Uses environment variables for credentials:
 * - E2E_TEST_EMAIL: Admin user email
 * - E2E_TEST_PASSWORD: Admin user password
 */

/**
 * Helper function to get admin session cookie
 */
async function getAdminSessionCookie(request: any): Promise<string> {
  const response = await request.post('/api/auth/login', {
    data: {
      email: TEST_CONFIG.admin.email,
      password: TEST_CONFIG.admin.password,
    },
  });

  expect(response.ok()).toBeTruthy();

  // Extract session cookie from response headers
  const cookies = response.headers()['set-cookie'];
  if (!cookies) {
    throw new Error('No session cookie received from login');
  }

  // Parse the session cookie
  const sessionMatch = cookies.match(/sessionId=([^;]+)/);
  if (!sessionMatch) {
    throw new Error('Could not extract sessionId from cookie');
  }

  return `sessionId=${sessionMatch[1]}`;
}

/**
 * Analytics API Tests
 */
test.describe('Analytics API', () => {
  let sessionCookie: string;

  test.beforeAll(async ({ request }) => {
    sessionCookie = await getAdminSessionCookie(request);
  });

  test('GET /admin/analytics/users/top - should return top users', async ({ request }) => {
    const response = await request.get('/admin/analytics/users/top', {
      headers: { Cookie: sessionCookie },
      params: {
        limit: '10',
        period: '7d',
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBeTruthy();

    if (data.data.length > 0) {
      const firstUser = data.data[0];
      expect(firstUser).toHaveProperty('userId');
      expect(firstUser).toHaveProperty('totalSessions');
      expect(firstUser).toHaveProperty('totalDuration');
      expect(typeof firstUser.totalSessions).toBe('number');
    }
  });

  test('GET /admin/analytics/users/:userId/summary - should return user summary', async ({
    request,
  }) => {
    const userId = testData.userId();
    const response = await request.get(`/admin/analytics/users/${userId}/summary`, {
      headers: { Cookie: sessionCookie },
      params: {
        period: '30d',
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    expect(data).toHaveProperty('data');
    expect(data.data).toHaveProperty('userId');
    expect(data.data).toHaveProperty('totalSessions');
    expect(data.data).toHaveProperty('totalDuration');
    expect(data.data).toHaveProperty('averageSessionDuration');
    expect(data.data).toHaveProperty('lastActivityAt');
  });

  test('GET /admin/analytics/users/:userId/sessions - should test pagination', async ({
    request,
  }) => {
    const userId = testData.userId();
    const response = await request.get(`/admin/analytics/users/${userId}/sessions`, {
      headers: { Cookie: sessionCookie },
      params: {
        page: '1',
        limit: '20',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    expect(data).toHaveProperty('data');
    expect(data).toHaveProperty('pagination');
    expect(Array.isArray(data.data)).toBeTruthy();

    // Verify pagination metadata
    expect(data.pagination).toHaveProperty('page');
    expect(data.pagination).toHaveProperty('limit');
    expect(data.pagination).toHaveProperty('total');
    expect(data.pagination).toHaveProperty('totalPages');

    // Verify session structure if data exists
    if (data.data.length > 0) {
      const session = data.data[0];
      expect(session).toHaveProperty('sessionId');
      expect(session).toHaveProperty('userId');
      expect(session).toHaveProperty('duration');
      expect(session).toHaveProperty('createdAt');
    }
  });

  test('GET /admin/analytics/users/:userId/locations - should verify country data', async ({
    request,
  }) => {
    const userId = testData.userId();
    const response = await request.get(`/admin/analytics/users/${userId}/locations`, {
      headers: { Cookie: sessionCookie },
      params: {
        period: '30d',
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBeTruthy();

    // Verify location data structure
    if (data.data.length > 0) {
      const location = data.data[0];
      expect(location).toHaveProperty('country');
      expect(location).toHaveProperty('countryCode');
      expect(location).toHaveProperty('sessionCount');
      expect(typeof location.sessionCount).toBe('number');
    }
  });

  test('GET /admin/analytics/users/overview - should test search functionality', async ({
    request,
  }) => {
    const response = await request.get('/admin/analytics/users/overview', {
      headers: { Cookie: sessionCookie },
      params: {
        search: 'test',
        page: '1',
        limit: '50',
        period: '7d',
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    expect(data).toHaveProperty('data');
    expect(data).toHaveProperty('pagination');
    expect(Array.isArray(data.data)).toBeTruthy();

    // Verify user overview structure
    if (data.data.length > 0) {
      const user = data.data[0];
      expect(user).toHaveProperty('userId');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('totalSessions');
      expect(user).toHaveProperty('lastActivityAt');
    }
  });
});

/**
 * Authorization API Tests
 */
test.describe('Authorization API', () => {
  let sessionCookie: string;

  test.beforeAll(async ({ request }) => {
    sessionCookie = await getAdminSessionCookie(request);
  });

  test('POST /admin/authorization/check - should verify permission checking', async ({
    request,
  }) => {
    const response = await request.post('/admin/authorization/check', {
      headers: { Cookie: sessionCookie },
      data: {
        user: testData.permission.user(),
        relation: testData.permission.relation,
        object: testData.permission.object('session_recording'),
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    expect(data).toHaveProperty('data');
    expect(data.data).toHaveProperty('allowed');
    expect(typeof data.data.allowed).toBe('boolean');
  });

  test('POST /admin/authorization/batch-check - should test batch operations', async ({
    request,
  }) => {
    const userId = testData.permission.user();
    const objectId = testData.permission.object('session_recording');
    const response = await request.post('/admin/authorization/batch-check', {
      headers: { Cookie: sessionCookie },
      data: {
        checks: [
          {
            user: userId,
            relation: 'can_view',
            object: objectId,
          },
          {
            user: userId,
            relation: 'can_edit',
            object: objectId,
          },
          {
            user: userId,
            relation: 'can_delete',
            object: objectId,
          },
        ],
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBeTruthy();
    expect(data.data.length).toBe(3);

    // Verify each result
    data.data.forEach((result: any) => {
      expect(result).toHaveProperty('allowed');
      expect(typeof result.allowed).toBe('boolean');
    });
  });

  test('POST /admin/authorization/model - should test model creation', async ({ request }) => {
    const response = await request.post('/admin/authorization/model', {
      headers: { Cookie: sessionCookie },
      data: {
        name: 'Test Authorization Model',
        description: 'Test model for E2E testing',
        dsl: `
model
  schema 1.1

type user

type team
  relations
    define member: [user]
    define admin: [user]

type session_recording
  relations
    define owner: [user]
    define viewer: [user, team#member]
    define can_view: viewer or owner
    define can_edit: owner
    define can_delete: owner
        `.trim(),
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    expect(data).toHaveProperty('data');
    expect(data.data).toHaveProperty('id');
    expect(data.data).toHaveProperty('name');
    expect(data.data).toHaveProperty('dsl');
    expect(data.data.name).toBe('Test Authorization Model');
  });

  test('POST /admin/authorization/model/validate - should test DSL validation', async ({
    request,
  }) => {
    const validDSL = `
model
  schema 1.1

type user

type document
  relations
    define owner: [user]
    define can_view: owner
    `.trim();

    const response = await request.post('/admin/authorization/model/validate', {
      headers: { Cookie: sessionCookie },
      data: {
        dsl: validDSL,
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    expect(data).toHaveProperty('data');
    expect(data.data).toHaveProperty('valid');
    expect(data.data.valid).toBeTruthy();

    if (!data.data.valid) {
      expect(data.data).toHaveProperty('errors');
      expect(Array.isArray(data.data.errors)).toBeTruthy();
    }
  });

  test('POST /admin/authorization/model/validate - should detect invalid DSL', async ({
    request,
  }) => {
    const invalidDSL = 'invalid dsl syntax';

    const response = await request.post('/admin/authorization/model/validate', {
      headers: { Cookie: sessionCookie },
      data: {
        dsl: invalidDSL,
      },
    });

    const data = await response.json();

    expect(data).toHaveProperty('data');
    expect(data.data).toHaveProperty('valid');
    expect(data.data.valid).toBeFalsy();
    expect(data.data).toHaveProperty('errors');
    expect(Array.isArray(data.data.errors)).toBeTruthy();
    expect(data.data.errors.length).toBeGreaterThan(0);
  });

  test('POST /admin/authorization/model/:id/activate - should test activation', async ({
    request,
  }) => {
    // First create a model
    const createResponse = await request.post('/admin/authorization/model', {
      headers: { Cookie: sessionCookie },
      data: {
        name: 'Model to Activate',
        description: 'Test model for activation',
        dsl: 'model\n  schema 1.1\n\ntype user',
      },
    });

    expect(createResponse.ok()).toBeTruthy();
    const createData = await createResponse.json();
    const modelId = createData.data.id;

    // Now activate the model
    const activateResponse = await request.post(`/admin/authorization/model/${modelId}/activate`, {
      headers: { Cookie: sessionCookie },
    });

    expect(activateResponse.ok()).toBeTruthy();
    const activateData = await activateResponse.json();

    expect(activateData).toHaveProperty('data');
    expect(activateData.data).toHaveProperty('id');
    expect(activateData.data).toHaveProperty('isActive');
    expect(activateData.data.isActive).toBeTruthy();
  });

  test('GET /admin/authorization/list-objects - should test object listing', async ({
    request,
  }) => {
    const response = await request.get('/admin/authorization/list-objects', {
      headers: { Cookie: sessionCookie },
      params: {
        user: testData.permission.user(),
        relation: testData.permission.relation,
        objectType: 'session_recording',
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBeTruthy();

    // Verify object structure
    if (data.data.length > 0) {
      const obj = data.data[0];
      expect(typeof obj).toBe('string');
      expect(obj).toMatch(/^session_recording:/);
    }
  });

  test('GET /admin/authorization/list-users - should test user listing', async ({ request }) => {
    const response = await request.get('/admin/authorization/list-users', {
      headers: { Cookie: sessionCookie },
      params: {
        object: testData.permission.object('session_recording'),
        relation: testData.permission.relation,
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBeTruthy();

    // Verify user structure
    if (data.data.length > 0) {
      const user = data.data[0];
      expect(typeof user).toBe('string');
      expect(user).toMatch(/^user:/);
    }
  });
});

/**
 * Teams API Tests
 */
test.describe('Teams API', () => {
  let sessionCookie: string;
  let _testTeamId: string;

  test.beforeAll(async ({ request }) => {
    sessionCookie = await getAdminSessionCookie(request);
  });

  test('GET /admin/teams - should test pagination and search', async ({ request }) => {
    const response = await request.get('/admin/teams', {
      headers: { Cookie: sessionCookie },
      params: {
        page: '1',
        limit: '10',
        search: 'eng',
        sortBy: 'name',
        sortOrder: 'asc',
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    expect(data).toHaveProperty('data');
    expect(data).toHaveProperty('pagination');
    expect(Array.isArray(data.data)).toBeTruthy();

    // Verify pagination
    expect(data.pagination).toHaveProperty('page');
    expect(data.pagination).toHaveProperty('limit');
    expect(data.pagination).toHaveProperty('total');
    expect(data.pagination).toHaveProperty('totalPages');

    // Verify team structure
    if (data.data.length > 0) {
      const team = data.data[0];
      expect(team).toHaveProperty('id');
      expect(team).toHaveProperty('name');
      expect(team).toHaveProperty('description');
      expect(team).toHaveProperty('memberCount');
      expect(team).toHaveProperty('createdAt');
    }
  });

  test('POST /admin/teams - should test team creation', async ({ request }) => {
    const timestamp = Date.now();
    const response = await request.post('/admin/teams', {
      headers: { Cookie: sessionCookie },
      data: {
        name: `E2E Test Team ${timestamp}`,
        description: 'Team created during E2E testing',
        metadata: {
          department: 'Engineering',
          location: 'Remote',
        },
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    expect(data).toHaveProperty('data');
    expect(data.data).toHaveProperty('id');
    expect(data.data).toHaveProperty('name');
    expect(data.data).toHaveProperty('description');
    expect(data.data.name).toBe(`E2E Test Team ${timestamp}`);

    // Store team ID for cleanup
    testTeamId = data.data.id;
  });

  test('PATCH /admin/teams/:id - should test team update', async ({ request }) => {
    // First create a team
    const createResponse = await request.post('/admin/teams', {
      headers: { Cookie: sessionCookie },
      data: {
        name: 'Team to Update',
        description: 'Original description',
      },
    });

    expect(createResponse.ok()).toBeTruthy();
    const createData = await createResponse.json();
    const teamId = createData.data.id;

    // Now update the team
    const updateResponse = await request.patch(`/admin/teams/${teamId}`, {
      headers: { Cookie: sessionCookie },
      data: {
        name: 'Updated Team Name',
        description: 'Updated description',
        metadata: {
          updated: true,
        },
      },
    });

    expect(updateResponse.ok()).toBeTruthy();
    const updateData = await updateResponse.json();

    expect(updateData).toHaveProperty('data');
    expect(updateData.data).toHaveProperty('id');
    expect(updateData.data.name).toBe('Updated Team Name');
    expect(updateData.data.description).toBe('Updated description');
  });

  test('POST /admin/teams/:id/members - should test member addition', async ({ request }) => {
    // First create a team
    const createResponse = await request.post('/admin/teams', {
      headers: { Cookie: sessionCookie },
      data: {
        name: 'Team for Member Addition',
        description: 'Test team',
      },
    });

    expect(createResponse.ok()).toBeTruthy();
    const createData = await createResponse.json();
    const teamId = createData.data.id;

    // Add a member
    const memberId = testData.userId();
    const addMemberResponse = await request.post(`/admin/teams/${teamId}/members`, {
      headers: { Cookie: sessionCookie },
      data: {
        userId: memberId,
        role: 'member',
      },
    });

    expect(addMemberResponse.ok()).toBeTruthy();
    const addMemberData = await addMemberResponse.json();

    expect(addMemberData).toHaveProperty('data');
    expect(addMemberData.data).toHaveProperty('userId');
    expect(addMemberData.data).toHaveProperty('teamId');
    expect(addMemberData.data).toHaveProperty('role');
    expect(addMemberData.data.userId).toBe(memberId);
    expect(addMemberData.data.role).toBe('member');
  });

  test('DELETE /admin/teams/:id/members/:userId - should test member removal', async ({
    request,
  }) => {
    // First create a team
    const createResponse = await request.post('/admin/teams', {
      headers: { Cookie: sessionCookie },
      data: {
        name: 'Team for Member Removal',
        description: 'Test team',
      },
    });

    expect(createResponse.ok()).toBeTruthy();
    const createData = await createResponse.json();
    const teamId = createData.data.id;

    // Add a member
    const memberToRemoveId = testData.userId();
    const addMemberResponse = await request.post(`/admin/teams/${teamId}/members`, {
      headers: { Cookie: sessionCookie },
      data: {
        userId: memberToRemoveId,
        role: 'member',
      },
    });

    expect(addMemberResponse.ok()).toBeTruthy();

    // Remove the member
    const removeResponse = await request.delete(
      `/admin/teams/${teamId}/members/${memberToRemoveId}`,
      {
        headers: { Cookie: sessionCookie },
      },
    );

    expect(removeResponse.ok()).toBeTruthy();
    const removeData = await removeResponse.json();

    expect(removeData).toHaveProperty('data');
    expect(removeData.data).toHaveProperty('success');
    expect(removeData.data.success).toBeTruthy();
  });

  test('DELETE /admin/teams/:id - should test team deletion', async ({ request }) => {
    // First create a team
    const createResponse = await request.post('/admin/teams', {
      headers: { Cookie: sessionCookie },
      data: {
        name: 'Team to Delete',
        description: 'This team will be deleted',
      },
    });

    expect(createResponse.ok()).toBeTruthy();
    const createData = await createResponse.json();
    const teamId = createData.data.id;

    // Delete the team
    const deleteResponse = await request.delete(`/admin/teams/${teamId}`, {
      headers: { Cookie: sessionCookie },
    });

    expect(deleteResponse.ok()).toBeTruthy();
    const deleteData = await deleteResponse.json();

    expect(deleteData).toHaveProperty('data');
    expect(deleteData.data).toHaveProperty('success');
    expect(deleteData.data.success).toBeTruthy();

    // Verify team is deleted
    const getResponse = await request.get(`/admin/teams/${teamId}`, {
      headers: { Cookie: sessionCookie },
    });

    expect(getResponse.status()).toBe(404);
  });
});

/**
 * Session Recordings API Tests
 */
test.describe('Session Recordings API', () => {
  let sessionCookie: string;

  test.beforeAll(async ({ request }) => {
    sessionCookie = await getAdminSessionCookie(request);
  });

  test('GET /recordings/sessions - should test filtering and pagination', async ({ request }) => {
    const response = await request.get('/recordings/sessions', {
      headers: { Cookie: sessionCookie },
      params: {
        page: '1',
        limit: '25',
        sortBy: 'createdAt',
        sortOrder: 'desc',
        userId: testData.userId(),
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    expect(data).toHaveProperty('data');
    expect(data).toHaveProperty('pagination');
    expect(Array.isArray(data.data)).toBeTruthy();

    // Verify pagination
    expect(data.pagination).toHaveProperty('page');
    expect(data.pagination).toHaveProperty('limit');
    expect(data.pagination).toHaveProperty('total');
    expect(data.pagination).toHaveProperty('totalPages');

    // Verify session recording structure
    if (data.data.length > 0) {
      const recording = data.data[0];
      expect(recording).toHaveProperty('sessionId');
      expect(recording).toHaveProperty('userId');
      expect(recording).toHaveProperty('duration');
      expect(recording).toHaveProperty('eventCount');
      expect(recording).toHaveProperty('createdAt');
      expect(recording).toHaveProperty('url');
      expect(recording).toHaveProperty('userAgent');
    }
  });

  test('GET /recordings/sessions/:sessionId/events - should verify event structure', async ({
    request,
  }) => {
    const sessionId = testData.sessionId();
    const response = await request.get(`/recordings/sessions/${sessionId}/events`, {
      headers: { Cookie: sessionCookie },
      params: {
        page: '1',
        limit: '100',
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    expect(data).toHaveProperty('data');
    expect(data).toHaveProperty('pagination');
    expect(Array.isArray(data.data)).toBeTruthy();

    // Verify event structure
    if (data.data.length > 0) {
      const event = data.data[0];
      expect(event).toHaveProperty('eventId');
      expect(event).toHaveProperty('sessionId');
      expect(event).toHaveProperty('type');
      expect(event).toHaveProperty('timestamp');
      expect(event).toHaveProperty('data');

      // Verify event type is valid
      expect(['click', 'scroll', 'input', 'navigation', 'load']).toContain(event.type);

      // Verify timestamp is valid
      expect(typeof event.timestamp).toBe('number');
      expect(event.timestamp).toBeGreaterThan(0);
    }
  });
});

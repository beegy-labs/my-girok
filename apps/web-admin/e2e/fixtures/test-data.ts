/**
 * Test Data Factories
 *
 * Factory functions for generating consistent test data.
 * Uses timestamps to ensure uniqueness across test runs.
 */

const timestamp = () => Date.now();

export const testData = {
  // User IDs
  userId: () => `test-user-${timestamp()}`,

  // Session IDs
  sessionId: () => `session-${timestamp()}`,
  recordingId: () => `rec-${timestamp()}`,

  // Team data
  team: () => ({
    id: `team-${timestamp()}`,
    name: `Test Team ${timestamp()}`,
    description: 'Test team description',
  }),

  // Permission tuples
  permission: {
    user: (id?: string) => `user:${id || testData.userId()}`,
    object: (type: string, id?: string) => `${type}:${id || timestamp()}`,
    relation: 'can_view' as const,
  },

  // Authorization model DSL
  authzModel: () =>
    `
model
  schema 1.1

type user

type document
  relations
    define owner: [user]
    define editor: [user] or owner
    define viewer: [user] or editor
    define can_view: viewer
    define can_edit: editor
    define can_delete: owner

type session_recording
  relations
    define owner: [user]
    define viewer: [user] or owner
    define can_view: viewer
  `.trim(),
} as const;

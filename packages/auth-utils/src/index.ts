/**
 * @my-girok/auth-utils
 *
 * Shared authentication utilities for my-girok frontend applications.
 * Provides factory functions for creating auth stores and API clients
 * with consistent session-based authentication patterns.
 */

// Auth store factory
export {
  createAuthStore,
  createExtendedAuthStore,
  createBaseAuthSlice,
  type BaseAuthState,
  type MfaChallenge,
  type CreateAuthStoreOptions,
} from './createAuthStore.js';

// API client factory
export {
  createApiClient,
  type CreateApiClientOptions,
  type ApiResponse,
} from './createApiClient.js';

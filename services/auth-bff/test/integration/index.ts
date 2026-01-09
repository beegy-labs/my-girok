/**
 * Integration tests for auth-bff gRPC communication with backend services
 *
 * Test files:
 * - auth-grpc.integration.spec.ts: auth-bff <-> auth-service integration
 * - identity-grpc.integration.spec.ts: auth-bff <-> identity-service integration
 * - audit-grpc.integration.spec.ts: auth-bff <-> audit-service integration
 *
 * Key flows tested:
 * - Admin authentication (login, MFA, logout)
 * - User authentication (register, login, MFA, logout)
 * - Session management (create, validate, refresh, revoke)
 * - MFA management (setup, verify, disable, backup codes)
 * - Password management (change password)
 * - Audit logging (auth events, non-blocking behavior)
 *
 * Run integration tests:
 *   pnpm test test/integration
 */
export {};

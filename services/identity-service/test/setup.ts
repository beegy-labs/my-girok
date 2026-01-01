/**
 * Jest Test Setup
 * Runs before each test suite
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-minimum-32-characters-long';
process.env.JWT_ISSUER = 'identity-service-test';
process.env.JWT_AUDIENCE = 'my-girok-test';
process.env.ENCRYPTION_KEY = '12345678901234567890123456789012'; // 32 chars
process.env.API_KEYS = 'test-api-key-1,test-api-key-2';
process.env.VALKEY_HOST = 'localhost';
process.env.VALKEY_PORT = '6379';

// Mock crypto for consistent test results
jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomBytes: jest.fn((size: number) => Buffer.alloc(size, 'a')),
}));

// Global test utilities
global.beforeEach(() => {
  jest.clearAllMocks();
});

// Increase timeout for slow tests
jest.setTimeout(30000);

// Suppress console during tests (optional - uncomment for cleaner output)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
// };

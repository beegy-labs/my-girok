// Jest setup file for auth-bff tests

// Suppress console logs during tests unless debugging
if (!process.env.DEBUG_TESTS) {
  jest.spyOn(console, 'log').mockImplementation();
  jest.spyOn(console, 'debug').mockImplementation();
}

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '4005';
process.env.SESSION_SECRET = 'test-session-secret-32-chars!!';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars!!';
process.env.VALKEY_HOST = 'localhost';
process.env.VALKEY_PORT = '6379';
process.env.VALKEY_DB = '15'; // Use separate DB for tests

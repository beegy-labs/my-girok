import 'reflect-metadata';

// Test setup file
// Runs before each test suite

// Suppress console output unless DEBUG_TESTS is set
if (!process.env.DEBUG_TESTS) {
  console.log = () => {};
  console.debug = () => {};
}

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5433/test_personal_db';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.AUTH_SERVICE_URL = 'http://localhost:4001';
process.env.FRONTEND_URL = 'http://localhost:3000';

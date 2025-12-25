// Test setup file
// Runs before each test suite

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5433/test_auth_db';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing-only';
process.env.JWT_ACCESS_EXPIRATION = '1h';
process.env.JWT_REFRESH_EXPIRATION = '7d';

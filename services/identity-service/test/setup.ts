// Vitest setup file for identity-service tests
import { vi } from 'vitest';
import * as nodeCrypto from 'crypto';

// Polyfill globalThis.crypto with Node.js crypto for test environment
// Node.js 20+ has globalThis.crypto (Web Crypto API), but some code expects Node crypto methods
// Extend existing globalThis.crypto with Node.js crypto methods like randomBytes
Object.defineProperty(globalThis, 'crypto', {
  value: {
    ...globalThis.crypto,
    ...nodeCrypto,
  },
  writable: true,
  configurable: true,
});

// Suppress console logs during tests unless debugging
if (!process.env.DEBUG_TESTS) {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'debug').mockImplementation(() => {});
}

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '4002';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/identity_test';
process.env.JWT_SECRET = 'test-jwt-secret-32-chars-long!!';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars!!';
process.env.VALKEY_HOST = 'localhost';
process.env.VALKEY_PORT = '6379';
process.env.VALKEY_DB = '15'; // Use separate DB for tests

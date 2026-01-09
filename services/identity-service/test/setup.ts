// Vitest setup file for identity-service tests
import { vi } from 'vitest';
import * as nodeCrypto from 'crypto';

// Make Node.js crypto available as global crypto for Web Crypto API compatibility
if (typeof globalThis.crypto === 'undefined' || !globalThis.crypto.randomBytes) {
  Object.defineProperty(globalThis, 'crypto', {
    value: nodeCrypto,
    writable: true,
    configurable: true,
  });
}

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

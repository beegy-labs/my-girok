// Vitest setup file for mail-service tests
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
process.env.PORT = '4006';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/mail_test';
process.env.KAFKA_BROKERS = 'localhost:9092';
process.env.KAFKA_CLIENT_ID = 'mail-service-test';
process.env.KAFKA_CONSUMER_GROUP = 'mail-service-consumer-test';

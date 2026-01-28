// Vitest setup file for notification-service tests
import { vi } from 'vitest';
import * as nodeCrypto from 'crypto';

// Mock the Prisma client module before any imports
vi.mock('.prisma/notification-client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    notification: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    channelPreference: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    typePreference: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    deviceToken: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
      update: vi.fn(),
    },
    quietHours: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    $transaction: vi.fn((callback: unknown) => callback),
  })),
}));

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
process.env.PORT = '50052';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/notification_test';
process.env.VALKEY_HOST = 'localhost';
process.env.VALKEY_PORT = '6379';
process.env.VALKEY_DB = '15'; // Use separate DB for tests

// Firebase mock configuration
process.env.FIREBASE_PROJECT_ID = 'test-project';
process.env.FIREBASE_PRIVATE_KEY = 'test-key';
process.env.FIREBASE_CLIENT_EMAIL = 'test@test.iam.gserviceaccount.com';

// gRPC client mock configuration
process.env.GRPC_MAIL_HOST = 'localhost';
process.env.GRPC_MAIL_PORT = '50054';
process.env.GRPC_AUDIT_HOST = 'localhost';
process.env.GRPC_AUDIT_PORT = '50053';
process.env.AUDIT_ENABLED = 'false';

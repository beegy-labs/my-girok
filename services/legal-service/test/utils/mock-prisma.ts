import { vi, Mock } from 'vitest';

/**
 * Mock Prisma Service for legal-service tests
 *
 * Provides a fully mocked PrismaService with all required methods for testing.
 * Follows the Prisma Client structure used by legal-service.
 */

// Define the mock type explicitly to avoid circular reference
export interface MockPrismaModel {
  findUnique: Mock;
  findFirst: Mock;
  findMany: Mock;
  create: Mock;
  update: Mock;
  updateMany: Mock;
  delete: Mock;
  deleteMany: Mock;
  count: Mock;
}

export interface MockPrismaService {
  consent: MockPrismaModel;
  dsrRequest: MockPrismaModel;
  legalDocument: MockPrismaModel;
  lawRegistry: MockPrismaModel;
  outboxEvent: MockPrismaModel;
  $transaction: Mock;
  $connect: Mock;
  $disconnect: Mock;
}

export const createMockPrisma = (): MockPrismaService => ({
  // Consent model methods
  consent: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  },

  // DSR Request model methods
  dsrRequest: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  },

  // Legal Document model methods
  legalDocument: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  },

  // Law Registry model methods
  lawRegistry: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  },

  // Outbox Event model methods
  outboxEvent: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  },

  // Transaction support
  $transaction: vi.fn((callback: unknown) => {
    if (typeof callback === 'function') {
      // Create a mock transaction client with the same structure
      const txClient = createMockPrisma();
      return (callback as (tx: MockPrismaService) => Promise<unknown>)(txClient);
    }
    return Promise.resolve(callback);
  }),

  // Connection methods
  $connect: vi.fn().mockResolvedValue(undefined),
  $disconnect: vi.fn().mockResolvedValue(undefined),
});

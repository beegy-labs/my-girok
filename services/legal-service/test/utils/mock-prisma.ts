/**
 * Mock Prisma Service for legal-service tests
 *
 * Provides a fully mocked PrismaService with all required methods for testing.
 * Follows the Prisma Client structure used by legal-service.
 */

// Define the mock type explicitly to avoid circular reference
export interface MockPrismaModel {
  findUnique: jest.Mock;
  findFirst: jest.Mock;
  findMany: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  updateMany: jest.Mock;
  delete: jest.Mock;
  deleteMany: jest.Mock;
  count: jest.Mock;
}

export interface MockPrismaService {
  consent: MockPrismaModel;
  dsrRequest: MockPrismaModel;
  legalDocument: MockPrismaModel;
  lawRegistry: MockPrismaModel;
  outboxEvent: MockPrismaModel;
  $transaction: jest.Mock;
  $connect: jest.Mock;
  $disconnect: jest.Mock;
}

export const createMockPrisma = (): MockPrismaService => ({
  // Consent model methods
  consent: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
  },

  // DSR Request model methods
  dsrRequest: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
  },

  // Legal Document model methods
  legalDocument: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
  },

  // Law Registry model methods
  lawRegistry: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
  },

  // Outbox Event model methods
  outboxEvent: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
  },

  // Transaction support
  $transaction: jest.fn((callback: unknown) => {
    if (typeof callback === 'function') {
      // Create a mock transaction client with the same structure
      const txClient = createMockPrisma();
      return (callback as (tx: MockPrismaService) => Promise<unknown>)(txClient);
    }
    return Promise.resolve(callback);
  }),

  // Connection methods
  $connect: jest.fn().mockResolvedValue(undefined),
  $disconnect: jest.fn().mockResolvedValue(undefined),
});

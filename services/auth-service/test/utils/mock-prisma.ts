/**
 * Mock Prisma Service for unit tests
 * Provides a fully mocked PrismaService with all query methods
 */

import { PrismaService } from '../../src/database/prisma.service';

export type MockPrismaService = {
  // Raw query methods
  $queryRaw: jest.Mock;
  $executeRaw: jest.Mock;
  $transaction: jest.Mock;
  $connect: jest.Mock;
  $disconnect: jest.Mock;

  // Outbox events (Prisma model)
  outboxEvent: {
    create: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
    deleteMany: jest.Mock;
  };

  // User model
  user: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };

  // Session model
  session: {
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    deleteMany: jest.Mock;
  };

  // Admin model
  admin: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
};

/**
 * Create a mock PrismaService for unit tests
 */
export function createMockPrismaService(): MockPrismaService {
  return {
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
    $transaction: jest.fn((callback: (tx: MockPrismaService) => Promise<unknown>) => {
      // Execute the callback with the mock itself as the transaction client
      return callback(createMockPrismaService());
    }),
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),

    outboxEvent: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },

    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },

    session: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },

    admin: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
}

/**
 * Get the PrismaService provider for NestJS testing module
 */
export function getMockPrismaProvider() {
  const mockPrisma = createMockPrismaService();
  return {
    provide: PrismaService,
    useValue: mockPrisma,
  };
}

/**
 * Reset all mocks on a MockPrismaService
 */
export function resetMockPrisma(mockPrisma: MockPrismaService): void {
  mockPrisma.$queryRaw.mockReset();
  mockPrisma.$executeRaw.mockReset();
  mockPrisma.$transaction.mockReset();
  mockPrisma.$connect.mockReset();
  mockPrisma.$disconnect.mockReset();

  mockPrisma.outboxEvent.create.mockReset();
  mockPrisma.outboxEvent.findMany.mockReset();
  mockPrisma.outboxEvent.update.mockReset();
  mockPrisma.outboxEvent.deleteMany.mockReset();

  mockPrisma.user.findUnique.mockReset();
  mockPrisma.user.findMany.mockReset();
  mockPrisma.user.create.mockReset();
  mockPrisma.user.update.mockReset();
  mockPrisma.user.delete.mockReset();

  mockPrisma.session.findUnique.mockReset();
  mockPrisma.session.create.mockReset();
  mockPrisma.session.update.mockReset();
  mockPrisma.session.delete.mockReset();
  mockPrisma.session.deleteMany.mockReset();

  mockPrisma.admin.findUnique.mockReset();
  mockPrisma.admin.findMany.mockReset();
  mockPrisma.admin.create.mockReset();
  mockPrisma.admin.update.mockReset();
}

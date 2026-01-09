/**
 * Mock Prisma Service for unit tests
 * Provides a fully mocked PrismaService with all query methods
 */

import { vi, Mock } from 'vitest';
import { PrismaService } from '../../src/database/prisma.service';

export type MockPrismaService = {
  // Raw query methods
  $queryRaw: Mock;
  $executeRaw: Mock;
  $transaction: Mock;
  $connect: Mock;
  $disconnect: Mock;

  // Outbox events (Prisma model)
  outboxEvent: {
    create: Mock;
    findMany: Mock;
    update: Mock;
    deleteMany: Mock;
  };

  // User model
  user: {
    findUnique: Mock;
    findMany: Mock;
    create: Mock;
    update: Mock;
    delete: Mock;
  };

  // Session model
  session: {
    findUnique: Mock;
    create: Mock;
    update: Mock;
    delete: Mock;
    deleteMany: Mock;
  };

  // Admin model
  admin: {
    findUnique: Mock;
    findMany: Mock;
    create: Mock;
    update: Mock;
  };
};

/**
 * Create a mock PrismaService for unit tests
 */
export function createMockPrismaService(): MockPrismaService {
  return {
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
    $transaction: vi.fn((callback: (tx: MockPrismaService) => Promise<unknown>) => {
      // Execute the callback with the mock itself as the transaction client
      return callback(createMockPrismaService());
    }),
    $connect: vi.fn().mockResolvedValue(undefined),
    $disconnect: vi.fn().mockResolvedValue(undefined),

    outboxEvent: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },

    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },

    session: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },

    admin: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
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

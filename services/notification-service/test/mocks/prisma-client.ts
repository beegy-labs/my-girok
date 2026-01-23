// Mock Prisma Client for testing
// This file is used as an alias for '.prisma/notification-client' in vitest.config.ts
import { vi } from 'vitest';

export class PrismaClient {
  notification = {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  };

  channelPreference = {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    upsert: vi.fn(),
  };

  typePreference = {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    upsert: vi.fn(),
  };

  deviceToken = {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    upsert: vi.fn(),
    deleteMany: vi.fn(),
    update: vi.fn(),
  };

  quietHours = {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  };

  async $connect(): Promise<void> {
    // Mock connection
  }

  async $disconnect(): Promise<void> {
    // Mock disconnection
  }

  async $transaction<T>(fn: (tx: PrismaClient) => Promise<T>): Promise<T> {
    return fn(this);
  }
}

// Re-export types that might be needed
export const Prisma = {
  PrismaClientKnownRequestError: class extends Error {
    code: string;
    constructor(message: string, { code }: { code: string }) {
      super(message);
      this.code = code;
      this.name = 'PrismaClientKnownRequestError';
    }
  },
};

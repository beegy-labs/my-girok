import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Logger } from '@nestjs/common';

// Mock PrismaClient before importing PrismaService
vi.mock('../../node_modules/.prisma/auth-client', () => ({
  PrismaClient: class MockPrismaClient {
    $connect = vi.fn().mockResolvedValue(undefined);
    $disconnect = vi.fn().mockResolvedValue(undefined);
    $extends = vi.fn().mockReturnValue({ extended: true });
  },
}));

// Mock the UUIDv7 extension
vi.mock('@my-girok/nest-common/prisma', () => ({
  uuidv7Extension: { name: 'uuidv7' },
}));

// Now import PrismaService after mocking
import { PrismaService } from '../../src/database/prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;
  let loggerLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    service = new PrismaService();
    loggerLogSpy = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    vi.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should connect to the database', async () => {
      // Act
      await service.onModuleInit();

      // Assert
      expect(service.$connect).toHaveBeenCalled();
      expect(loggerLogSpy).toHaveBeenCalledWith('Prisma connected to PostgreSQL');
    });
  });

  describe('onModuleDestroy', () => {
    it('should disconnect from the database', async () => {
      // Act
      await service.onModuleDestroy();

      // Assert
      expect(service.$disconnect).toHaveBeenCalled();
      expect(loggerLogSpy).toHaveBeenCalledWith('Prisma disconnected');
    });
  });

  describe('extended', () => {
    it('should return an extended client with UUIDv7 extension', () => {
      // Act
      const extendedClient = service.extended;

      // Assert
      expect(extendedClient).toBeDefined();
      expect(service.$extends).toHaveBeenCalled();
    });
  });
});

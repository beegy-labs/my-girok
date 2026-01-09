import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../src/database/prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;
  let connectSpy: ReturnType<typeof vi.spyOn>;
  let disconnectSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);

    // Mock $connect and $disconnect to avoid actual database calls
    connectSpy = vi.spyOn(service, '$connect').mockResolvedValue();
    disconnectSpy = vi.spyOn(service, '$disconnect').mockResolvedValue();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should connect to the database', async () => {
      // Act
      await service.onModuleInit();

      // Assert
      expect(connectSpy).toHaveBeenCalled();
    });
  });

  describe('onModuleDestroy', () => {
    it('should disconnect from the database', async () => {
      // Act
      await service.onModuleDestroy();

      // Assert
      expect(disconnectSpy).toHaveBeenCalled();
    });
  });

  describe('extended', () => {
    it('should return an extended client with UUIDv7 extension', () => {
      // Act
      const extendedClient = service.extended;

      // Assert
      expect(extendedClient).toBeDefined();
    });
  });
});

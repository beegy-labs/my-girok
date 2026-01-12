import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { UserPreferencesService } from './user-preferences.service';
import { PrismaService } from '../database/prisma.service';
import { CreateUserPreferencesDto, UpdateUserPreferencesDto } from './dto';

describe('UserPreferencesService', () => {
  let service: UserPreferencesService;
  let prismaService: {
    userPreferences: {
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      upsert: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
  };
  let cacheManager: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    del: ReturnType<typeof vi.fn>;
  };

  const mockUserId = 'user-123';
  const mockPreferences = {
    id: 'pref-123',
    userId: mockUserId,
    theme: 'LIGHT',
    sectionOrder: [
      { type: 'SKILLS', order: 0, visible: true },
      { type: 'EXPERIENCE', order: 1, visible: true },
      { type: 'PROJECT', order: 2, visible: true },
      { type: 'EDUCATION', order: 3, visible: true },
      { type: 'CERTIFICATE', order: 4, visible: true },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prismaService = {
      userPreferences: {
        findUnique: vi.fn(),
        create: vi.fn(),
        upsert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };

    cacheManager = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserPreferencesService,
        { provide: PrismaService, useValue: prismaService },
        { provide: CACHE_MANAGER, useValue: cacheManager },
      ],
    }).compile();

    service = module.get<UserPreferencesService>(UserPreferencesService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserPreferences', () => {
    it('should return cached preferences if available', async () => {
      cacheManager.get.mockResolvedValue(mockPreferences);

      const result = await service.getUserPreferences(mockUserId);

      expect(result).toEqual(mockPreferences);
      expect(cacheManager.get).toHaveBeenCalledWith(expect.stringContaining(mockUserId));
      expect(prismaService.userPreferences.findUnique).not.toHaveBeenCalled();
    });

    it('should fetch from database and cache if not in cache', async () => {
      cacheManager.get.mockResolvedValue(null);
      prismaService.userPreferences.findUnique.mockResolvedValue(mockPreferences);

      const result = await service.getUserPreferences(mockUserId);

      expect(result).toEqual(mockPreferences);
      expect(cacheManager.get).toHaveBeenCalled();
      expect(prismaService.userPreferences.findUnique).toHaveBeenCalledWith({
        where: { userId: mockUserId },
      });
      expect(cacheManager.set).toHaveBeenCalledWith(
        expect.stringContaining(mockUserId),
        mockPreferences,
        expect.any(Number),
      );
    });

    it('should create default preferences if not found in database', async () => {
      cacheManager.get.mockResolvedValue(null);
      prismaService.userPreferences.findUnique.mockResolvedValue(null);
      prismaService.userPreferences.create.mockResolvedValue(mockPreferences);

      const result = await service.getUserPreferences(mockUserId);

      expect(result).toEqual(mockPreferences);
      expect(prismaService.userPreferences.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          theme: 'LIGHT',
          sectionOrder: [
            { type: 'SKILLS', order: 0, visible: true },
            { type: 'EXPERIENCE', order: 1, visible: true },
            { type: 'PROJECT', order: 2, visible: true },
            { type: 'EDUCATION', order: 3, visible: true },
            { type: 'CERTIFICATE', order: 4, visible: true },
          ],
        },
      });
      expect(cacheManager.set).toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException when database fails', async () => {
      cacheManager.get.mockResolvedValue(null);
      prismaService.userPreferences.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(service.getUserPreferences(mockUserId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should throw InternalServerErrorException when cache fails', async () => {
      cacheManager.get.mockRejectedValue(new Error('Cache error'));

      await expect(service.getUserPreferences(mockUserId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('upsertUserPreferences', () => {
    const createDto: CreateUserPreferencesDto = {
      theme: 'DARK',
      sectionOrder: [
        { type: 'EXPERIENCE', order: 0, visible: true },
        { type: 'SKILLS', order: 1, visible: true },
      ],
    };

    it('should create preferences when they do not exist', async () => {
      prismaService.userPreferences.upsert.mockResolvedValue({
        ...mockPreferences,
        theme: 'DARK',
        sectionOrder: createDto.sectionOrder,
      });

      const result = await service.upsertUserPreferences(mockUserId, createDto);

      expect(result).toBeDefined();
      expect(result.theme).toBe('DARK');
      expect(prismaService.userPreferences.upsert).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        create: {
          userId: mockUserId,
          theme: createDto.theme,
          sectionOrder: createDto.sectionOrder,
        },
        update: {
          theme: createDto.theme,
          sectionOrder: createDto.sectionOrder,
        },
      });
      expect(cacheManager.del).toHaveBeenCalledWith(expect.stringContaining(mockUserId));
    });

    it('should update preferences when they already exist', async () => {
      prismaService.userPreferences.upsert.mockResolvedValue({
        ...mockPreferences,
        theme: 'DARK',
      });

      const result = await service.upsertUserPreferences(mockUserId, createDto);

      expect(result).toBeDefined();
      expect(prismaService.userPreferences.upsert).toHaveBeenCalled();
      expect(cacheManager.del).toHaveBeenCalled();
    });

    it('should handle null sectionOrder', async () => {
      const dtoWithoutSectionOrder: CreateUserPreferencesDto = {
        theme: 'DARK',
      };

      prismaService.userPreferences.upsert.mockResolvedValue({
        ...mockPreferences,
        theme: 'DARK',
        sectionOrder: null,
      });

      const result = await service.upsertUserPreferences(mockUserId, dtoWithoutSectionOrder);

      expect(result).toBeDefined();
      expect(prismaService.userPreferences.upsert).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        create: {
          userId: mockUserId,
          theme: 'DARK',
          sectionOrder: null,
        },
        update: {
          theme: 'DARK',
          sectionOrder: null,
        },
      });
    });

    it('should throw InternalServerErrorException when upsert fails', async () => {
      prismaService.userPreferences.upsert.mockRejectedValue(new Error('Database error'));

      await expect(service.upsertUserPreferences(mockUserId, createDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should invalidate cache even when upsert succeeds', async () => {
      prismaService.userPreferences.upsert.mockResolvedValue(mockPreferences);
      cacheManager.del.mockResolvedValue(undefined);

      await service.upsertUserPreferences(mockUserId, createDto);

      expect(cacheManager.del).toHaveBeenCalledWith(expect.stringContaining(mockUserId));
    });
  });

  describe('updateUserPreferences', () => {
    const updateDto: UpdateUserPreferencesDto = {
      theme: 'DARK',
    };

    it('should update existing preferences', async () => {
      prismaService.userPreferences.findUnique.mockResolvedValue(mockPreferences);
      prismaService.userPreferences.update.mockResolvedValue({
        ...mockPreferences,
        theme: 'DARK',
      });

      const result = await service.updateUserPreferences(mockUserId, updateDto);

      expect(result).toBeDefined();
      expect(result.theme).toBe('DARK');
      expect(prismaService.userPreferences.update).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        data: { theme: 'DARK' },
      });
      expect(cacheManager.del).toHaveBeenCalledWith(expect.stringContaining(mockUserId));
    });

    it('should throw NotFoundException when preferences do not exist', async () => {
      prismaService.userPreferences.findUnique.mockResolvedValue(null);

      await expect(service.updateUserPreferences(mockUserId, updateDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaService.userPreferences.update).not.toHaveBeenCalled();
    });

    it('should update sectionOrder when provided', async () => {
      const updateDtoWithOrder: UpdateUserPreferencesDto = {
        sectionOrder: [
          { type: 'EXPERIENCE', order: 0, visible: true },
          { type: 'SKILLS', order: 1, visible: false },
        ],
      };

      prismaService.userPreferences.findUnique.mockResolvedValue(mockPreferences);
      prismaService.userPreferences.update.mockResolvedValue({
        ...mockPreferences,
        sectionOrder: updateDtoWithOrder.sectionOrder,
      });

      await service.updateUserPreferences(mockUserId, updateDtoWithOrder);

      expect(prismaService.userPreferences.update).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        data: { sectionOrder: updateDtoWithOrder.sectionOrder },
      });
    });

    it('should handle null sectionOrder update', async () => {
      const updateDtoWithNullOrder: UpdateUserPreferencesDto = {
        sectionOrder: null,
      };

      prismaService.userPreferences.findUnique.mockResolvedValue(mockPreferences);
      prismaService.userPreferences.update.mockResolvedValue({
        ...mockPreferences,
        sectionOrder: null,
      });

      await service.updateUserPreferences(mockUserId, updateDtoWithNullOrder);

      expect(prismaService.userPreferences.update).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        data: { sectionOrder: null },
      });
    });

    it('should throw InternalServerErrorException when update fails', async () => {
      prismaService.userPreferences.findUnique.mockResolvedValue(mockPreferences);
      prismaService.userPreferences.update.mockRejectedValue(new Error('Database error'));

      await expect(service.updateUserPreferences(mockUserId, updateDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should update both theme and sectionOrder when both provided', async () => {
      const updateDtoBoth: UpdateUserPreferencesDto = {
        theme: 'DARK',
        sectionOrder: [{ type: 'SKILLS', order: 0, visible: true }],
      };

      prismaService.userPreferences.findUnique.mockResolvedValue(mockPreferences);
      prismaService.userPreferences.update.mockResolvedValue({
        ...mockPreferences,
        theme: 'DARK',
        sectionOrder: updateDtoBoth.sectionOrder,
      });

      await service.updateUserPreferences(mockUserId, updateDtoBoth);

      expect(prismaService.userPreferences.update).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        data: {
          theme: 'DARK',
          sectionOrder: updateDtoBoth.sectionOrder,
        },
      });
    });
  });

  describe('deleteUserPreferences', () => {
    it('should delete existing preferences', async () => {
      prismaService.userPreferences.delete.mockResolvedValue(mockPreferences);

      await service.deleteUserPreferences(mockUserId);

      expect(prismaService.userPreferences.delete).toHaveBeenCalledWith({
        where: { userId: mockUserId },
      });
      expect(cacheManager.del).toHaveBeenCalledWith(expect.stringContaining(mockUserId));
    });

    it('should throw NotFoundException when preferences do not exist (P2025)', async () => {
      const prismaError = new Error('Record not found') as Error & { code: string };
      prismaError.code = 'P2025';
      prismaService.userPreferences.delete.mockRejectedValue(prismaError);

      await expect(service.deleteUserPreferences(mockUserId)).rejects.toThrow(NotFoundException);
    });

    it('should throw InternalServerErrorException for other errors', async () => {
      prismaService.userPreferences.delete.mockRejectedValue(new Error('Database error'));

      await expect(service.deleteUserPreferences(mockUserId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should invalidate cache after successful deletion', async () => {
      prismaService.userPreferences.delete.mockResolvedValue(mockPreferences);
      cacheManager.del.mockResolvedValue(undefined);

      await service.deleteUserPreferences(mockUserId);

      expect(cacheManager.del).toHaveBeenCalledWith(expect.stringContaining(mockUserId));
    });

    it('should handle deletion errors with proper logging', async () => {
      const error = new Error('Unexpected error');
      prismaService.userPreferences.delete.mockRejectedValue(error);

      await expect(service.deleteUserPreferences(mockUserId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('Cache Operations', () => {
    it('should generate correct cache key format', async () => {
      cacheManager.get.mockResolvedValue(mockPreferences);

      await service.getUserPreferences(mockUserId);

      expect(cacheManager.get).toHaveBeenCalledWith(
        expect.stringMatching(/personal.*preferences.*user-123/),
      );
    });

    it('should invalidate cache on upsert', async () => {
      prismaService.userPreferences.upsert.mockResolvedValue(mockPreferences);

      await service.upsertUserPreferences(mockUserId, { theme: 'DARK' });

      expect(cacheManager.del).toHaveBeenCalled();
    });

    it('should invalidate cache on update', async () => {
      prismaService.userPreferences.findUnique.mockResolvedValue(mockPreferences);
      prismaService.userPreferences.update.mockResolvedValue(mockPreferences);

      await service.updateUserPreferences(mockUserId, { theme: 'DARK' });

      expect(cacheManager.del).toHaveBeenCalled();
    });

    it('should invalidate cache on delete', async () => {
      prismaService.userPreferences.delete.mockResolvedValue(mockPreferences);

      await service.deleteUserPreferences(mockUserId);

      expect(cacheManager.del).toHaveBeenCalled();
    });
  });
});

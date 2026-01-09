import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';

import { GlobalSettingsService } from '../../src/admin/services/global-settings.service';
import { PrismaService } from '../../src/database/prisma.service';

describe('GlobalSettingsService', () => {
  let service: GlobalSettingsService;
  let mockPrismaService: { $queryRaw: Mock; $executeRaw: Mock };

  const mockCountry = {
    id: 'country-123',
    code: 'KR',
    name: 'South Korea',
    nativeName: '대한민국',
    flagEmoji: '🇰🇷',
    isActive: true,
    displayOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockLocale = {
    id: 'locale-123',
    code: 'ko-KR',
    name: 'Korean (Korea)',
    nativeName: '한국어 (대한민국)',
    flagEmoji: '🇰🇷',
    isActive: true,
    displayOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockPrismaService = {
      $queryRaw: vi.fn(),
      $executeRaw: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [GlobalSettingsService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<GlobalSettingsService>(GlobalSettingsService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('listCountries', () => {
    it('should return all countries', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockResolvedValue([mockCountry]);

      // Act
      const result = await service.listCountries();

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.data[0].code).toBe('KR');
      expect(result.meta.total).toBe(1);
    });

    it('should filter active countries only', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockResolvedValue([mockCountry]);

      // Act
      const result = await service.listCountries(true);

      // Assert
      expect(result.data).toHaveLength(1);
    });
  });

  describe('getCountry', () => {
    it('should return country by code', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockResolvedValue([mockCountry]);

      // Act
      const result = await service.getCountry('KR');

      // Assert
      expect(result.code).toBe('KR');
      expect(result.name).toBe('South Korea');
    });

    it('should throw NotFoundException for non-existent country', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      // Act & Assert
      await expect(service.getCountry('XX')).rejects.toThrow(NotFoundException);
      await expect(service.getCountry('XX')).rejects.toThrow('Country not found: XX');
    });
  });

  describe('createCountry', () => {
    it('should create a new country', async () => {
      // Arrange
      const dto = {
        code: 'JP',
        name: 'Japan',
        nativeName: '日本',
        flagEmoji: '🇯🇵',
        isActive: true,
        displayOrder: 2,
      };
      const createdCountry = { ...mockCountry, ...dto };
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([]) // No existing country
        .mockResolvedValueOnce([createdCountry]); // Created country

      // Act
      const result = await service.createCountry(dto);

      // Assert
      expect(result.code).toBe('JP');
      expect(result.name).toBe('Japan');
    });

    it('should throw ConflictException if country already exists', async () => {
      // Arrange
      const dto = { code: 'KR', name: 'Korea' };
      mockPrismaService.$queryRaw.mockResolvedValueOnce([{ id: 'existing-id' }]);

      // Act & Assert
      await expect(service.createCountry(dto)).rejects.toThrow(ConflictException);
    });

    it('should use default values for optional fields', async () => {
      // Arrange
      const dto = { code: 'US', name: 'United States' };
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ ...mockCountry, code: 'US', name: 'United States' }]);

      // Act
      const result = await service.createCountry(dto);

      // Assert
      expect(result).toBeDefined();
    });
  });

  describe('updateCountry', () => {
    it('should update country', async () => {
      // Arrange
      const dto = { name: 'Republic of Korea' };
      const updatedCountry = { ...mockCountry, name: 'Republic of Korea' };
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([mockCountry]) // getCountry check
        .mockResolvedValueOnce([updatedCountry]); // update

      // Act
      const result = await service.updateCountry('KR', dto);

      // Assert
      expect(result.name).toBe('Republic of Korea');
    });

    it('should throw NotFoundException if country does not exist', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockResolvedValueOnce([]);

      // Act & Assert
      await expect(service.updateCountry('XX', { name: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteCountry', () => {
    it('should delete country', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockResolvedValueOnce([mockCountry]); // getCountry check
      mockPrismaService.$executeRaw.mockResolvedValueOnce(1); // delete result

      // Act
      await service.deleteCountry('KR');

      // Assert
      expect(mockPrismaService.$queryRaw).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException if country does not exist', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockResolvedValueOnce([]);

      // Act & Assert
      await expect(service.deleteCountry('XX')).rejects.toThrow(NotFoundException);
    });
  });

  describe('listLocales', () => {
    it('should return all locales', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockResolvedValue([mockLocale]);

      // Act
      const result = await service.listLocales();

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.data[0].code).toBe('ko-KR');
    });

    it('should filter active locales only', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockResolvedValue([mockLocale]);

      // Act
      const result = await service.listLocales(true);

      // Assert
      expect(result.data).toHaveLength(1);
    });
  });

  describe('getLocale', () => {
    it('should return locale by code', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockResolvedValue([mockLocale]);

      // Act
      const result = await service.getLocale('ko-KR');

      // Assert
      expect(result.code).toBe('ko-KR');
    });

    it('should throw NotFoundException for non-existent locale', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      // Act & Assert
      await expect(service.getLocale('xx-XX')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createLocale', () => {
    it('should create a new locale', async () => {
      // Arrange
      const dto = { code: 'en-US', name: 'English (US)' };
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ ...mockLocale, ...dto }]);

      // Act
      const result = await service.createLocale(dto);

      // Assert
      expect(result.code).toBe('en-US');
    });

    it('should throw ConflictException if locale already exists', async () => {
      // Arrange
      const dto = { code: 'ko-KR', name: 'Korean' };
      mockPrismaService.$queryRaw.mockResolvedValueOnce([{ id: 'existing-id' }]);

      // Act & Assert
      await expect(service.createLocale(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('updateLocale', () => {
    it('should update locale', async () => {
      // Arrange
      const dto = { name: 'Korean (South Korea)' };
      const updatedLocale = { ...mockLocale, name: 'Korean (South Korea)' };
      mockPrismaService.$queryRaw
        .mockResolvedValueOnce([mockLocale])
        .mockResolvedValueOnce([updatedLocale]);

      // Act
      const result = await service.updateLocale('ko-KR', dto);

      // Assert
      expect(result.name).toBe('Korean (South Korea)');
    });
  });

  describe('deleteLocale', () => {
    it('should delete locale', async () => {
      // Arrange
      mockPrismaService.$queryRaw.mockResolvedValueOnce([mockLocale]);
      mockPrismaService.$executeRaw.mockResolvedValueOnce(1);

      // Act
      await service.deleteLocale('ko-KR');

      // Assert
      expect(mockPrismaService.$queryRaw).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.$executeRaw).toHaveBeenCalledTimes(1);
    });
  });
});

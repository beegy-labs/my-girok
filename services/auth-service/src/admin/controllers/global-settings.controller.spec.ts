import { Test, TestingModule } from '@nestjs/testing';
import { GlobalSettingsController } from './global-settings.controller';
import { GlobalSettingsService } from '../services/global-settings.service';
import { Reflector } from '@nestjs/core';
import { PermissionGuard } from '../guards/permission.guard';
import {
  CreateSupportedCountryDto,
  UpdateSupportedCountryDto,
  SupportedCountryResponse,
  SupportedCountryListResponse,
  CreateSupportedLocaleDto,
  UpdateSupportedLocaleDto,
  SupportedLocaleResponse,
  SupportedLocaleListResponse,
} from '../dto/global-settings.dto';

describe('GlobalSettingsController', () => {
  let controller: GlobalSettingsController;
  let mockGlobalSettingsService: {
    listCountries: jest.Mock;
    getCountry: jest.Mock;
    createCountry: jest.Mock;
    updateCountry: jest.Mock;
    deleteCountry: jest.Mock;
    listLocales: jest.Mock;
    getLocale: jest.Mock;
    createLocale: jest.Mock;
    updateLocale: jest.Mock;
    deleteLocale: jest.Mock;
  };

  const mockCountry: SupportedCountryResponse = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    code: 'KR',
    name: 'Korea, Republic of',
    nativeName: '대한민국',
    flagEmoji: '🇰🇷',
    isActive: true,
    displayOrder: 1,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockLocale: SupportedLocaleResponse = {
    id: '550e8400-e29b-41d4-a716-446655440002',
    code: 'ko',
    name: 'Korean',
    nativeName: '한국어',
    flagEmoji: '🇰🇷',
    isActive: true,
    displayOrder: 1,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    mockGlobalSettingsService = {
      listCountries: jest.fn(),
      getCountry: jest.fn(),
      createCountry: jest.fn(),
      updateCountry: jest.fn(),
      deleteCountry: jest.fn(),
      listLocales: jest.fn(),
      getLocale: jest.fn(),
      createLocale: jest.fn(),
      updateLocale: jest.fn(),
      deleteLocale: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GlobalSettingsController],
      providers: [
        { provide: GlobalSettingsService, useValue: mockGlobalSettingsService },
        { provide: Reflector, useValue: { getAllAndOverride: jest.fn() } },
      ],
    })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<GlobalSettingsController>(GlobalSettingsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // SUPPORTED COUNTRIES
  // ============================================================

  describe('listCountries', () => {
    it('should return list of all countries', async () => {
      const expectedResponse: SupportedCountryListResponse = {
        data: [mockCountry],
        meta: { total: 1 },
      };
      mockGlobalSettingsService.listCountries.mockResolvedValue(expectedResponse);

      const result = await controller.listCountries();

      expect(result).toEqual(expectedResponse);
      expect(mockGlobalSettingsService.listCountries).toHaveBeenCalledWith(false);
    });

    it('should filter active countries only', async () => {
      const expectedResponse: SupportedCountryListResponse = {
        data: [mockCountry],
        meta: { total: 1 },
      };
      mockGlobalSettingsService.listCountries.mockResolvedValue(expectedResponse);

      const result = await controller.listCountries('true');

      expect(result).toEqual(expectedResponse);
      expect(mockGlobalSettingsService.listCountries).toHaveBeenCalledWith(true);
    });

    it('should return empty list when no countries exist', async () => {
      mockGlobalSettingsService.listCountries.mockResolvedValue({
        data: [],
        meta: { total: 0 },
      });

      const result = await controller.listCountries();

      expect(result.data).toHaveLength(0);
    });
  });

  describe('getCountry', () => {
    it('should return a country by code', async () => {
      mockGlobalSettingsService.getCountry.mockResolvedValue(mockCountry);

      const result = await controller.getCountry('kr');

      expect(result).toEqual(mockCountry);
      expect(mockGlobalSettingsService.getCountry).toHaveBeenCalledWith('KR');
    });

    it('should convert code to uppercase', async () => {
      mockGlobalSettingsService.getCountry.mockResolvedValue(mockCountry);

      await controller.getCountry('kr');

      expect(mockGlobalSettingsService.getCountry).toHaveBeenCalledWith('KR');
    });
  });

  describe('createCountry', () => {
    it('should create a new country', async () => {
      const dto: CreateSupportedCountryDto = {
        code: 'US',
        name: 'United States',
        nativeName: 'United States',
        flagEmoji: '🇺🇸',
        isActive: true,
        displayOrder: 2,
      };
      const newCountry = { ...mockCountry, code: 'US', name: 'United States' };
      mockGlobalSettingsService.createCountry.mockResolvedValue(newCountry);

      const result = await controller.createCountry(dto);

      expect(result.code).toBe('US');
      expect(mockGlobalSettingsService.createCountry).toHaveBeenCalledWith(dto);
    });

    it('should create country with minimal fields', async () => {
      const dto: CreateSupportedCountryDto = {
        code: 'JP',
        name: 'Japan',
      };
      const newCountry = {
        ...mockCountry,
        code: 'JP',
        name: 'Japan',
        nativeName: null,
        flagEmoji: null,
      };
      mockGlobalSettingsService.createCountry.mockResolvedValue(newCountry);

      const result = await controller.createCountry(dto);

      expect(result.code).toBe('JP');
    });
  });

  describe('updateCountry', () => {
    it('should update a country', async () => {
      const dto: UpdateSupportedCountryDto = {
        name: 'South Korea',
        isActive: false,
      };
      const updatedCountry = { ...mockCountry, name: 'South Korea', isActive: false };
      mockGlobalSettingsService.updateCountry.mockResolvedValue(updatedCountry);

      const result = await controller.updateCountry('kr', dto);

      expect(result.name).toBe('South Korea');
      expect(result.isActive).toBe(false);
      expect(mockGlobalSettingsService.updateCountry).toHaveBeenCalledWith('KR', dto);
    });

    it('should update display order', async () => {
      const dto: UpdateSupportedCountryDto = { displayOrder: 10 };
      const updatedCountry = { ...mockCountry, displayOrder: 10 };
      mockGlobalSettingsService.updateCountry.mockResolvedValue(updatedCountry);

      const result = await controller.updateCountry('KR', dto);

      expect(result.displayOrder).toBe(10);
    });
  });

  describe('deleteCountry', () => {
    it('should delete a country', async () => {
      mockGlobalSettingsService.deleteCountry.mockResolvedValue(undefined);

      await controller.deleteCountry('kr');

      expect(mockGlobalSettingsService.deleteCountry).toHaveBeenCalledWith('KR');
    });
  });

  // ============================================================
  // SUPPORTED LOCALES
  // ============================================================

  describe('listLocales', () => {
    it('should return list of all locales', async () => {
      const expectedResponse: SupportedLocaleListResponse = {
        data: [mockLocale],
        meta: { total: 1 },
      };
      mockGlobalSettingsService.listLocales.mockResolvedValue(expectedResponse);

      const result = await controller.listLocales();

      expect(result).toEqual(expectedResponse);
      expect(mockGlobalSettingsService.listLocales).toHaveBeenCalledWith(false);
    });

    it('should filter active locales only', async () => {
      mockGlobalSettingsService.listLocales.mockResolvedValue({
        data: [mockLocale],
        meta: { total: 1 },
      });

      await controller.listLocales('true');

      expect(mockGlobalSettingsService.listLocales).toHaveBeenCalledWith(true);
    });
  });

  describe('getLocale', () => {
    it('should return a locale by code', async () => {
      mockGlobalSettingsService.getLocale.mockResolvedValue(mockLocale);

      const result = await controller.getLocale('KO');

      expect(result).toEqual(mockLocale);
      expect(mockGlobalSettingsService.getLocale).toHaveBeenCalledWith('ko');
    });

    it('should convert code to lowercase', async () => {
      mockGlobalSettingsService.getLocale.mockResolvedValue(mockLocale);

      await controller.getLocale('KO');

      expect(mockGlobalSettingsService.getLocale).toHaveBeenCalledWith('ko');
    });
  });

  describe('createLocale', () => {
    it('should create a new locale', async () => {
      const dto: CreateSupportedLocaleDto = {
        code: 'en',
        name: 'English',
        nativeName: 'English',
        flagEmoji: '🇺🇸',
        isActive: true,
        displayOrder: 2,
      };
      const newLocale = { ...mockLocale, code: 'en', name: 'English' };
      mockGlobalSettingsService.createLocale.mockResolvedValue(newLocale);

      const result = await controller.createLocale(dto);

      expect(result.code).toBe('en');
      expect(mockGlobalSettingsService.createLocale).toHaveBeenCalledWith(dto);
    });

    it('should create locale with region suffix', async () => {
      const dto: CreateSupportedLocaleDto = {
        code: 'ko-KR',
        name: 'Korean (Korea)',
      };
      const newLocale = { ...mockLocale, code: 'ko-KR', name: 'Korean (Korea)' };
      mockGlobalSettingsService.createLocale.mockResolvedValue(newLocale);

      const result = await controller.createLocale(dto);

      expect(result.code).toBe('ko-KR');
    });
  });

  describe('updateLocale', () => {
    it('should update a locale', async () => {
      const dto: UpdateSupportedLocaleDto = {
        name: 'Korean Language',
        isActive: false,
      };
      const updatedLocale = { ...mockLocale, name: 'Korean Language', isActive: false };
      mockGlobalSettingsService.updateLocale.mockResolvedValue(updatedLocale);

      const result = await controller.updateLocale('KO', dto);

      expect(result.name).toBe('Korean Language');
      expect(result.isActive).toBe(false);
      expect(mockGlobalSettingsService.updateLocale).toHaveBeenCalledWith('ko', dto);
    });
  });

  describe('deleteLocale', () => {
    it('should delete a locale', async () => {
      mockGlobalSettingsService.deleteLocale.mockResolvedValue(undefined);

      await controller.deleteLocale('KO');

      expect(mockGlobalSettingsService.deleteLocale).toHaveBeenCalledWith('ko');
    });
  });
});

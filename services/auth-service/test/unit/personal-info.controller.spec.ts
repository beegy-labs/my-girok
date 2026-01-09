import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';

import { PersonalInfoController } from '../../src/users/controllers/personal-info.controller';
import { PersonalInfoService } from '../../src/users/services/personal-info.service';
import { generateTestId, resetTestCounter } from '../utils/test-factory';

describe('PersonalInfoController', () => {
  let controller: PersonalInfoController;
  let mockPersonalInfoService: {
    getMyPersonalInfo: Mock;
    updatePersonalInfo: Mock;
    deletePersonalInfo: Mock;
  };

  const userId = '00000000-0000-7000-0000-000000000001';
  const personalInfoId = generateTestId();

  const mockUser = {
    sub: userId,
    email: 'test@example.com',
    name: 'Test User',
    type: 'USER_ACCESS',
  };

  const mockPersonalInfo = {
    id: personalInfoId,
    name: 'John Doe',
    birthDate: '1990-01-15',
    gender: 'MALE',
    phoneCountryCode: '+82',
    phoneNumber: '1012345678',
    countryCode: 'KR',
    region: 'Seoul',
    city: 'Gangnam',
    address: '123 Test Street',
    postalCode: '12345',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    resetTestCounter();

    mockPersonalInfoService = {
      getMyPersonalInfo: vi.fn(),
      updatePersonalInfo: vi.fn(),
      deletePersonalInfo: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PersonalInfoController],
      providers: [{ provide: PersonalInfoService, useValue: mockPersonalInfoService }],
    }).compile();

    controller = module.get<PersonalInfoController>(PersonalInfoController);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getMyPersonalInfo', () => {
    it('should return personal info', async () => {
      // Arrange
      mockPersonalInfoService.getMyPersonalInfo.mockResolvedValue(mockPersonalInfo);

      // Act
      const result = await controller.getMyPersonalInfo(mockUser, '127.0.0.1', 'Mozilla/5.0');

      // Assert
      expect(result).not.toBeNull();
      expect(result!.name).toBe('John Doe');
      expect(mockPersonalInfoService.getMyPersonalInfo).toHaveBeenCalledWith(userId, {
        ip: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      });
    });

    it('should return null when no personal info', async () => {
      // Arrange
      mockPersonalInfoService.getMyPersonalInfo.mockResolvedValue(null);

      // Act
      const result = await controller.getMyPersonalInfo(mockUser, '127.0.0.1', 'Mozilla/5.0');

      // Assert
      expect(result).toBeNull();
    });

    it('should use default values when ip/userAgent not provided', async () => {
      // Arrange
      mockPersonalInfoService.getMyPersonalInfo.mockResolvedValue(mockPersonalInfo);

      // Act
      await controller.getMyPersonalInfo(mockUser, '', '');

      // Assert
      expect(mockPersonalInfoService.getMyPersonalInfo).toHaveBeenCalledWith(userId, {
        ip: '0.0.0.0',
        userAgent: 'unknown',
      });
    });
  });

  describe('updatePersonalInfo', () => {
    it('should update personal info', async () => {
      // Arrange
      const dto = {
        name: 'Jane Doe',
        city: 'Seocho',
      };
      const updatedInfo = { ...mockPersonalInfo, ...dto };
      mockPersonalInfoService.updatePersonalInfo.mockResolvedValue(updatedInfo);

      // Act
      const result = await controller.updatePersonalInfo(mockUser, dto, '127.0.0.1', 'Mozilla/5.0');

      // Assert
      expect(result.name).toBe('Jane Doe');
      expect(result.city).toBe('Seocho');
      expect(mockPersonalInfoService.updatePersonalInfo).toHaveBeenCalledWith(userId, dto, {
        ip: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      });
    });

    it('should create personal info when not exists', async () => {
      // Arrange
      const dto = {
        name: 'New User',
        countryCode: 'JP',
      };
      mockPersonalInfoService.updatePersonalInfo.mockResolvedValue({
        id: generateTestId(),
        ...dto,
        birthDate: null,
        gender: null,
        phoneCountryCode: null,
        phoneNumber: null,
        region: null,
        city: null,
        address: null,
        postalCode: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      const result = await controller.updatePersonalInfo(mockUser, dto, '127.0.0.1', 'Mozilla/5.0');

      // Assert
      expect(result.name).toBe('New User');
      expect(result.countryCode).toBe('JP');
    });
  });

  describe('deletePersonalInfo', () => {
    it('should delete personal info', async () => {
      // Arrange
      mockPersonalInfoService.deletePersonalInfo.mockResolvedValue(undefined);

      // Act
      await controller.deletePersonalInfo(mockUser, '127.0.0.1', 'Mozilla/5.0');

      // Assert
      expect(mockPersonalInfoService.deletePersonalInfo).toHaveBeenCalledWith(userId, {
        ip: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      });
    });
  });
});

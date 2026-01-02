import { Test, TestingModule } from '@nestjs/testing';

import { ServicesController } from '../../src/services/services.controller';
import { ServicesService } from '../../src/services/services.service';
import { ConsentType } from '@my-girok/types';
import { generateTestId, resetTestCounter } from '../utils/test-factory';

describe('ServicesController', () => {
  let controller: ServicesController;
  let mockServicesService: {
    getConsentRequirements: jest.Mock;
    joinService: jest.Mock;
    addCountryConsent: jest.Mock;
    getMyConsents: jest.Mock;
    updateConsent: jest.Mock;
    withdrawService: jest.Mock;
  };

  const userId = '00000000-0000-7000-0000-000000000001';
  const serviceSlug = 'my-girok';
  const countryCode = 'KR';

  const mockUser = {
    type: 'USER' as const,
    id: userId,
    email: 'test@example.com',
    name: 'Test User',
    accountMode: 'SERVICE' as const,
    countryCode: 'KR',
    services: {},
  };

  beforeEach(async () => {
    resetTestCounter();

    mockServicesService = {
      getConsentRequirements: jest.fn(),
      joinService: jest.fn(),
      addCountryConsent: jest.fn(),
      getMyConsents: jest.fn(),
      updateConsent: jest.fn(),
      withdrawService: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServicesController],
      providers: [{ provide: ServicesService, useValue: mockServicesService }],
    }).compile();

    controller = module.get<ServicesController>(ServicesController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getConsentRequirements', () => {
    it('should return consent requirements', async () => {
      // Arrange
      const mockRequirements = [
        { type: ConsentType.TERMS_OF_SERVICE, isRequired: true },
        { type: ConsentType.MARKETING_EMAIL, isRequired: false },
      ];
      mockServicesService.getConsentRequirements.mockResolvedValue(mockRequirements);

      // Act
      const result = await controller.getConsentRequirements(serviceSlug, countryCode, 'en');

      // Assert
      expect(result).toHaveLength(2);
      expect(mockServicesService.getConsentRequirements).toHaveBeenCalledWith(
        serviceSlug,
        countryCode,
        'en',
      );
    });
  });

  describe('joinService', () => {
    it('should join service with consents', async () => {
      // Arrange
      const dto = {
        countryCode,
        consents: [{ type: ConsentType.TERMS_OF_SERVICE, agreed: true }],
      };
      const mockResponse = {
        userService: {
          id: generateTestId(),
          serviceId: generateTestId(),
          serviceSlug,
          countryCode,
          status: 'ACTIVE',
          joinedAt: new Date(),
        },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      mockServicesService.joinService.mockResolvedValue(mockResponse);

      const mockReq = {
        user: mockUser,
        headers: { 'user-agent': 'Mozilla/5.0' },
        ip: '127.0.0.1',
      } as any;

      // Act
      const result = await controller.joinService(serviceSlug, dto as any, mockReq);

      // Assert
      expect(result.userService.status).toBe('ACTIVE');
      expect(mockServicesService.joinService).toHaveBeenCalledWith(
        userId,
        serviceSlug,
        countryCode,
        dto.consents,
        expect.any(String),
        expect.any(String),
      );
    });

    it('should throw error when user not authenticated', async () => {
      // Arrange
      const dto = {
        countryCode,
        consents: [],
      };
      const mockReq = {
        user: null,
        headers: {},
        ip: '127.0.0.1',
      } as any;

      // Act & Assert
      await expect(controller.joinService(serviceSlug, dto as any, mockReq)).rejects.toThrow(
        'User authentication required',
      );
    });
  });

  describe('addCountryConsent', () => {
    it('should add country consent', async () => {
      // Arrange
      const dto = {
        consents: [{ type: ConsentType.TERMS_OF_SERVICE, agreed: true }],
      };
      const mockResponse = {
        countryCode: 'JP',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      mockServicesService.addCountryConsent.mockResolvedValue(mockResponse);

      const mockReq = {
        user: mockUser,
        headers: { 'user-agent': 'Mozilla/5.0' },
        ip: '127.0.0.1',
      } as any;

      // Act
      const result = await controller.addCountryConsent(serviceSlug, 'JP', dto as any, mockReq);

      // Assert
      expect(result.countryCode).toBe('JP');
      expect(mockServicesService.addCountryConsent).toHaveBeenCalledWith(
        userId,
        serviceSlug,
        'JP',
        dto.consents,
        expect.any(String),
        expect.any(String),
      );
    });
  });

  describe('getMyConsents', () => {
    it('should return user consents', async () => {
      // Arrange
      const mockConsents = [
        {
          id: generateTestId(),
          consentType: ConsentType.TERMS_OF_SERVICE,
          countryCode,
          agreed: true,
          agreedAt: new Date(),
        },
      ];
      mockServicesService.getMyConsents.mockResolvedValue(mockConsents);

      const mockReq = { user: mockUser } as any;

      // Act
      const result = await controller.getMyConsents(serviceSlug, countryCode, mockReq);

      // Assert
      expect(result).toHaveLength(1);
      expect(mockServicesService.getMyConsents).toHaveBeenCalledWith(
        userId,
        serviceSlug,
        countryCode,
      );
    });

    it('should return consents without country filter', async () => {
      // Arrange
      mockServicesService.getMyConsents.mockResolvedValue([]);
      const mockReq = { user: mockUser } as any;

      // Act
      await controller.getMyConsents(serviceSlug, undefined, mockReq);

      // Assert
      expect(mockServicesService.getMyConsents).toHaveBeenCalledWith(
        userId,
        serviceSlug,
        undefined,
      );
    });
  });

  describe('updateConsent', () => {
    it('should update consent', async () => {
      // Arrange
      const dto = {
        consentType: ConsentType.MARKETING_EMAIL,
        countryCode,
        agreed: false,
      };
      const mockResponse = {
        consent: {
          id: generateTestId(),
          consentType: ConsentType.MARKETING_EMAIL,
          countryCode,
          agreed: false,
          withdrawnAt: new Date(),
        },
      };

      mockServicesService.updateConsent.mockResolvedValue(mockResponse);

      const mockReq = {
        user: mockUser,
        headers: { 'user-agent': 'Mozilla/5.0' },
        ip: '127.0.0.1',
      } as any;

      // Act
      const result = await controller.updateConsent(serviceSlug, dto as any, mockReq);

      // Assert
      expect(result.consent.agreed).toBe(false);
      expect(mockServicesService.updateConsent).toHaveBeenCalledWith(
        userId,
        serviceSlug,
        ConsentType.MARKETING_EMAIL,
        countryCode,
        false,
        expect.any(String),
        expect.any(String),
      );
    });
  });

  describe('withdrawService', () => {
    it('should withdraw from service', async () => {
      // Arrange
      const dto = {
        countryCode,
        reason: 'No longer needed',
      };

      mockServicesService.withdrawService.mockResolvedValue(undefined);

      const mockReq = { user: mockUser } as any;

      // Act
      await controller.withdrawService(serviceSlug, dto as any, mockReq);

      // Assert
      expect(mockServicesService.withdrawService).toHaveBeenCalledWith(
        userId,
        serviceSlug,
        countryCode,
        'No longer needed',
      );
    });

    it('should withdraw from entire service when no country specified', async () => {
      // Arrange
      const dto = {};
      mockServicesService.withdrawService.mockResolvedValue(undefined);
      const mockReq = { user: mockUser } as any;

      // Act
      await controller.withdrawService(serviceSlug, dto as any, mockReq);

      // Assert
      expect(mockServicesService.withdrawService).toHaveBeenCalledWith(
        userId,
        serviceSlug,
        undefined,
        undefined,
      );
    });
  });
});

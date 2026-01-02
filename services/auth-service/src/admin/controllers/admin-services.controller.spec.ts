import { Test, TestingModule } from '@nestjs/testing';
import { AdminServicesController } from './admin-services.controller';
import { AdminServicesService } from '../services/admin-services.service';
import { Reflector } from '@nestjs/core';
import { PermissionGuard } from '../guards/permission.guard';
import {
  ServiceQueryDto,
  ServiceResponse,
  ServiceListResponse,
  ConsentRequirementQueryDto,
  CreateConsentRequirementDto,
  UpdateConsentRequirementDto,
  ConsentRequirementResponse,
  ConsentRequirementListResponse,
  BulkUpdateConsentRequirementsDto,
  AddServiceCountryDto,
  ServiceCountryResponse,
  ServiceCountryListResponse,
  AddServiceLocaleDto,
  ServiceLocaleResponse,
  ServiceLocaleListResponse,
} from '../dto/admin-services.dto';

describe('AdminServicesController', () => {
  let controller: AdminServicesController;
  let mockAdminServicesService: {
    listServices: jest.Mock;
    getServiceById: jest.Mock;
    getServiceBySlug: jest.Mock;
    listConsentRequirements: jest.Mock;
    getConsentRequirement: jest.Mock;
    createConsentRequirement: jest.Mock;
    updateConsentRequirement: jest.Mock;
    deleteConsentRequirement: jest.Mock;
    bulkUpdateConsentRequirements: jest.Mock;
    listServiceCountries: jest.Mock;
    addServiceCountry: jest.Mock;
    removeServiceCountry: jest.Mock;
    listServiceLocales: jest.Mock;
    addServiceLocale: jest.Mock;
    removeServiceLocale: jest.Mock;
  };

  const mockServiceId = '550e8400-e29b-41d4-a716-446655440001';
  const mockConsentId = '550e8400-e29b-41d4-a716-446655440002';

  const mockService: ServiceResponse = {
    id: mockServiceId,
    slug: 'my-girok',
    name: 'My Girok',
    description: 'Main service',
    isActive: true,
    settings: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockConsentRequirement: ConsentRequirementResponse = {
    id: mockConsentId,
    serviceId: mockServiceId,
    countryCode: 'KR',
    consentType: 'TERMS_OF_SERVICE' as any,
    isRequired: true,
    documentType: 'TERMS_OF_SERVICE' as any,
    displayOrder: 1,
    labelKey: 'consent.tos.label',
    descriptionKey: 'consent.tos.description',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockServiceCountry: ServiceCountryResponse = {
    id: '550e8400-e29b-41d4-a716-446655440003',
    serviceId: mockServiceId,
    countryCode: 'KR',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockServiceLocale: ServiceLocaleResponse = {
    id: '550e8400-e29b-41d4-a716-446655440004',
    serviceId: mockServiceId,
    locale: 'ko',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    mockAdminServicesService = {
      listServices: jest.fn(),
      getServiceById: jest.fn(),
      getServiceBySlug: jest.fn(),
      listConsentRequirements: jest.fn(),
      getConsentRequirement: jest.fn(),
      createConsentRequirement: jest.fn(),
      updateConsentRequirement: jest.fn(),
      deleteConsentRequirement: jest.fn(),
      bulkUpdateConsentRequirements: jest.fn(),
      listServiceCountries: jest.fn(),
      addServiceCountry: jest.fn(),
      removeServiceCountry: jest.fn(),
      listServiceLocales: jest.fn(),
      addServiceLocale: jest.fn(),
      removeServiceLocale: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminServicesController],
      providers: [
        { provide: AdminServicesService, useValue: mockAdminServicesService },
        { provide: Reflector, useValue: { getAllAndOverride: jest.fn() } },
      ],
    })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminServicesController>(AdminServicesController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listServices', () => {
    it('should return paginated list of services', async () => {
      const query: ServiceQueryDto = { page: 1, limit: 10, isActive: true };
      const expectedResponse: ServiceListResponse = {
        data: [mockService],
        meta: { total: 1, page: 1, limit: 10 },
      };
      mockAdminServicesService.listServices.mockResolvedValue(expectedResponse);

      const result = await controller.listServices(query);

      expect(result).toEqual(expectedResponse);
      expect(mockAdminServicesService.listServices).toHaveBeenCalledWith(query);
    });

    it('should return empty list when no services found', async () => {
      const query: ServiceQueryDto = {};
      const expectedResponse: ServiceListResponse = {
        data: [],
        meta: { total: 0, page: 1, limit: 10 },
      };
      mockAdminServicesService.listServices.mockResolvedValue(expectedResponse);

      const result = await controller.listServices(query);

      expect(result.data).toHaveLength(0);
    });
  });

  describe('getService', () => {
    it('should return service by id', async () => {
      mockAdminServicesService.getServiceById.mockResolvedValue(mockService);

      const result = await controller.getService(mockServiceId);

      expect(result).toEqual(mockService);
      expect(mockAdminServicesService.getServiceById).toHaveBeenCalledWith(mockServiceId);
    });
  });

  describe('getServiceBySlug', () => {
    it('should return service by slug', async () => {
      mockAdminServicesService.getServiceBySlug.mockResolvedValue(mockService);

      const result = await controller.getServiceBySlug('my-girok');

      expect(result).toEqual(mockService);
      expect(mockAdminServicesService.getServiceBySlug).toHaveBeenCalledWith('my-girok');
    });
  });

  describe('listConsentRequirements', () => {
    it('should return consent requirements for a service', async () => {
      const query: ConsentRequirementQueryDto = { countryCode: 'KR' };
      const expectedResponse: ConsentRequirementListResponse = {
        data: [mockConsentRequirement],
        meta: { total: 1, serviceId: mockServiceId, countryCode: 'KR' },
      };
      mockAdminServicesService.listConsentRequirements.mockResolvedValue(expectedResponse);

      const result = await controller.listConsentRequirements(mockServiceId, query);

      expect(result).toEqual(expectedResponse);
      expect(mockAdminServicesService.listConsentRequirements).toHaveBeenCalledWith(
        mockServiceId,
        query,
      );
    });
  });

  describe('getConsentRequirement', () => {
    it('should return a specific consent requirement', async () => {
      mockAdminServicesService.getConsentRequirement.mockResolvedValue(mockConsentRequirement);

      const result = await controller.getConsentRequirement(mockServiceId, mockConsentId);

      expect(result).toEqual(mockConsentRequirement);
      expect(mockAdminServicesService.getConsentRequirement).toHaveBeenCalledWith(
        mockServiceId,
        mockConsentId,
      );
    });
  });

  describe('createConsentRequirement', () => {
    it('should create a consent requirement', async () => {
      const dto: CreateConsentRequirementDto = {
        countryCode: 'KR',
        consentType: 'TERMS_OF_SERVICE' as any,
        isRequired: true,
        documentType: 'TERMS_OF_SERVICE' as any,
        displayOrder: 1,
        labelKey: 'consent.tos.label',
        descriptionKey: 'consent.tos.description',
      };
      mockAdminServicesService.createConsentRequirement.mockResolvedValue(mockConsentRequirement);

      const result = await controller.createConsentRequirement(mockServiceId, dto);

      expect(result).toEqual(mockConsentRequirement);
      expect(mockAdminServicesService.createConsentRequirement).toHaveBeenCalledWith(
        mockServiceId,
        dto,
      );
    });
  });

  describe('updateConsentRequirement', () => {
    it('should update a consent requirement', async () => {
      const dto: UpdateConsentRequirementDto = {
        isRequired: false,
        displayOrder: 2,
      };
      const updatedRequirement = { ...mockConsentRequirement, ...dto };
      mockAdminServicesService.updateConsentRequirement.mockResolvedValue(updatedRequirement);

      const result = await controller.updateConsentRequirement(mockServiceId, mockConsentId, dto);

      expect(result.isRequired).toBe(false);
      expect(result.displayOrder).toBe(2);
      expect(mockAdminServicesService.updateConsentRequirement).toHaveBeenCalledWith(
        mockServiceId,
        mockConsentId,
        dto,
      );
    });
  });

  describe('deleteConsentRequirement', () => {
    it('should delete a consent requirement', async () => {
      mockAdminServicesService.deleteConsentRequirement.mockResolvedValue(undefined);

      await controller.deleteConsentRequirement(mockServiceId, mockConsentId);

      expect(mockAdminServicesService.deleteConsentRequirement).toHaveBeenCalledWith(
        mockServiceId,
        mockConsentId,
      );
    });
  });

  describe('bulkUpdateConsentRequirements', () => {
    it('should bulk update consent requirements', async () => {
      const dto: BulkUpdateConsentRequirementsDto = {
        countryCode: 'KR',
        requirements: [
          {
            consentType: 'TERMS_OF_SERVICE' as any,
            isRequired: true,
            documentType: 'TERMS_OF_SERVICE' as any,
            displayOrder: 1,
            labelKey: 'consent.tos.label',
            descriptionKey: 'consent.tos.description',
          },
        ],
      };
      const expectedResponse: ConsentRequirementListResponse = {
        data: [mockConsentRequirement],
        meta: { total: 1, serviceId: mockServiceId, countryCode: 'KR' },
      };
      mockAdminServicesService.bulkUpdateConsentRequirements.mockResolvedValue(expectedResponse);

      const result = await controller.bulkUpdateConsentRequirements(mockServiceId, dto);

      expect(result).toEqual(expectedResponse);
      expect(mockAdminServicesService.bulkUpdateConsentRequirements).toHaveBeenCalledWith(
        mockServiceId,
        dto,
      );
    });
  });

  describe('listServiceCountries', () => {
    it('should return list of service countries', async () => {
      const expectedResponse: ServiceCountryListResponse = {
        data: [mockServiceCountry],
        meta: { total: 1, serviceId: mockServiceId },
      };
      mockAdminServicesService.listServiceCountries.mockResolvedValue(expectedResponse);

      const result = await controller.listServiceCountries(mockServiceId);

      expect(result).toEqual(expectedResponse);
      expect(mockAdminServicesService.listServiceCountries).toHaveBeenCalledWith(mockServiceId);
    });
  });

  describe('addServiceCountry', () => {
    it('should add a country to service', async () => {
      const dto: AddServiceCountryDto = { countryCode: 'US' };
      const newCountry = { ...mockServiceCountry, countryCode: 'US' };
      mockAdminServicesService.addServiceCountry.mockResolvedValue(newCountry);

      const result = await controller.addServiceCountry(mockServiceId, dto);

      expect(result.countryCode).toBe('US');
      expect(mockAdminServicesService.addServiceCountry).toHaveBeenCalledWith(mockServiceId, dto);
    });
  });

  describe('removeServiceCountry', () => {
    it('should remove a country from service', async () => {
      mockAdminServicesService.removeServiceCountry.mockResolvedValue(undefined);

      await controller.removeServiceCountry(mockServiceId, 'KR');

      expect(mockAdminServicesService.removeServiceCountry).toHaveBeenCalledWith(
        mockServiceId,
        'KR',
      );
    });
  });

  describe('listServiceLocales', () => {
    it('should return list of service locales', async () => {
      const expectedResponse: ServiceLocaleListResponse = {
        data: [mockServiceLocale],
        meta: { total: 1, serviceId: mockServiceId },
      };
      mockAdminServicesService.listServiceLocales.mockResolvedValue(expectedResponse);

      const result = await controller.listServiceLocales(mockServiceId);

      expect(result).toEqual(expectedResponse);
      expect(mockAdminServicesService.listServiceLocales).toHaveBeenCalledWith(mockServiceId);
    });
  });

  describe('addServiceLocale', () => {
    it('should add a locale to service', async () => {
      const dto: AddServiceLocaleDto = { locale: 'en' };
      const newLocale = { ...mockServiceLocale, locale: 'en' };
      mockAdminServicesService.addServiceLocale.mockResolvedValue(newLocale);

      const result = await controller.addServiceLocale(mockServiceId, dto);

      expect(result.locale).toBe('en');
      expect(mockAdminServicesService.addServiceLocale).toHaveBeenCalledWith(mockServiceId, dto);
    });
  });

  describe('removeServiceLocale', () => {
    it('should remove a locale from service', async () => {
      mockAdminServicesService.removeServiceLocale.mockResolvedValue(undefined);

      await controller.removeServiceLocale(mockServiceId, 'ko');

      expect(mockAdminServicesService.removeServiceLocale).toHaveBeenCalledWith(
        mockServiceId,
        'ko',
      );
    });
  });
});

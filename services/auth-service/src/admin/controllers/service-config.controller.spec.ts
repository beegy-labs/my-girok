import { Test, TestingModule } from '@nestjs/testing';
import { ServiceConfigController } from './service-config.controller';
import { ServiceConfigService } from '../services/service-config.service';
import { Reflector } from '@nestjs/core';
import { PermissionGuard } from '../guards/permission.guard';
import {
  AddDomainDto,
  DomainResponseDto,
  UpdateServiceConfigDto,
  ServiceConfigResponseDto,
  AuditLevel,
} from '../dto/service-config.dto';
import { AdminPayload } from '../types/admin.types';

describe('ServiceConfigController', () => {
  let controller: ServiceConfigController;
  let mockConfigService: {
    getDomains: jest.Mock;
    addDomain: jest.Mock;
    removeDomain: jest.Mock;
    getConfig: jest.Mock;
    updateConfig: jest.Mock;
  };

  const mockServiceId = '550e8400-e29b-41d4-a716-446655440001';

  const mockAdmin: AdminPayload = {
    sub: '550e8400-e29b-41d4-a716-446655440000',
    email: 'admin@example.com',
    name: 'Super Admin',
    type: 'ADMIN_ACCESS',
    accountMode: 'SERVICE',
    scope: 'SYSTEM',
    tenantId: null,
    roleId: '550e8400-e29b-41d4-a716-446655440100',
    roleName: 'SUPER_ADMIN',
    level: 0,
    permissions: ['*'],
    services: {},
  };

  const mockDomainResponse: DomainResponseDto = {
    domains: ['example.com', 'api.example.com'],
    primaryDomain: 'example.com',
  };

  const mockConfig: ServiceConfigResponseDto = {
    id: '550e8400-e29b-41d4-a716-446655440010',
    serviceId: mockServiceId,
    jwtValidation: true,
    domainValidation: true,
    ipWhitelistEnabled: false,
    ipWhitelist: [],
    rateLimitEnabled: true,
    rateLimitRequests: 1000,
    rateLimitWindow: 60,
    maintenanceMode: false,
    maintenanceMessage: null,
    auditLevel: AuditLevel.STANDARD,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    updatedBy: null,
  };

  beforeEach(async () => {
    mockConfigService = {
      getDomains: jest.fn(),
      addDomain: jest.fn(),
      removeDomain: jest.fn(),
      getConfig: jest.fn(),
      updateConfig: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServiceConfigController],
      providers: [
        { provide: ServiceConfigService, useValue: mockConfigService },
        { provide: Reflector, useValue: { getAllAndOverride: jest.fn() } },
      ],
    })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ServiceConfigController>(ServiceConfigController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // DOMAIN MANAGEMENT
  // ============================================================

  describe('getDomains', () => {
    it('should return service domains', async () => {
      mockConfigService.getDomains.mockResolvedValue(mockDomainResponse);

      const result = await controller.getDomains(mockServiceId);

      expect(result).toEqual(mockDomainResponse);
      expect(mockConfigService.getDomains).toHaveBeenCalledWith(mockServiceId);
    });

    it('should return empty domains list', async () => {
      mockConfigService.getDomains.mockResolvedValue({
        domains: [],
        primaryDomain: null,
      });

      const result = await controller.getDomains(mockServiceId);

      expect(result.domains).toHaveLength(0);
      expect(result.primaryDomain).toBeNull();
    });
  });

  describe('addDomain', () => {
    it('should add a domain to service', async () => {
      const dto: AddDomainDto = { domain: 'new.example.com' };
      const updatedDomains = {
        domains: [...mockDomainResponse.domains, 'new.example.com'],
        primaryDomain: 'example.com',
      };
      mockConfigService.addDomain.mockResolvedValue(updatedDomains);

      const result = await controller.addDomain(mockServiceId, dto, mockAdmin);

      expect(result.domains).toContain('new.example.com');
      expect(mockConfigService.addDomain).toHaveBeenCalledWith(mockServiceId, dto, mockAdmin);
    });

    it('should add domain as primary', async () => {
      const dto: AddDomainDto = { domain: 'primary.example.com', isPrimary: true };
      const updatedDomains = {
        domains: [...mockDomainResponse.domains, 'primary.example.com'],
        primaryDomain: 'primary.example.com',
      };
      mockConfigService.addDomain.mockResolvedValue(updatedDomains);

      const result = await controller.addDomain(mockServiceId, dto, mockAdmin);

      expect(result.primaryDomain).toBe('primary.example.com');
    });
  });

  describe('removeDomain', () => {
    it('should remove a domain from service', async () => {
      const updatedDomains = {
        domains: ['example.com'],
        primaryDomain: 'example.com',
      };
      mockConfigService.removeDomain.mockResolvedValue(updatedDomains);

      const result = await controller.removeDomain(mockServiceId, 'api.example.com', mockAdmin);

      expect(result.domains).not.toContain('api.example.com');
      expect(mockConfigService.removeDomain).toHaveBeenCalledWith(
        mockServiceId,
        'api.example.com',
        mockAdmin,
      );
    });
  });

  // ============================================================
  // CONFIG MANAGEMENT
  // ============================================================

  describe('getConfig', () => {
    it('should return service configuration', async () => {
      mockConfigService.getConfig.mockResolvedValue(mockConfig);

      const result = await controller.getConfig(mockServiceId);

      expect(result).toEqual(mockConfig);
      expect(mockConfigService.getConfig).toHaveBeenCalledWith(mockServiceId);
    });
  });

  describe('updateConfig', () => {
    it('should update service configuration', async () => {
      const dto: UpdateServiceConfigDto = {
        rateLimitEnabled: false,
        reason: 'Disabling rate limit for testing',
      };
      const updatedConfig = { ...mockConfig, rateLimitEnabled: false };
      mockConfigService.updateConfig.mockResolvedValue(updatedConfig);

      const result = await controller.updateConfig(mockServiceId, dto, mockAdmin);

      expect(result.rateLimitEnabled).toBe(false);
      expect(mockConfigService.updateConfig).toHaveBeenCalledWith(mockServiceId, dto, mockAdmin);
    });

    it('should enable maintenance mode', async () => {
      const dto: UpdateServiceConfigDto = {
        maintenanceMode: true,
        maintenanceMessage: 'System under maintenance. Please try again later.',
        reason: 'Scheduled maintenance window',
      };
      const updatedConfig = {
        ...mockConfig,
        maintenanceMode: true,
        maintenanceMessage: dto.maintenanceMessage,
      };
      mockConfigService.updateConfig.mockResolvedValue(updatedConfig);

      const result = await controller.updateConfig(mockServiceId, dto, mockAdmin);

      expect(result.maintenanceMode).toBe(true);
      expect(result.maintenanceMessage).toBe(dto.maintenanceMessage);
    });

    it('should configure IP whitelist', async () => {
      const dto: UpdateServiceConfigDto = {
        ipWhitelistEnabled: true,
        ipWhitelist: ['192.168.1.1', '10.0.0.0'],
        reason: 'Enabling IP whitelist for security',
      };
      const updatedConfig = {
        ...mockConfig,
        ipWhitelistEnabled: true,
        ipWhitelist: dto.ipWhitelist,
      };
      mockConfigService.updateConfig.mockResolvedValue(updatedConfig);

      const result = await controller.updateConfig(mockServiceId, dto, mockAdmin);

      expect(result.ipWhitelistEnabled).toBe(true);
      expect(result.ipWhitelist).toEqual(dto.ipWhitelist);
    });

    it('should update audit level', async () => {
      const dto: UpdateServiceConfigDto = {
        auditLevel: AuditLevel.VERBOSE,
        reason: 'Increasing audit level for debugging',
      };
      const updatedConfig = { ...mockConfig, auditLevel: AuditLevel.VERBOSE };
      mockConfigService.updateConfig.mockResolvedValue(updatedConfig);

      const result = await controller.updateConfig(mockServiceId, dto, mockAdmin);

      expect(result.auditLevel).toBe(AuditLevel.VERBOSE);
    });

    it('should update rate limit settings', async () => {
      const dto: UpdateServiceConfigDto = {
        rateLimitRequests: 5000,
        rateLimitWindow: 120,
        reason: 'Increasing rate limits for high-traffic period',
      };
      const updatedConfig = {
        ...mockConfig,
        rateLimitRequests: 5000,
        rateLimitWindow: 120,
      };
      mockConfigService.updateConfig.mockResolvedValue(updatedConfig);

      const result = await controller.updateConfig(mockServiceId, dto, mockAdmin);

      expect(result.rateLimitRequests).toBe(5000);
      expect(result.rateLimitWindow).toBe(120);
    });

    it('should toggle validation settings', async () => {
      const dto: UpdateServiceConfigDto = {
        jwtValidation: false,
        domainValidation: false,
        reason: 'Disabling validations for development',
      };
      const updatedConfig = {
        ...mockConfig,
        jwtValidation: false,
        domainValidation: false,
      };
      mockConfigService.updateConfig.mockResolvedValue(updatedConfig);

      const result = await controller.updateConfig(mockServiceId, dto, mockAdmin);

      expect(result.jwtValidation).toBe(false);
      expect(result.domainValidation).toBe(false);
    });
  });
});

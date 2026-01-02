import { Test, TestingModule } from '@nestjs/testing';

import { OperatorAuthController } from '../../src/operator/controllers/operator-auth.controller';
import { OperatorAuthService } from '../../src/operator/services/operator-auth.service';
import { generateTestId, resetTestCounter } from '../utils/test-factory';

describe('OperatorAuthController', () => {
  let controller: OperatorAuthController;
  let mockOperatorAuthService: {
    login: jest.Mock;
    acceptInvitation: jest.Mock;
    refresh: jest.Mock;
    logout: jest.Mock;
    getProfile: jest.Mock;
  };

  const operatorId = '00000000-0000-7000-0000-000000000001';
  const serviceSlug = 'my-girok';

  const mockOperatorPayload = {
    sub: operatorId,
    email: 'operator@test.com',
    name: 'Test Operator',
    type: 'OPERATOR_ACCESS' as const,
    adminId: generateTestId(),
    serviceId: generateTestId(),
    serviceSlug,
    countryCode: 'KR',
    permissions: ['content:read'],
  };

  beforeEach(async () => {
    resetTestCounter();

    mockOperatorAuthService = {
      login: jest.fn(),
      acceptInvitation: jest.fn(),
      refresh: jest.fn(),
      logout: jest.fn(),
      getProfile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OperatorAuthController],
      providers: [{ provide: OperatorAuthService, useValue: mockOperatorAuthService }],
    }).compile();

    controller = module.get<OperatorAuthController>(OperatorAuthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should login operator and return tokens', async () => {
      // Arrange
      const dto = {
        email: 'operator@test.com',
        password: 'password123',
        serviceSlug,
      };
      const mockResponse = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        operator: {
          id: operatorId,
          email: 'operator@test.com',
          name: 'Test Operator',
          serviceSlug,
          serviceName: 'My Girok',
          countryCode: 'KR',
          permissions: ['content:read'],
        },
      };

      mockOperatorAuthService.login.mockResolvedValue(mockResponse);

      // Act
      const result = await controller.login(dto);

      // Assert
      expect(result.accessToken).toBe('access-token');
      expect(result.operator.email).toBe('operator@test.com');
      expect(mockOperatorAuthService.login).toHaveBeenCalledWith(dto);
    });
  });

  describe('acceptInvitation', () => {
    it('should accept invitation and return tokens', async () => {
      // Arrange
      const dto = {
        token: 'invitation-token',
        password: 'newpassword123',
      };
      const mockResponse = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        operator: {
          id: operatorId,
          email: 'new-operator@test.com',
          name: 'New Operator',
          serviceSlug,
          serviceName: 'My Girok',
          countryCode: 'KR',
          permissions: [],
        },
      };

      mockOperatorAuthService.acceptInvitation.mockResolvedValue(mockResponse);

      // Act
      const result = await controller.acceptInvitation(dto);

      // Assert
      expect(result.accessToken).toBe('access-token');
      expect(result.operator.email).toBe('new-operator@test.com');
      expect(mockOperatorAuthService.acceptInvitation).toHaveBeenCalledWith(dto);
    });
  });

  describe('refresh', () => {
    it('should refresh tokens', async () => {
      // Arrange
      const dto = { refreshToken: 'old-refresh-token' };
      const mockResponse = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      mockOperatorAuthService.refresh.mockResolvedValue(mockResponse);

      // Act
      const result = await controller.refresh(dto);

      // Assert
      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
      expect(mockOperatorAuthService.refresh).toHaveBeenCalledWith('old-refresh-token');
    });
  });

  describe('logout', () => {
    it('should logout operator', async () => {
      // Arrange
      const dto = { refreshToken: 'refresh-token' };
      mockOperatorAuthService.logout.mockResolvedValue(undefined);

      // Act
      await controller.logout(mockOperatorPayload, dto);

      // Assert
      expect(mockOperatorAuthService.logout).toHaveBeenCalledWith(operatorId, 'refresh-token');
    });
  });

  describe('getProfile', () => {
    it('should return operator profile', async () => {
      // Arrange
      const mockProfile = {
        id: operatorId,
        email: 'operator@test.com',
        name: 'Test Operator',
        serviceId: generateTestId(),
        serviceSlug,
        serviceName: 'My Girok',
        countryCode: 'KR',
        isActive: true,
        permissions: ['content:read'],
        lastLoginAt: new Date(),
        createdAt: new Date(),
      };

      mockOperatorAuthService.getProfile.mockResolvedValue(mockProfile);

      // Act
      const result = await controller.getProfile(mockOperatorPayload);

      // Assert
      expect(result.id).toBe(operatorId);
      expect(result.email).toBe('operator@test.com');
      expect(mockOperatorAuthService.getProfile).toHaveBeenCalledWith(operatorId);
    });
  });
});

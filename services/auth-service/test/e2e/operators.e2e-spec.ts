import { Test, TestingModule } from '@nestjs/testing';

import { OperatorController } from '../../src/admin/controllers/operator.controller';
import { OperatorService } from '../../src/admin/services/operator.service';
import {
  createOperatorResponse,
  createAdminPayload,
  generateTestId,
  resetTestCounter,
} from '../utils/test-factory';
import { InvitationType } from '../../src/admin/dto/operator.dto';

// Mock service type with jest.fn() methods
type MockOperatorService = {
  [K in keyof OperatorService]?: jest.Mock;
};

describe('OperatorController', () => {
  let controller: OperatorController;
  let mockOperatorService: MockOperatorService;

  const adminPayload = createAdminPayload({ permissions: ['operator:*'] });

  beforeEach(async () => {
    resetTestCounter();

    mockOperatorService = {
      create: jest.fn(),
      invite: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      grantPermission: jest.fn(),
      revokePermission: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OperatorController],
      providers: [{ provide: OperatorService, useValue: mockOperatorService }],
    }).compile();

    controller = module.get<OperatorController>(OperatorController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new operator', async () => {
      // Arrange
      const operatorResponse = createOperatorResponse({
        email: 'newoperator@test.com',
        name: 'New Operator',
      });

      mockOperatorService.create!.mockResolvedValue(operatorResponse);

      // Act
      const result = await controller.create(adminPayload, {
        email: 'newoperator@test.com',
        name: 'New Operator',
        serviceSlug: 'test-service',
        countryCode: 'KR',
        tempPassword: 'TempPass123!',
      });

      // Assert
      expect(result.email).toBe('newoperator@test.com');
      expect(mockOperatorService.create).toHaveBeenCalledWith(
        adminPayload.sub,
        expect.objectContaining({
          email: 'newoperator@test.com',
          name: 'New Operator',
        }),
      );
    });

    it('should pass permission IDs to service', async () => {
      // Arrange
      const permissionId = generateTestId();
      const operatorResponse = createOperatorResponse();

      mockOperatorService.create!.mockResolvedValue(operatorResponse);

      // Act
      await controller.create(adminPayload, {
        email: 'operator@test.com',
        name: 'Test Operator',
        serviceSlug: 'test-service',
        countryCode: 'KR',
        tempPassword: 'TempPass123!',
        permissionIds: [permissionId],
      });

      // Assert
      expect(mockOperatorService.create).toHaveBeenCalledWith(
        adminPayload.sub,
        expect.objectContaining({
          permissionIds: [permissionId],
        }),
      );
    });
  });

  describe('invite', () => {
    it('should invite an operator via email', async () => {
      // Arrange
      const invitationResponse = {
        id: generateTestId(),
        email: 'invited@test.com',
        name: 'Invited User',
        type: 'EMAIL',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      mockOperatorService.invite!.mockResolvedValue(invitationResponse);

      // Act
      const result = await controller.invite(adminPayload, {
        email: 'invited@test.com',
        name: 'Invited User',
        serviceSlug: 'test-service',
        countryCode: 'KR',
        type: InvitationType.EMAIL,
        permissionIds: [],
      });

      // Assert
      expect(result.email).toBe('invited@test.com');
      expect(result.type).toBe('EMAIL');
    });

    it('should invite an operator directly', async () => {
      // Arrange
      const invitationResponse = {
        id: generateTestId(),
        email: 'direct@test.com',
        name: 'Direct User',
        type: 'DIRECT',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      mockOperatorService.invite!.mockResolvedValue(invitationResponse);

      // Act
      const result = await controller.invite(adminPayload, {
        email: 'direct@test.com',
        name: 'Direct User',
        serviceSlug: 'test-service',
        countryCode: 'KR',
        type: InvitationType.DIRECT,
        tempPassword: 'TempPass123!',
        permissionIds: [],
      });

      // Assert
      expect(result.type).toBe('DIRECT');
    });
  });

  describe('findAll', () => {
    it('should return list of operators', async () => {
      // Arrange
      const operators = [
        createOperatorResponse({ email: 'op1@test.com' }),
        createOperatorResponse({ email: 'op2@test.com' }),
      ];

      mockOperatorService.findAll!.mockResolvedValue({
        operators,
        total: 2,
      });

      // Act
      const result = await controller.findAll(adminPayload, {});

      // Assert
      expect(result.operators).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should pass query parameters to service', async () => {
      // Arrange
      mockOperatorService.findAll!.mockResolvedValue({
        operators: [],
        total: 0,
      });

      // Act
      await controller.findAll(adminPayload, {
        serviceSlug: 'specific-service',
        isActive: true,
      });

      // Assert
      expect(mockOperatorService.findAll).toHaveBeenCalledWith(
        adminPayload.sub,
        expect.objectContaining({
          serviceSlug: 'specific-service',
          isActive: true,
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return operator by ID', async () => {
      // Arrange
      const operatorId = generateTestId();
      const operator = createOperatorResponse({ id: operatorId });

      mockOperatorService.findById!.mockResolvedValue(operator);

      // Act
      const result = await controller.findById(operatorId);

      // Assert
      expect(result.id).toBe(operatorId);
      expect(mockOperatorService.findById).toHaveBeenCalledWith(operatorId);
    });
  });

  describe('update', () => {
    it('should update operator', async () => {
      // Arrange
      const operatorId = generateTestId();
      const updatedOperator = createOperatorResponse({
        id: operatorId,
        name: 'Updated Name',
      });

      mockOperatorService.update!.mockResolvedValue(updatedOperator);

      // Act
      const result = await controller.update(adminPayload, operatorId, {
        name: 'Updated Name',
      });

      // Assert
      expect(result.name).toBe('Updated Name');
      expect(mockOperatorService.update).toHaveBeenCalledWith(
        adminPayload.sub,
        operatorId,
        expect.objectContaining({ name: 'Updated Name' }),
      );
    });

    it('should update active status', async () => {
      // Arrange
      const operatorId = generateTestId();
      const updatedOperator = createOperatorResponse({
        id: operatorId,
        isActive: false,
      });

      mockOperatorService.update!.mockResolvedValue(updatedOperator);

      // Act
      const result = await controller.update(adminPayload, operatorId, {
        isActive: false,
      });

      // Assert
      expect(result.isActive).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete operator', async () => {
      // Arrange
      const operatorId = generateTestId();
      mockOperatorService.delete!.mockResolvedValue(undefined);

      // Act
      await controller.delete(adminPayload, operatorId);

      // Assert
      expect(mockOperatorService.delete).toHaveBeenCalledWith(adminPayload.sub, operatorId);
    });
  });

  describe('grantPermission', () => {
    it('should grant permission to operator', async () => {
      // Arrange
      const operatorId = generateTestId();
      const permissionId = generateTestId();
      mockOperatorService.grantPermission!.mockResolvedValue(undefined);

      // Act
      await controller.grantPermission(adminPayload, operatorId, {
        permissionId,
      });

      // Assert
      expect(mockOperatorService.grantPermission).toHaveBeenCalledWith(
        adminPayload.sub,
        operatorId,
        permissionId,
      );
    });
  });

  describe('revokePermission', () => {
    it('should revoke permission from operator', async () => {
      // Arrange
      const operatorId = generateTestId();
      const permissionId = generateTestId();
      mockOperatorService.revokePermission!.mockResolvedValue(undefined);

      // Act
      await controller.revokePermission(adminPayload, operatorId, permissionId);

      // Assert
      expect(mockOperatorService.revokePermission).toHaveBeenCalledWith(
        adminPayload.sub,
        operatorId,
        permissionId,
      );
    });
  });
});

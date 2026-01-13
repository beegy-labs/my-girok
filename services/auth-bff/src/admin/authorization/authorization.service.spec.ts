import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthorizationService } from './authorization.service';
import { AuthorizationGrpcClient } from '../../grpc-clients/authorization.client';

describe('AuthorizationService', () => {
  let service: AuthorizationService;
  let authzClient: {
    check: ReturnType<typeof vi.fn>;
    batchCheck: ReturnType<typeof vi.fn>;
    listModels: ReturnType<typeof vi.fn>;
    writeModel: ReturnType<typeof vi.fn>;
    activateModel: ReturnType<typeof vi.fn>;
    grant: ReturnType<typeof vi.fn>;
    revoke: ReturnType<typeof vi.fn>;
    listObjects: ReturnType<typeof vi.fn>;
    listUsers: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    authzClient = {
      check: vi.fn(),
      batchCheck: vi.fn(),
      listModels: vi.fn(),
      writeModel: vi.fn(),
      activateModel: vi.fn(),
      grant: vi.fn(),
      revoke: vi.fn(),
      listObjects: vi.fn(),
      listUsers: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthorizationService,
        { provide: AuthorizationGrpcClient, useValue: authzClient },
      ],
    }).compile();

    service = module.get<AuthorizationService>(AuthorizationService);
  });

  describe('check', () => {
    it('should check permission and return allowed true', async () => {
      authzClient.check.mockResolvedValue(true);

      const result = await service.check('user:123', 'viewer', 'resource:456');

      expect(result).toEqual({
        allowed: true,
        user: 'user:123',
        relation: 'viewer',
        object: 'resource:456',
      });
      expect(authzClient.check).toHaveBeenCalledWith('user:123', 'viewer', 'resource:456');
    });

    it('should check permission and return allowed false', async () => {
      authzClient.check.mockResolvedValue(false);

      const result = await service.check('user:123', 'editor', 'resource:456');

      expect(result).toEqual({
        allowed: false,
        user: 'user:123',
        relation: 'editor',
        object: 'resource:456',
      });
    });

    it('should return allowed false on error', async () => {
      authzClient.check.mockRejectedValue(new Error('gRPC error'));

      const result = await service.check('user:123', 'viewer', 'resource:456');

      expect(result).toEqual({
        allowed: false,
        user: 'user:123',
        relation: 'viewer',
        object: 'resource:456',
      });
    });
  });

  describe('batchCheck', () => {
    it('should batch check permissions successfully', async () => {
      const checks = [
        { user: 'user:1', relation: 'viewer', object: 'resource:1' },
        { user: 'user:2', relation: 'editor', object: 'resource:2' },
        { user: 'user:3', relation: 'admin', object: 'resource:3' },
      ];
      authzClient.batchCheck.mockResolvedValue([true, false, true]);

      const result = await service.batchCheck(checks);

      expect(result).toEqual([
        { allowed: true, user: 'user:1', relation: 'viewer', object: 'resource:1' },
        { allowed: false, user: 'user:2', relation: 'editor', object: 'resource:2' },
        { allowed: true, user: 'user:3', relation: 'admin', object: 'resource:3' },
      ]);
    });

    it('should return all false on error', async () => {
      const checks = [
        { user: 'user:1', relation: 'viewer', object: 'resource:1' },
        { user: 'user:2', relation: 'editor', object: 'resource:2' },
      ];
      authzClient.batchCheck.mockRejectedValue(new Error('gRPC error'));

      const result = await service.batchCheck(checks);

      expect(result).toEqual([
        { allowed: false, user: 'user:1', relation: 'viewer', object: 'resource:1' },
        { allowed: false, user: 'user:2', relation: 'editor', object: 'resource:2' },
      ]);
    });
  });

  describe('getModel', () => {
    it('should return active model', async () => {
      const mockModels = {
        models: [
          {
            modelId: 'model-123',
            versionId: '5',
            isActive: true,
            createdAt: '2024-01-15T10:00:00Z',
          },
          {
            modelId: 'model-456',
            versionId: '4',
            isActive: false,
            createdAt: '2024-01-14T10:00:00Z',
          },
        ],
      };
      authzClient.listModels.mockResolvedValue(mockModels);

      const result = await service.getModel();

      expect(result).toEqual({
        id: 'model-123',
        version: 5,
        content: '',
        isActive: true,
        createdAt: '2024-01-15T10:00:00Z',
        createdBy: 'system',
      });
      expect(authzClient.listModels).toHaveBeenCalledWith(1);
    });

    it('should return first model if no active model exists', async () => {
      const mockModels = {
        models: [
          {
            modelId: 'model-789',
            versionId: '3',
            isActive: false,
            createdAt: '2024-01-13T10:00:00Z',
          },
        ],
      };
      authzClient.listModels.mockResolvedValue(mockModels);

      const result = await service.getModel();

      expect(result.id).toBe('model-789');
      expect(result.isActive).toBe(false);
    });

    it('should return empty model when no models exist', async () => {
      authzClient.listModels.mockResolvedValue({ models: [] });

      const result = await service.getModel();

      expect(result).toMatchObject({
        id: '',
        version: 0,
        content: '',
        isActive: false,
        createdBy: '',
      });
    });

    it('should return empty model on error', async () => {
      authzClient.listModels.mockRejectedValue(new Error('gRPC error'));

      const result = await service.getModel();

      expect(result).toMatchObject({
        id: '',
        version: 0,
        content: '',
        isActive: false,
        createdBy: '',
      });
    });
  });

  describe('getModelVersions', () => {
    it('should return all model versions', async () => {
      const mockModels = {
        models: [
          {
            modelId: 'model-1',
            versionId: '3',
            isActive: true,
            createdAt: '2024-01-15T10:00:00Z',
          },
          {
            modelId: 'model-2',
            versionId: '2',
            isActive: false,
            createdAt: '2024-01-14T10:00:00Z',
          },
          {
            modelId: 'model-3',
            versionId: '1',
            isActive: false,
            createdAt: '2024-01-13T10:00:00Z',
          },
        ],
      };
      authzClient.listModels.mockResolvedValue(mockModels);

      const result = await service.getModelVersions();

      expect(result).toEqual([
        { id: 'model-1', version: 3, isActive: true, createdAt: '2024-01-15T10:00:00Z' },
        { id: 'model-2', version: 2, isActive: false, createdAt: '2024-01-14T10:00:00Z' },
        { id: 'model-3', version: 1, isActive: false, createdAt: '2024-01-13T10:00:00Z' },
      ]);
      expect(authzClient.listModels).toHaveBeenCalledWith(100);
    });

    it('should return empty array when no models exist', async () => {
      authzClient.listModels.mockResolvedValue(null);

      const result = await service.getModelVersions();

      expect(result).toEqual([]);
    });

    it('should return empty array on error', async () => {
      authzClient.listModels.mockRejectedValue(new Error('gRPC error'));

      const result = await service.getModelVersions();

      expect(result).toEqual([]);
    });
  });

  describe('createModel', () => {
    it('should create model successfully', async () => {
      const dslSource = 'type user\n\ntype resource\n  relations\n    define viewer: [user]';
      const mockResponse = {
        success: true,
        modelId: 'model-new-123',
        versionId: '1',
      };
      authzClient.writeModel.mockResolvedValue(mockResponse);

      const result = await service.createModel(dslSource);

      expect(result).toEqual({
        success: true,
        modelId: 'model-new-123',
        versionId: '1',
      });
      expect(authzClient.writeModel).toHaveBeenCalledWith(dslSource, undefined);
    });

    it('should create and activate model when activate flag is true', async () => {
      const dslSource = 'type user\n\ntype resource\n  relations\n    define viewer: [user]';
      const mockResponse = {
        success: true,
        modelId: 'model-new-456',
        versionId: '1',
      };
      authzClient.writeModel.mockResolvedValue(mockResponse);

      const result = await service.createModel(dslSource, true);

      expect(result).toEqual({
        success: true,
        modelId: 'model-new-456',
        versionId: '1',
      });
      expect(authzClient.writeModel).toHaveBeenCalledWith(dslSource, true);
    });

    it('should return validation errors when model is invalid', async () => {
      const dslSource = 'invalid dsl syntax';
      const mockResponse = {
        success: false,
        errors: [
          { type: 'syntax', message: 'Unexpected token', line: 1, column: 0 },
          { type: 'validation', relation: 'viewer', message: 'Undefined type reference' },
        ],
      };
      authzClient.writeModel.mockResolvedValue(mockResponse);

      const result = await service.createModel(dslSource);

      expect(result).toEqual({
        success: false,
        errors: mockResponse.errors,
      });
    });

    it('should throw error when no response from server', async () => {
      const dslSource = 'type user';
      authzClient.writeModel.mockResolvedValue(null);

      await expect(service.createModel(dslSource)).rejects.toThrow(
        'Failed to create model: No response from server',
      );
    });

    it('should throw error on gRPC failure', async () => {
      const dslSource = 'type user';
      authzClient.writeModel.mockRejectedValue(new Error('gRPC connection failed'));

      await expect(service.createModel(dslSource)).rejects.toThrow('gRPC connection failed');
    });
  });

  describe('validateModel', () => {
    it('should return valid for non-empty DSL source', async () => {
      const dslSource = 'type user\n\ntype resource\n  relations\n    define viewer: [user]';

      const result = await service.validateModel(dslSource);

      expect(result).toEqual({
        valid: true,
        errors: [],
      });
    });

    it('should return invalid for empty DSL source', async () => {
      const result = await service.validateModel('');

      expect(result).toEqual({
        valid: false,
        errors: ['Model content cannot be empty'],
      });
    });

    it('should return invalid for whitespace-only DSL source', async () => {
      const result = await service.validateModel('   \n  \t  ');

      expect(result).toEqual({
        valid: false,
        errors: ['Model content cannot be empty'],
      });
    });
  });

  describe('activateModel', () => {
    it('should activate model successfully', async () => {
      const modelId = 'model-123';
      const mockResponse = {
        success: true,
        message: 'Model activated successfully',
      };
      authzClient.activateModel.mockResolvedValue(mockResponse);

      const result = await service.activateModel(modelId);

      expect(result).toEqual({
        success: true,
        message: 'Model activated successfully',
      });
      expect(authzClient.activateModel).toHaveBeenCalledWith(modelId);
    });

    it('should use default message when server does not provide one', async () => {
      const modelId = 'model-456';
      const mockResponse = {
        success: true,
      };
      authzClient.activateModel.mockResolvedValue(mockResponse);

      const result = await service.activateModel(modelId);

      expect(result).toEqual({
        success: true,
        message: 'Model activated successfully',
      });
    });

    it('should throw error when activation fails', async () => {
      const modelId = 'model-789';
      const mockResponse = {
        success: false,
        message: 'Model not found',
      };
      authzClient.activateModel.mockResolvedValue(mockResponse);

      await expect(service.activateModel(modelId)).rejects.toThrow('Model not found');
    });

    it('should throw error when no response from server', async () => {
      const modelId = 'model-000';
      authzClient.activateModel.mockResolvedValue(null);

      await expect(service.activateModel(modelId)).rejects.toThrow(
        'Failed to activate model: No response from server',
      );
    });

    it('should throw error on gRPC failure', async () => {
      const modelId = 'model-111';
      authzClient.activateModel.mockRejectedValue(new Error('gRPC connection failed'));

      await expect(service.activateModel(modelId)).rejects.toThrow('gRPC connection failed');
    });
  });

  describe('grant', () => {
    it('should grant permission successfully', async () => {
      authzClient.grant.mockResolvedValue(undefined);

      const result = await service.grant('user:123', 'viewer', 'resource:456');

      expect(result).toEqual({ success: true });
      expect(authzClient.grant).toHaveBeenCalledWith('user:123', 'viewer', 'resource:456');
    });

    it('should throw error on failure', async () => {
      authzClient.grant.mockRejectedValue(new Error('Permission already exists'));

      await expect(service.grant('user:123', 'viewer', 'resource:456')).rejects.toThrow(
        'Permission already exists',
      );
    });
  });

  describe('revoke', () => {
    it('should revoke permission successfully', async () => {
      authzClient.revoke.mockResolvedValue(undefined);

      const result = await service.revoke('user:123', 'viewer', 'resource:456');

      expect(result).toEqual({ success: true });
      expect(authzClient.revoke).toHaveBeenCalledWith('user:123', 'viewer', 'resource:456');
    });

    it('should throw error on failure', async () => {
      authzClient.revoke.mockRejectedValue(new Error('Permission not found'));

      await expect(service.revoke('user:123', 'viewer', 'resource:456')).rejects.toThrow(
        'Permission not found',
      );
    });
  });

  describe('listObjects', () => {
    it('should list objects user can access', async () => {
      const mockObjects = ['resource:1', 'resource:2', 'resource:3'];
      authzClient.listObjects.mockResolvedValue(mockObjects);

      const result = await service.listObjects('user:123', 'viewer', 'resource');

      expect(result).toEqual({
        objects: mockObjects,
        user: 'user:123',
        relation: 'viewer',
        objectType: 'resource',
      });
      expect(authzClient.listObjects).toHaveBeenCalledWith('user:123', 'viewer', 'resource');
    });

    it('should return empty array on error', async () => {
      authzClient.listObjects.mockRejectedValue(new Error('gRPC error'));

      const result = await service.listObjects('user:123', 'viewer', 'resource');

      expect(result).toEqual({
        objects: [],
        user: 'user:123',
        relation: 'viewer',
        objectType: 'resource',
      });
    });
  });

  describe('listUsers', () => {
    it('should list users with access to object', async () => {
      const mockUsers = ['user:1', 'user:2', 'user:3'];
      authzClient.listUsers.mockResolvedValue(mockUsers);

      const result = await service.listUsers('resource:456', 'viewer');

      expect(result).toEqual({
        users: mockUsers,
        object: 'resource:456',
        relation: 'viewer',
      });
      expect(authzClient.listUsers).toHaveBeenCalledWith('resource:456', 'viewer');
    });

    it('should return empty array on error', async () => {
      authzClient.listUsers.mockRejectedValue(new Error('gRPC error'));

      const result = await service.listUsers('resource:456', 'viewer');

      expect(result).toEqual({
        users: [],
        object: 'resource:456',
        relation: 'viewer',
      });
    });
  });
});

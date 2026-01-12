import { Test, TestingModule } from '@nestjs/testing';
import { vi, describe, it, expect, beforeEach, type MockInstance } from 'vitest';
import { AuthorizationService } from '../../src/admin/authorization/authorization.service';
import { AuthorizationGrpcClient } from '../../src/grpc-clients/authorization.client';

describe('AuthorizationService', () => {
  let service: AuthorizationService;
  let authzClient: {
    check: MockInstance;
    batchCheck: MockInstance;
    grant: MockInstance;
    revoke: MockInstance;
    listObjects: MockInstance;
    listUsers: MockInstance;
    listModels: MockInstance;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthorizationService,
        {
          provide: AuthorizationGrpcClient,
          useValue: {
            check: vi.fn(),
            batchCheck: vi.fn(),
            grant: vi.fn(),
            revoke: vi.fn(),
            listObjects: vi.fn(),
            listUsers: vi.fn(),
            listModels: vi.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthorizationService>(AuthorizationService);
    authzClient = module.get(AuthorizationGrpcClient);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('check', () => {
    it('should check permission successfully', async () => {
      authzClient.check.mockResolvedValue(true);

      const result = await service.check('user:123', 'viewer', 'session:456');

      expect(result.allowed).toBe(true);
      expect(result.user).toBe('user:123');
      expect(result.relation).toBe('viewer');
      expect(result.object).toBe('session:456');
    });

    it('should return false when permission denied', async () => {
      authzClient.check.mockResolvedValue(false);

      const result = await service.check('user:123', 'admin', 'session:456');

      expect(result.allowed).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      authzClient.check.mockRejectedValue(new Error('gRPC error'));

      const result = await service.check('user:123', 'viewer', 'session:456');

      expect(result.allowed).toBe(false);
    });
  });

  describe('batchCheck', () => {
    it('should batch check permissions', async () => {
      authzClient.batchCheck.mockResolvedValue([true, false, true]);

      const checks = [
        { user: 'user:1', relation: 'viewer', object: 'session:1' },
        { user: 'user:1', relation: 'admin', object: 'session:1' },
        { user: 'user:1', relation: 'viewer', object: 'session:2' },
      ];

      const result = await service.batchCheck(checks);

      expect(result).toHaveLength(3);
      expect(result[0].allowed).toBe(true);
      expect(result[1].allowed).toBe(false);
      expect(result[2].allowed).toBe(true);
    });

    it('should handle errors', async () => {
      authzClient.batchCheck.mockRejectedValue(new Error('Error'));

      const checks = [{ user: 'user:1', relation: 'viewer', object: 'session:1' }];

      const result = await service.batchCheck(checks);

      expect(result[0].allowed).toBe(false);
    });
  });

  describe('getModel', () => {
    it('should return active authorization model from gRPC', async () => {
      const mockResponse = {
        models: [
          {
            modelId: 'model-123',
            versionId: '1234567890',
            isActive: true,
            createdAt: '2026-01-12T10:00:00Z',
          },
        ],
        nextPageToken: undefined,
      };

      authzClient.listModels.mockResolvedValue(mockResponse);

      const result = await service.getModel();

      expect(result.id).toBe('model-123');
      expect(result.version).toBe(1234567890);
      expect(result.isActive).toBe(true);
      expect(result.createdAt).toBe('2026-01-12T10:00:00Z');
    });

    it('should return empty model when none found', async () => {
      authzClient.listModels.mockResolvedValue({ models: [], nextPageToken: undefined });

      const result = await service.getModel();

      expect(result.id).toBe('');
      expect(result.version).toBe(0);
      expect(result.isActive).toBe(false);
    });

    it('should handle errors', async () => {
      authzClient.listModels.mockRejectedValue(new Error('gRPC error'));

      const result = await service.getModel();

      expect(result.id).toBe('');
    });
  });

  describe('getModelVersions', () => {
    it('should return all model versions from gRPC', async () => {
      const mockResponse = {
        models: [
          {
            modelId: 'model-1',
            versionId: '1234567890',
            isActive: true,
            createdAt: '2026-01-12T10:00:00Z',
          },
          {
            modelId: 'model-2',
            versionId: '1234567880',
            isActive: false,
            createdAt: '2026-01-11T10:00:00Z',
          },
        ],
        nextPageToken: undefined,
      };

      authzClient.listModels.mockResolvedValue(mockResponse);

      const result = await service.getModelVersions();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('model-1');
      expect(result[0].isActive).toBe(true);
      expect(result[1].id).toBe('model-2');
      expect(result[1].isActive).toBe(false);
    });

    it('should handle errors', async () => {
      authzClient.listModels.mockRejectedValue(new Error('gRPC error'));

      const result = await service.getModelVersions();

      expect(result).toEqual([]);
    });
  });

  describe('createModel', () => {
    it('should throw not supported error', async () => {
      await expect(service.createModel('model new {}')).rejects.toThrow(
        'Model creation not supported via auth-bff',
      );
    });
  });

  describe('validateModel', () => {
    it('should validate non-empty model as valid', async () => {
      const result = await service.validateModel('model test {}');

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject empty model', async () => {
      const result = await service.validateModel('');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Model content cannot be empty');
    });
  });

  describe('activateModel', () => {
    it('should throw not supported error', async () => {
      await expect(service.activateModel('model-123')).rejects.toThrow(
        'Model activation not supported via auth-bff',
      );
    });
  });

  describe('grant', () => {
    it('should grant permission', async () => {
      authzClient.grant.mockResolvedValue('token-123');

      const result = await service.grant('user:123', 'viewer', 'session:456');

      expect(result.success).toBe(true);
      expect(authzClient.grant).toHaveBeenCalledWith('user:123', 'viewer', 'session:456');
    });

    it('should throw error on failure', async () => {
      authzClient.grant.mockRejectedValue(new Error('Grant failed'));

      await expect(service.grant('user:123', 'viewer', 'session:456')).rejects.toThrow(
        'Grant failed',
      );
    });
  });

  describe('revoke', () => {
    it('should revoke permission', async () => {
      authzClient.revoke.mockResolvedValue('token-123');

      const result = await service.revoke('user:123', 'viewer', 'session:456');

      expect(result.success).toBe(true);
      expect(authzClient.revoke).toHaveBeenCalledWith('user:123', 'viewer', 'session:456');
    });

    it('should throw error on failure', async () => {
      authzClient.revoke.mockRejectedValue(new Error('Revoke failed'));

      await expect(service.revoke('user:123', 'viewer', 'session:456')).rejects.toThrow(
        'Revoke failed',
      );
    });
  });

  describe('listObjects', () => {
    it('should list objects user can access', async () => {
      authzClient.listObjects.mockResolvedValue(['session:1', 'session:2', 'session:3']);

      const result = await service.listObjects('user:123', 'viewer', 'session_recording');

      expect(result.objects).toEqual(['session:1', 'session:2', 'session:3']);
      expect(result.user).toBe('user:123');
      expect(result.relation).toBe('viewer');
      expect(result.objectType).toBe('session_recording');
    });

    it('should handle errors', async () => {
      authzClient.listObjects.mockRejectedValue(new Error('Error'));

      const result = await service.listObjects('user:123', 'viewer', 'session_recording');

      expect(result.objects).toEqual([]);
    });
  });

  describe('listUsers', () => {
    it('should list users with access to object', async () => {
      authzClient.listUsers.mockResolvedValue(['user:1', 'user:2', 'user:3']);

      const result = await service.listUsers('session:456', 'viewer');

      expect(result.users).toEqual(['user:1', 'user:2', 'user:3']);
      expect(result.object).toBe('session:456');
      expect(result.relation).toBe('viewer');
    });

    it('should handle errors', async () => {
      authzClient.listUsers.mockRejectedValue(new Error('Error'));

      const result = await service.listUsers('session:456', 'viewer');

      expect(result.users).toEqual([]);
    });
  });
});

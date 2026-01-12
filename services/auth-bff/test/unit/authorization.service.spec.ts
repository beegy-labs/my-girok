import { Test, TestingModule } from '@nestjs/testing';
import { vi, describe, it, expect, beforeEach, type MockInstance } from 'vitest';
import { AuthorizationService } from '../../src/admin/authorization/authorization.service';
import { AuthorizationGrpcClient } from '../../src/grpc-clients/authorization.client';
import { PrismaAuthzService } from '../../src/common/services/prisma-authz.service';

describe('AuthorizationService', () => {
  let service: AuthorizationService;
  let authzClient: {
    check: MockInstance;
    batchCheck: MockInstance;
    grant: MockInstance;
    revoke: MockInstance;
    listObjects: MockInstance;
    listUsers: MockInstance;
  };
  let prismaService: {
    authorizationModel: {
      findFirst: MockInstance;
      findMany: MockInstance;
      findUnique: MockInstance;
      create: MockInstance;
      update: MockInstance;
      updateMany: MockInstance;
    };
    $transaction: MockInstance;
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
          },
        },
        {
          provide: PrismaAuthzService,
          useValue: {
            authorizationModel: {
              findFirst: vi.fn(),
              findMany: vi.fn(),
              findUnique: vi.fn(),
              create: vi.fn(),
              update: vi.fn(),
              updateMany: vi.fn(),
            },
            $transaction: vi.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthorizationService>(AuthorizationService);
    authzClient = module.get(AuthorizationGrpcClient);
    prismaService = module.get(PrismaAuthzService);
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
    it('should return active authorization model', async () => {
      const mockModel = {
        id: 'model-123',
        versionId: '1234567890',
        schemaVersion: '1.0',
        dslSource: 'model session_recording {}',
        compiledModel: {},
        typeDefinitions: {},
        isActive: true,
        createdAt: new Date('2026-01-12'),
      };

      prismaService.authorizationModel.findFirst.mockResolvedValue(mockModel);

      const result = await service.getModel();

      expect(result.id).toBe('model-123');
      expect(result.content).toBe('model session_recording {}');
      expect(result.isActive).toBe(true);
    });

    it('should return empty model when none found', async () => {
      prismaService.authorizationModel.findFirst.mockResolvedValue(null);

      const result = await service.getModel();

      expect(result.id).toBe('');
      expect(result.version).toBe(0);
      expect(result.isActive).toBe(false);
    });

    it('should handle errors', async () => {
      prismaService.authorizationModel.findFirst.mockRejectedValue(new Error('DB error'));

      const result = await service.getModel();

      expect(result.id).toBe('');
    });
  });

  describe('getModelVersions', () => {
    it('should return all model versions', async () => {
      const mockModels = [
        {
          id: 'model-1',
          versionId: '1234567890',
          schemaVersion: '1.0',
          dslSource: 'model v2 {}',
          compiledModel: {},
          typeDefinitions: {},
          isActive: true,
          createdAt: new Date('2026-01-12'),
        },
        {
          id: 'model-2',
          versionId: '1234567880',
          schemaVersion: '1.0',
          dslSource: 'model v1 {}',
          compiledModel: {},
          typeDefinitions: {},
          isActive: false,
          createdAt: new Date('2026-01-11'),
        },
      ];

      prismaService.authorizationModel.findMany.mockResolvedValue(mockModels);

      const result = await service.getModelVersions();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('model-1');
      expect(result[0].isActive).toBe(true);
      expect(result[1].id).toBe('model-2');
      expect(result[1].isActive).toBe(false);
    });

    it('should handle errors', async () => {
      prismaService.authorizationModel.findMany.mockRejectedValue(new Error('Error'));

      const result = await service.getModelVersions();

      expect(result).toEqual([]);
    });
  });

  describe('createModel', () => {
    it('should create a new model', async () => {
      const mockModel = {
        id: 'model-new',
        versionId: '1234567890',
        schemaVersion: '1.0',
        dslSource: 'model new {}',
        compiledModel: {},
        typeDefinitions: {},
        isActive: false,
        createdAt: new Date('2026-01-12'),
      };

      prismaService.authorizationModel.create.mockResolvedValue(mockModel);

      const result = await service.createModel('model new {}');

      expect(result.id).toBe('model-new');
      expect(result.content).toBe('model new {}');
      expect(result.isActive).toBe(false);
    });

    it('should throw error on failure', async () => {
      prismaService.authorizationModel.create.mockRejectedValue(new Error('Create failed'));

      await expect(service.createModel('model new {}')).rejects.toThrow('Create failed');
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
    it('should activate a model', async () => {
      const mockModel = {
        id: 'model-123',
        versionId: '1234567890',
        schemaVersion: '1.0',
        dslSource: 'model active {}',
        compiledModel: {},
        typeDefinitions: {},
        isActive: true,
        createdAt: new Date('2026-01-12'),
      };

      prismaService.$transaction.mockImplementation(async (callback) => {
        return callback(prismaService);
      });

      prismaService.authorizationModel.updateMany.mockResolvedValue({ count: 1 });
      prismaService.authorizationModel.update.mockResolvedValue(mockModel);
      prismaService.authorizationModel.findUnique.mockResolvedValue(mockModel);

      const result = await service.activateModel('model-123');

      expect(result.id).toBe('model-123');
      expect(result.isActive).toBe(true);
    });

    it('should throw error when model not found after activation', async () => {
      prismaService.$transaction.mockImplementation(async (callback) => {
        return callback(prismaService);
      });

      prismaService.authorizationModel.updateMany.mockResolvedValue({ count: 1 });
      prismaService.authorizationModel.update.mockResolvedValue({} as any);
      prismaService.authorizationModel.findUnique.mockResolvedValue(null);

      await expect(service.activateModel('model-123')).rejects.toThrow(
        'Model not found after activation',
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

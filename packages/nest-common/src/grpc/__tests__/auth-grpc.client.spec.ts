import { Test } from '@nestjs/testing';
import { of, throwError } from 'rxjs';
import { AuthGrpcClient } from '../auth-grpc.client';
import { GRPC_SERVICES } from '../grpc.options';
import { OperatorStatus, RoleScope, SubjectType, SanctionSeverity } from '../grpc.types';

describe('AuthGrpcClient', () => {
  let client: AuthGrpcClient;
  let mockAuthService: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockAuthService = {
      checkPermission: jest.fn(),
      checkPermissions: jest.fn(),
      getOperatorPermissions: jest.fn(),
      getRole: jest.fn(),
      getRolesByOperator: jest.fn(),
      getOperator: jest.fn(),
      validateOperator: jest.fn(),
      checkSanction: jest.fn(),
      getActiveSanctions: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthGrpcClient,
        {
          provide: GRPC_SERVICES.AUTH,
          useValue: { getService: jest.fn().mockReturnValue(mockAuthService) },
        },
      ],
    }).compile();

    client = moduleRef.get<AuthGrpcClient>(AuthGrpcClient);
    client.onModuleInit();
  });

  describe('checkPermission', () => {
    it('should check single permission', async () => {
      mockAuthService.checkPermission.mockReturnValue(
        of({ allowed: true, reason: 'Granted', matched_permissions: ['perm-1'] }),
      );

      const result = await client.checkPermission({
        operator_id: 'op-123',
        resource: 'users',
        action: 'read',
      });

      expect(result.allowed).toBe(true);
    });
  });

  describe('getOperator', () => {
    it('should return operator details', async () => {
      mockAuthService.getOperator.mockReturnValue(
        of({
          operator: {
            id: 'op-123',
            email: 'admin@example.com',
            status: OperatorStatus.OPERATOR_STATUS_ACTIVE,
          },
        }),
      );

      const result = await client.getOperator({ id: 'op-123' });
      expect(result.operator?.email).toBe('admin@example.com');
    });
  });

  describe('checkSanction', () => {
    it('should check if subject is sanctioned', async () => {
      mockAuthService.checkSanction.mockReturnValue(
        of({ is_sanctioned: false, active_sanctions: [], highest_severity: 0 }),
      );

      const result = await client.checkSanction({
        subject_id: 'user-123',
        subject_type: SubjectType.SUBJECT_TYPE_USER,
      });

      expect(result.is_sanctioned).toBe(false);
    });
  });

  describe('convenience methods', () => {
    it('isUserSanctioned should check user sanction', async () => {
      mockAuthService.checkSanction.mockReturnValue(of({ is_sanctioned: true }));
      const result = await client.isUserSanctioned('user-123');
      expect(result).toBe(true);
    });

    it('hasPermission should check operator permission', async () => {
      mockAuthService.checkPermission.mockReturnValue(of({ allowed: true }));
      const result = await client.hasPermission('op-123', 'users', 'read');
      expect(result).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle service errors', async () => {
      mockAuthService.checkPermission.mockReturnValue(throwError(() => new Error('Service error')));

      await expect(
        client.checkPermission({ operator_id: 'op-123', resource: 'users', action: 'read' }),
      ).rejects.toMatchObject({ message: 'Service error' });
    });
  });
});

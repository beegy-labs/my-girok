import { Test, TestingModule } from '@nestjs/testing';
import { of, throwError } from 'rxjs';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { IdentityGrpcClient } from '../identity-grpc.client';
import { isGrpcError } from '../grpc-error.util';
import { GRPC_SERVICES } from '../grpc.options';
import { AuthProvider, AccountMode, AccountStatus } from '../grpc.types';

describe('IdentityGrpcClient', () => {
  let client: IdentityGrpcClient;
  let mockIdentityService: {
    getAccount: jest.Mock;
    validateAccount: jest.Mock;
    getAccountByEmail: jest.Mock;
    getAccountByUsername: jest.Mock;
    createAccount: jest.Mock;
    updateAccount: jest.Mock;
    deleteAccount: jest.Mock;
    validatePassword: jest.Mock;
    createSession: jest.Mock;
    validateSession: jest.Mock;
    revokeSession: jest.Mock;
    revokeAllSessions: jest.Mock;
    getAccountDevices: jest.Mock;
    trustDevice: jest.Mock;
    revokeDevice: jest.Mock;
    getProfile: jest.Mock;
  };

  const mockAccount = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    username: 'testuser',
    status: AccountStatus.ACCOUNT_STATUS_ACTIVE,
    mode: AccountMode.ACCOUNT_MODE_USER,
    mfa_enabled: false,
    email_verified: true,
    created_at: { seconds: 1704067200, nanos: 0 },
    updated_at: { seconds: 1704067200, nanos: 0 },
  };

  const mockSession = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    account_id: '123e4567-e89b-12d3-a456-426614174000',
    device_id: '',
    ip_address: '192.168.1.1',
    user_agent: 'Mozilla/5.0',
    created_at: { seconds: 1704067200, nanos: 0 },
    expires_at: { seconds: 1735689600, nanos: 0 },
    last_activity_at: { seconds: 1704067200, nanos: 0 },
  };

  beforeEach(async () => {
    mockIdentityService = {
      getAccount: jest.fn(),
      validateAccount: jest.fn(),
      getAccountByEmail: jest.fn(),
      getAccountByUsername: jest.fn(),
      createAccount: jest.fn(),
      updateAccount: jest.fn(),
      deleteAccount: jest.fn(),
      validatePassword: jest.fn(),
      createSession: jest.fn(),
      validateSession: jest.fn(),
      revokeSession: jest.fn(),
      revokeAllSessions: jest.fn(),
      getAccountDevices: jest.fn(),
      trustDevice: jest.fn(),
      revokeDevice: jest.fn(),
      getProfile: jest.fn(),
    };

    const mockGrpcClient = {
      getService: jest.fn().mockReturnValue(mockIdentityService),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdentityGrpcClient,
        { provide: GRPC_SERVICES.IDENTITY, useValue: mockGrpcClient },
      ],
    }).compile();

    client = module.get<IdentityGrpcClient>(IdentityGrpcClient);
    client.onModuleInit();
  });

  describe('createAccount', () => {
    it('should create account successfully', async () => {
      mockIdentityService.createAccount.mockReturnValue(of({ account: mockAccount }));

      const result = await client.createAccount({
        email: 'test@example.com',
        username: 'testuser',
        password: 'Password123!',
        provider: AuthProvider.AUTH_PROVIDER_LOCAL,
        mode: AccountMode.ACCOUNT_MODE_USER,
      });

      expect(result.account).toBeDefined();
      expect(result.account?.email).toBe('test@example.com');
    });

    it('should handle ALREADY_EXISTS error', async () => {
      mockIdentityService.createAccount.mockReturnValue(
        throwError(() => ({
          code: GrpcStatus.ALREADY_EXISTS,
          message: 'Email already registered',
        })),
      );

      try {
        await client.createAccount({
          email: 'existing@example.com',
          username: 'newuser',
          password: 'Password123!',
          provider: AuthProvider.AUTH_PROVIDER_LOCAL,
          mode: AccountMode.ACCOUNT_MODE_USER,
        });
        fail('Expected error to be thrown');
      } catch (error) {
        expect(isGrpcError(error)).toBe(true);
        if (isGrpcError(error)) {
          expect(error.code).toBe(GrpcStatus.ALREADY_EXISTS);
        }
      }
    });
  });

  describe('updateAccount', () => {
    it('should update account successfully', async () => {
      const updatedAccount = { ...mockAccount, locale: 'ko-KR' };
      mockIdentityService.updateAccount.mockReturnValue(of({ account: updatedAccount }));

      const result = await client.updateAccount({
        id: mockAccount.id,
        locale: 'ko-KR',
      });

      expect(result.account).toBeDefined();
    });

    it('should handle NOT_FOUND error', async () => {
      mockIdentityService.updateAccount.mockReturnValue(
        throwError(() => ({
          code: GrpcStatus.NOT_FOUND,
          message: 'Account not found',
        })),
      );

      try {
        await client.updateAccount({
          id: 'nonexistent-id',
          locale: 'ko-KR',
        });
        fail('Expected error to be thrown');
      } catch (error) {
        expect(isGrpcError(error)).toBe(true);
        if (isGrpcError(error)) {
          expect(error.code).toBe(GrpcStatus.NOT_FOUND);
        }
      }
    });
  });

  describe('deleteAccount', () => {
    it('should delete account successfully', async () => {
      mockIdentityService.deleteAccount.mockReturnValue(
        of({ success: true, message: 'Account deleted successfully' }),
      );

      const result = await client.deleteAccount({ id: mockAccount.id });

      expect(result.success).toBe(true);
    });
  });

  describe('validatePassword', () => {
    it('should return valid=true for correct password', async () => {
      mockIdentityService.validatePassword.mockReturnValue(
        of({ valid: true, message: 'Password is valid' }),
      );

      const result = await client.validatePassword({
        account_id: mockAccount.id,
        password: 'CorrectPassword123!',
      });

      expect(result.valid).toBe(true);
    });

    it('should return valid=false for incorrect password', async () => {
      mockIdentityService.validatePassword.mockReturnValue(
        of({ valid: false, message: 'Invalid password' }),
      );

      const result = await client.validatePassword({
        account_id: mockAccount.id,
        password: 'WrongPassword',
      });

      expect(result.valid).toBe(false);
    });
  });

  describe('createSession', () => {
    it('should create session successfully', async () => {
      mockIdentityService.createSession.mockReturnValue(
        of({
          session: mockSession,
          access_token: 'access_token_123',
          refresh_token: 'refresh_token_123',
        }),
      );

      const result = await client.createSession({
        account_id: mockAccount.id,
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
      });

      expect(result.session).toBeDefined();
      expect(result.access_token).toBe('access_token_123');
      expect(result.refresh_token).toBe('refresh_token_123');
    });
  });

  describe('getAccount', () => {
    it('should return account when found', async () => {
      mockIdentityService.getAccount.mockReturnValue(of({ account: mockAccount }));

      const result = await client.getAccount({ id: mockAccount.id });

      expect(result.account).toBeDefined();
      expect(result.account?.email).toBe('test@example.com');
    });
  });

  describe('validateAccount', () => {
    it('should return valid=true for accessible account', async () => {
      mockIdentityService.validateAccount.mockReturnValue(
        of({
          valid: true,
          status: AccountStatus.ACCOUNT_STATUS_ACTIVE,
          message: 'Account is valid',
        }),
      );

      const result = await client.validateAccount({ id: mockAccount.id });

      expect(result.valid).toBe(true);
    });
  });

  describe('timeout handling', () => {
    it('should allow setting custom timeout', () => {
      const result = client.setTimeout(10000);
      expect(result).toBe(client);
    });
  });

  describe('isGrpcError', () => {
    it('should return true for valid gRPC error', () => {
      const error = { code: GrpcStatus.NOT_FOUND, message: 'Not found' };
      expect(isGrpcError(error)).toBe(true);
    });

    it('should return false for non-gRPC error', () => {
      const error = new Error('Regular error');
      expect(isGrpcError(error)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isGrpcError(null)).toBe(false);
    });
  });
});

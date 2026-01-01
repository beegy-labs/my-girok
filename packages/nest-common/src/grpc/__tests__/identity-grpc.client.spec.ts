import { Test } from '@nestjs/testing';
import { of, throwError, TimeoutError } from 'rxjs';
import { IdentityGrpcClient, GrpcError, isGrpcError } from '../identity-grpc.client';
import { GRPC_SERVICES } from '../grpc.options';
import {
  AccountStatus,
  AccountMode,
  GetAccountResponse,
  ValidateAccountResponse,
  ValidateSessionResponse,
  RevokeSessionResponse,
  GetAccountDevicesResponse,
  GetProfileResponse,
} from '../grpc.types';

describe('IdentityGrpcClient', () => {
  let client: IdentityGrpcClient;
  let mockIdentityService: Record<string, jest.Mock>;
  let mockClientGrpc: { getService: jest.Mock };

  beforeEach(async () => {
    // Create mock service with all methods
    mockIdentityService = {
      getAccount: jest.fn(),
      validateAccount: jest.fn(),
      getAccountByEmail: jest.fn(),
      getAccountByUsername: jest.fn(),
      validateSession: jest.fn(),
      revokeSession: jest.fn(),
      revokeAllSessions: jest.fn(),
      getAccountDevices: jest.fn(),
      trustDevice: jest.fn(),
      revokeDevice: jest.fn(),
      getProfile: jest.fn(),
    };

    mockClientGrpc = {
      getService: jest.fn().mockReturnValue(mockIdentityService),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        IdentityGrpcClient,
        {
          provide: GRPC_SERVICES.IDENTITY,
          useValue: mockClientGrpc,
        },
      ],
    }).compile();

    client = moduleRef.get<IdentityGrpcClient>(IdentityGrpcClient);
    client.onModuleInit();
  });

  describe('isGrpcError', () => {
    it('should return true for GrpcError objects', () => {
      const error: GrpcError = { code: 2, message: 'Unknown error' };
      expect(isGrpcError(error)).toBe(true);
    });

    it('should return false for regular errors', () => {
      expect(isGrpcError(new Error('test'))).toBe(false);
      expect(isGrpcError(null)).toBe(false);
      expect(isGrpcError(undefined)).toBe(false);
      expect(isGrpcError('string')).toBe(false);
    });
  });

  describe('getAccount', () => {
    it('should call identityService.getAccount with correct request', async () => {
      const mockResponse: GetAccountResponse = {
        account: {
          id: 'test-id',
          email: 'test@example.com',
          username: 'testuser',
          status: AccountStatus.ACCOUNT_STATUS_ACTIVE,
          mode: AccountMode.ACCOUNT_MODE_USER,
          mfa_enabled: false,
          email_verified: true,
        },
      };

      mockIdentityService.getAccount.mockReturnValue(of(mockResponse));

      const result = await client.getAccount({ id: 'test-id' });

      expect(mockIdentityService.getAccount).toHaveBeenCalledWith({ id: 'test-id' });
      expect(result).toEqual(mockResponse);
    });

    it('should handle errors properly', async () => {
      mockIdentityService.getAccount.mockReturnValue(
        throwError(() => new Error('Service unavailable')),
      );

      await expect(client.getAccount({ id: 'test-id' })).rejects.toMatchObject({
        code: expect.any(Number),
        message: expect.any(String),
      });
    });
  });

  describe('validateAccount', () => {
    it('should return validation result', async () => {
      const mockResponse: ValidateAccountResponse = {
        valid: true,
        status: AccountStatus.ACCOUNT_STATUS_ACTIVE,
        message: 'Account is valid',
      };

      mockIdentityService.validateAccount.mockReturnValue(of(mockResponse));

      const result = await client.validateAccount({ id: 'test-id' });

      expect(result.valid).toBe(true);
      expect(result.status).toBe(AccountStatus.ACCOUNT_STATUS_ACTIVE);
    });
  });

  describe('validateSession', () => {
    it('should validate session by token hash', async () => {
      const mockResponse: ValidateSessionResponse = {
        valid: true,
        account_id: 'account-123',
        session_id: 'session-456',
        expires_at: { seconds: Math.floor(Date.now() / 1000) + 3600, nanos: 0 },
        message: 'Session is valid',
      };

      mockIdentityService.validateSession.mockReturnValue(of(mockResponse));

      const result = await client.validateSession({ token_hash: 'hashed-token' });

      expect(mockIdentityService.validateSession).toHaveBeenCalledWith({
        token_hash: 'hashed-token',
      });
      expect(result.valid).toBe(true);
      expect(result.account_id).toBe('account-123');
    });
  });

  describe('revokeSession', () => {
    it('should revoke session successfully', async () => {
      const mockResponse: RevokeSessionResponse = {
        success: true,
        message: 'Session revoked successfully',
      };

      mockIdentityService.revokeSession.mockReturnValue(of(mockResponse));

      const result = await client.revokeSession({
        session_id: 'session-123',
        reason: 'User logout',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('getAccountDevices', () => {
    it('should return list of devices', async () => {
      const mockResponse: GetAccountDevicesResponse = {
        devices: [
          {
            id: 'device-1',
            account_id: 'account-123',
            fingerprint: 'fp-123',
            device_type: 'desktop',
            device_name: 'Chrome on Windows',
            os_name: 'Windows',
            os_version: '10',
            browser_name: 'Chrome',
            browser_version: '120.0',
            is_trusted: true,
          },
        ],
      };

      mockIdentityService.getAccountDevices.mockReturnValue(of(mockResponse));

      const result = await client.getAccountDevices({ account_id: 'account-123' });

      expect(result.devices).toHaveLength(1);
      expect(result.devices[0].id).toBe('device-1');
    });
  });

  describe('getProfile', () => {
    it('should return profile data', async () => {
      const mockResponse: GetProfileResponse = {
        profile: {
          id: 'profile-1',
          account_id: 'account-123',
          display_name: 'Test User',
          country_code: 'US',
          language_code: 'en',
          timezone: 'America/New_York',
        },
      };

      mockIdentityService.getProfile.mockReturnValue(of(mockResponse));

      const result = await client.getProfile({ account_id: 'account-123' });

      expect(result.profile?.display_name).toBe('Test User');
    });
  });

  describe('setTimeout', () => {
    it('should allow setting custom timeout', () => {
      const result = client.setTimeout(10000);
      expect(result).toBe(client); // Returns this for chaining
    });
  });

  describe('error handling', () => {
    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Timeout');
      timeoutError.name = 'TimeoutError';
      mockIdentityService.getAccount.mockReturnValue(throwError(() => timeoutError));

      await expect(client.getAccount({ id: 'test-id' })).rejects.toMatchObject({
        code: 4, // DEADLINE_EXCEEDED
        message: 'Request timeout',
      });
    });

    it('should handle unavailable service errors', async () => {
      mockIdentityService.getAccount.mockReturnValue(
        throwError(() => new Error('UNAVAILABLE: Connection refused')),
      );

      await expect(client.getAccount({ id: 'test-id' })).rejects.toMatchObject({
        code: 14, // UNAVAILABLE
        message: 'Service unavailable',
      });
    });

    it('should handle connection refused errors', async () => {
      mockIdentityService.getAccount.mockReturnValue(
        throwError(() => new Error('ECONNREFUSED: localhost:50051')),
      );

      await expect(client.getAccount({ id: 'test-id' })).rejects.toMatchObject({
        code: 14, // UNAVAILABLE
        message: 'Service unavailable',
      });
    });

    it('should normalize unknown errors', async () => {
      mockIdentityService.getAccount.mockReturnValue(
        throwError(() => new Error('Some random error')),
      );

      await expect(client.getAccount({ id: 'test-id' })).rejects.toMatchObject({
        code: 2, // UNKNOWN
        message: 'Some random error',
      });
    });

    it('should pass through gRPC errors as-is', async () => {
      const grpcError: GrpcError = {
        code: 5, // NOT_FOUND
        message: 'Account not found',
      };

      mockIdentityService.getAccount.mockReturnValue(throwError(() => grpcError));

      await expect(client.getAccount({ id: 'test-id' })).rejects.toMatchObject(grpcError);
    });
  });
});

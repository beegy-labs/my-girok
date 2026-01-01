import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { IdentityGrpcController } from './identity.grpc.controller';
import { AccountsService } from '../identity/accounts/accounts.service';
import { SessionsService } from '../identity/sessions/sessions.service';
import { DevicesService } from '../identity/devices/devices.service';
import { ProfilesService } from '../identity/profiles/profiles.service';
import { CryptoService } from '../common/crypto';

describe('IdentityGrpcController', () => {
  let controller: IdentityGrpcController;
  let accountsService: jest.Mocked<AccountsService>;
  let sessionsService: jest.Mocked<SessionsService>;

  const mockAccount = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    username: 'testuser',
    status: 'ACTIVE',
    mode: 'UNIFIED',
    mfaEnabled: false,
    emailVerified: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    isAccessible: () => true,
    locale: 'en-US',
    timezone: 'UTC',
    lockedUntil: null,
  };

  const mockSession = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    accountId: '123e4567-e89b-12d3-a456-426614174000',
    deviceId: null,
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    isActive: true,
    expiresAt: new Date('2025-01-01'),
    lastActivityAt: new Date('2024-01-01'),
    createdAt: new Date('2024-01-01'),
    revokedAt: null,
    revokedReason: null,
    accessToken: 'access_token_123',
    refreshToken: 'refresh_token_123',
  };

  beforeEach(async () => {
    const mockAccountsService = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      validatePassword: jest.fn(),
      recordFailedLogin: jest.fn(),
      resetFailedLogins: jest.fn(),
    };

    const mockSessionsService = {
      findByTokenHash: jest.fn(),
      revoke: jest.fn(),
      revokeAllForAccount: jest.fn(),
      create: jest.fn(),
    };

    const mockDevicesService = {
      findAll: jest.fn(),
      findById: jest.fn(),
      trust: jest.fn(),
      remove: jest.fn(),
    };

    const mockProfilesService = {
      findByAccountId: jest.fn(),
    };

    const mockCryptoService = {
      hash: jest.fn().mockImplementation((val) => `hashed_${val}`),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [IdentityGrpcController],
      providers: [
        { provide: AccountsService, useValue: mockAccountsService },
        { provide: SessionsService, useValue: mockSessionsService },
        { provide: DevicesService, useValue: mockDevicesService },
        { provide: ProfilesService, useValue: mockProfilesService },
        { provide: CryptoService, useValue: mockCryptoService },
      ],
    }).compile();

    controller = module.get<IdentityGrpcController>(IdentityGrpcController);
    accountsService = module.get(AccountsService);
    sessionsService = module.get(SessionsService);
  });

  describe('createAccount', () => {
    it('should create account successfully', async () => {
      accountsService.create.mockResolvedValue(mockAccount as never);

      const result = await controller.createAccount({
        email: 'test@example.com',
        username: 'testuser',
        password: 'Password123!',
        provider: 1, // LOCAL
        mode: 1, // USER -> UNIFIED
      });

      expect(result.account).toBeDefined();
      expect(result.account.email).toBe('test@example.com');
      expect(accountsService.create).toHaveBeenCalled();
    });

    it('should throw ALREADY_EXISTS on email conflict', async () => {
      accountsService.create.mockRejectedValue(new ConflictException('Email already registered'));

      try {
        await controller.createAccount({
          email: 'existing@example.com',
          username: 'newuser',
          password: 'Password123!',
          provider: 1,
          mode: 1,
        });
        fail('Expected RpcException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(RpcException);
        expect((error as RpcException).getError()).toEqual({
          code: GrpcStatus.ALREADY_EXISTS,
          message: 'Email already registered',
        });
      }
    });
  });

  describe('updateAccount', () => {
    it('should update account successfully', async () => {
      accountsService.update.mockResolvedValue({
        ...mockAccount,
        locale: 'ko-KR',
      } as never);

      const result = await controller.updateAccount({
        id: mockAccount.id,
        locale: 'ko-KR',
      });

      expect(result.account).toBeDefined();
      expect(accountsService.update).toHaveBeenCalledWith(
        mockAccount.id,
        expect.objectContaining({ locale: 'ko-KR' }),
      );
    });

    it('should throw NOT_FOUND when account does not exist', async () => {
      accountsService.update.mockRejectedValue(new NotFoundException('Account not found'));

      try {
        await controller.updateAccount({
          id: 'nonexistent-id',
          locale: 'ko-KR',
        });
        fail('Expected RpcException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(RpcException);
        expect((error as RpcException).getError()).toEqual({
          code: GrpcStatus.NOT_FOUND,
          message: 'Account not found',
        });
      }
    });
  });

  describe('deleteAccount', () => {
    it('should delete account successfully', async () => {
      accountsService.delete.mockResolvedValue(undefined);

      const result = await controller.deleteAccount({ id: mockAccount.id });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Account deleted successfully');
      expect(accountsService.delete).toHaveBeenCalledWith(mockAccount.id);
    });

    it('should throw NOT_FOUND when account does not exist', async () => {
      accountsService.delete.mockRejectedValue(new NotFoundException('Account not found'));

      try {
        await controller.deleteAccount({ id: 'nonexistent-id' });
        fail('Expected RpcException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(RpcException);
        expect((error as RpcException).getError()).toEqual({
          code: GrpcStatus.NOT_FOUND,
          message: 'Account not found',
        });
      }
    });
  });

  describe('validatePassword', () => {
    it('should return valid=true for correct password', async () => {
      accountsService.validatePassword.mockResolvedValue(true);
      accountsService.resetFailedLogins.mockResolvedValue(undefined);

      const result = await controller.validatePassword({
        account_id: mockAccount.id,
        password: 'CorrectPassword123!',
      });

      expect(result.valid).toBe(true);
      expect(result.message).toBe('Password is valid');
      expect(accountsService.resetFailedLogins).toHaveBeenCalledWith(mockAccount.id);
    });

    it('should return valid=false for incorrect password', async () => {
      accountsService.validatePassword.mockResolvedValue(false);
      accountsService.recordFailedLogin.mockResolvedValue(undefined);

      const result = await controller.validatePassword({
        account_id: mockAccount.id,
        password: 'WrongPassword123!',
      });

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Invalid password');
      expect(accountsService.recordFailedLogin).toHaveBeenCalledWith(mockAccount.id);
    });

    it('should return valid=false on any error', async () => {
      accountsService.validatePassword.mockRejectedValue(new Error('Database error'));

      const result = await controller.validatePassword({
        account_id: mockAccount.id,
        password: 'SomePassword123!',
      });

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Invalid password');
    });
  });

  describe('createSession', () => {
    it('should create session successfully', async () => {
      sessionsService.create.mockResolvedValue(mockSession as never);

      const result = await controller.createSession({
        account_id: mockAccount.id,
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
      });

      expect(result.session).toBeDefined();
      expect(result.session.account_id).toBe(mockAccount.id);
      expect(result.access_token).toBe('access_token_123');
      expect(result.refresh_token).toBe('refresh_token_123');
    });

    it('should use default values for optional fields', async () => {
      sessionsService.create.mockResolvedValue(mockSession as never);

      await controller.createSession({
        account_id: mockAccount.id,
      });

      expect(sessionsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: '0.0.0.0',
          userAgent: 'gRPC-Internal',
        }),
      );
    });

    it('should throw NOT_FOUND when account does not exist', async () => {
      sessionsService.create.mockRejectedValue(new NotFoundException('Account not found'));

      try {
        await controller.createSession({
          account_id: 'nonexistent-id',
        });
        fail('Expected RpcException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(RpcException);
        expect((error as RpcException).getError()).toEqual({
          code: GrpcStatus.NOT_FOUND,
          message: 'Account not found',
        });
      }
    });
  });

  describe('getAccount', () => {
    it('should return account when found', async () => {
      accountsService.findById.mockResolvedValue(mockAccount as never);

      const result = await controller.getAccount({ id: mockAccount.id });

      expect(result.account).toBeDefined();
      expect(result.account.email).toBe('test@example.com');
    });

    it('should throw NOT_FOUND when account does not exist', async () => {
      accountsService.findById.mockRejectedValue(new NotFoundException('Account not found'));

      try {
        await controller.getAccount({ id: 'nonexistent-id' });
        fail('Expected RpcException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(RpcException);
        expect((error as RpcException).getError()).toEqual({
          code: GrpcStatus.NOT_FOUND,
          message: 'Account not found',
        });
      }
    });
  });

  describe('getAccountByEmail', () => {
    it('should return account when found by email', async () => {
      accountsService.findByEmail.mockResolvedValue(mockAccount as never);

      const result = await controller.getAccountByEmail({ email: 'test@example.com' });

      expect(result.account).toBeDefined();
      expect(result.account.email).toBe('test@example.com');
    });

    it('should throw NOT_FOUND when email not found', async () => {
      accountsService.findByEmail.mockResolvedValue(null);

      try {
        await controller.getAccountByEmail({ email: 'nonexistent@example.com' });
        fail('Expected RpcException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(RpcException);
        expect((error as RpcException).getError()).toEqual({
          code: GrpcStatus.NOT_FOUND,
          message: 'Account not found',
        });
      }
    });
  });

  describe('getAccountByUsername', () => {
    it('should return account when found by username', async () => {
      accountsService.findByUsername.mockResolvedValue(mockAccount as never);

      const result = await controller.getAccountByUsername({ username: 'testuser' });

      expect(result.account).toBeDefined();
      expect(result.account.username).toBe('testuser');
    });

    it('should throw NOT_FOUND when username not found', async () => {
      accountsService.findByUsername.mockResolvedValue(null);

      try {
        await controller.getAccountByUsername({ username: 'nonexistent' });
        fail('Expected RpcException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(RpcException);
        expect((error as RpcException).getError()).toEqual({
          code: GrpcStatus.NOT_FOUND,
          message: 'Account not found',
        });
      }
    });
  });

  describe('validateAccount', () => {
    it('should return valid=true for accessible account', async () => {
      accountsService.findById.mockResolvedValue(mockAccount as never);

      const result = await controller.validateAccount({ id: mockAccount.id });

      expect(result.valid).toBe(true);
      expect(result.message).toBe('Account is valid');
    });

    it('should return valid=false when account not found', async () => {
      accountsService.findById.mockRejectedValue(new NotFoundException());

      const result = await controller.validateAccount({ id: 'nonexistent-id' });

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Account not found');
    });

    it('should return valid=false for suspended account', async () => {
      const suspendedAccount = {
        ...mockAccount,
        status: 'SUSPENDED',
        isAccessible: () => false,
      };
      accountsService.findById.mockResolvedValue(suspendedAccount as never);

      const result = await controller.validateAccount({ id: mockAccount.id });

      expect(result.valid).toBe(false);
      expect(result.message).toContain('SUSPENDED');
    });
  });
});

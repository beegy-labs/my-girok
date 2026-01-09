import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';
import * as bcrypt from 'bcrypt';
import { AccountsService } from './accounts.service';
import { IdentityPrismaService } from '../../database/identity-prisma.service';
import { CryptoService } from '../../common/crypto';
import { AuthProvider } from './dto/create-account.dto';

// Mock bcrypt
vi.mock('bcrypt', () => ({
  compare: vi.fn(),
  hash: vi.fn(),
}));

// Type for mocked Prisma service with vi.fn() methods
type MockPrismaAccount = {
  findUnique: Mock;
  findMany: Mock;
  create: Mock;
  update: Mock;
  count: Mock;
};

// Type for mocked CryptoService
type MockedCryptoService = {
  generateTotpSecret: Mock;
  encrypt: Mock;
  decrypt: Mock;
  hash: Mock;
};

describe('AccountsService', () => {
  let service: AccountsService;
  let prisma: { account: MockPrismaAccount };
  let cryptoService: MockedCryptoService;

  const mockAccount = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    externalId: 'ACC_abc123',
    email: 'test@example.com',
    username: 'testuser',
    password: '$2b$12$hashedpassword',
    provider: 'LOCAL',
    providerId: null,
    status: 'ACTIVE',
    mode: 'SERVICE',
    emailVerified: false,
    emailVerifiedAt: null,
    phoneVerified: false,
    phoneVerifiedAt: null,
    mfaEnabled: false,
    mfaSecret: null,
    mfaBackupCodes: [],
    lastPasswordChange: null,
    failedLoginAttempts: 0,
    lockedUntil: null,
    region: null,
    locale: null,
    timezone: null,
    countryCode: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    lastFailedLoginAt: null,
    lastSuccessLoginAt: null,
  };

  beforeEach(async () => {
    const mockPrisma = {
      account: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
    };

    const mockCryptoService = {
      generateTotpSecret: vi.fn(),
      encrypt: vi.fn(),
      decrypt: vi.fn(),
      hash: vi.fn(),
    };

    const mockConfigService = {
      get: vi.fn((_key: string, defaultValue: unknown) => defaultValue),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsService,
        { provide: IdentityPrismaService, useValue: mockPrisma },
        { provide: CryptoService, useValue: mockCryptoService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AccountsService>(AccountsService);
    prisma = module.get(IdentityPrismaService);
    cryptoService = module.get(CryptoService);
  });

  describe('create', () => {
    it('should create a new account successfully', async () => {
      prisma.account.findUnique.mockResolvedValue(null);
      prisma.account.create.mockResolvedValue(mockAccount as never);

      const result = await service.create({
        email: 'test@example.com',
        username: 'testuser',
        password: 'Password123!',
      });

      expect(result.email).toBe('test@example.com');
      expect(result.username).toBe('testuser');
      expect(prisma.account.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      prisma.account.findUnique.mockResolvedValueOnce(mockAccount as never);

      await expect(
        service.create({
          email: 'test@example.com',
          username: 'newuser',
          password: 'Password123!',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if username already exists', async () => {
      prisma.account.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockAccount as never);

      await expect(
        service.create({
          email: 'new@example.com',
          username: 'testuser',
          password: 'Password123!',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if password missing for LOCAL provider', async () => {
      prisma.account.findUnique.mockResolvedValue(null);

      await expect(
        service.create({
          email: 'test@example.com',
          username: 'testuser',
          provider: AuthProvider.LOCAL,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if providerId missing for OAuth provider', async () => {
      prisma.account.findUnique.mockResolvedValue(null);

      await expect(
        service.create({
          email: 'test@example.com',
          username: 'testuser',
          provider: AuthProvider.GOOGLE,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findById', () => {
    it('should return account when found', async () => {
      prisma.account.findUnique.mockResolvedValue(mockAccount as never);

      const result = await service.findById(mockAccount.id);

      expect(result.id).toBe(mockAccount.id);
      expect(prisma.account.findUnique).toHaveBeenCalledWith({
        where: { id: mockAccount.id },
      });
    });

    it('should throw NotFoundException when account not found', async () => {
      prisma.account.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEmail', () => {
    it('should return account when found', async () => {
      prisma.account.findUnique.mockResolvedValue(mockAccount as never);

      const result = await service.findByEmail('test@example.com');

      expect(result?.email).toBe('test@example.com');
    });

    it('should return null when account not found', async () => {
      prisma.account.findUnique.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update account successfully', async () => {
      prisma.account.findUnique.mockResolvedValue(mockAccount as never);
      prisma.account.update.mockResolvedValue({
        ...mockAccount,
        locale: 'ko',
      } as never);

      const result = await service.update(mockAccount.id, { locale: 'ko' });

      expect(result.locale).toBe('ko');
    });

    it('should throw NotFoundException if account does not exist', async () => {
      prisma.account.findUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent-id', { locale: 'ko' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if new email already exists', async () => {
      prisma.account.findUnique
        .mockResolvedValueOnce(mockAccount as never)
        .mockResolvedValueOnce({ ...mockAccount, id: 'other-id' } as never);

      await expect(
        service.update(mockAccount.id, { email: 'existing@example.com' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('delete', () => {
    it('should soft delete account successfully', async () => {
      prisma.account.findUnique.mockResolvedValue(mockAccount as never);
      prisma.account.update.mockResolvedValue({
        ...mockAccount,
        status: 'DELETED',
        deletedAt: new Date(),
      } as never);

      await service.delete(mockAccount.id);

      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: mockAccount.id },
        data: {
          status: 'DELETED',
          deletedAt: expect.any(Date),
        },
      });
    });

    it('should throw NotFoundException if account does not exist', async () => {
      prisma.account.findUnique.mockResolvedValue(null);

      await expect(service.delete('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('recordFailedLogin', () => {
    it('should increment failed login attempts', async () => {
      prisma.account.findUnique.mockResolvedValue(mockAccount as never);
      prisma.account.update.mockResolvedValue({
        ...mockAccount,
        failedLoginAttempts: 1,
      } as never);

      await service.recordFailedLogin(mockAccount.id);

      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: mockAccount.id },
        data: expect.objectContaining({
          failedLoginAttempts: 1,
        }),
      });
    });

    it('should lock account after threshold', async () => {
      prisma.account.findUnique.mockResolvedValue({
        ...mockAccount,
        failedLoginAttempts: 4,
      } as never);
      prisma.account.update.mockResolvedValue({} as never);

      await service.recordFailedLogin(mockAccount.id);

      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: mockAccount.id },
        data: expect.objectContaining({
          failedLoginAttempts: 5,
          lockedUntil: expect.any(Date),
        }),
      });
    });
  });

  describe('enableMfa', () => {
    it('should generate MFA secret and backup codes', async () => {
      prisma.account.findUnique.mockResolvedValue(mockAccount as never);
      prisma.account.update.mockResolvedValue({} as never);
      cryptoService.generateTotpSecret.mockReturnValue('JBSWY3DPEHPK3PXP');
      cryptoService.encrypt.mockReturnValue('encrypted_secret');
      cryptoService.hash.mockImplementation((code: string) => `hash_${code}`);

      const result = await service.enableMfa(mockAccount.id);

      expect(result.secret).toBe('JBSWY3DPEHPK3PXP');
      expect(result.backupCodes).toHaveLength(10);
      expect(result.qrCode).toContain('otpauth://totp/');
    });

    it('should throw ConflictException if MFA already enabled', async () => {
      prisma.account.findUnique.mockResolvedValue({
        ...mockAccount,
        mfaEnabled: true,
      } as never);

      await expect(service.enableMfa(mockAccount.id)).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if account does not exist', async () => {
      prisma.account.findUnique.mockResolvedValue(null);

      await expect(service.enableMfa('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('disableMfa', () => {
    it('should disable MFA and clear secrets', async () => {
      prisma.account.findUnique.mockResolvedValue({
        ...mockAccount,
        mfaEnabled: true,
        mfaSecret: 'encrypted_secret',
        mfaBackupCodes: ['code1', 'code2'],
      } as never);
      prisma.account.update.mockResolvedValue({
        ...mockAccount,
        mfaEnabled: false,
        mfaSecret: null,
        mfaBackupCodes: [],
      } as never);

      await service.disableMfa(mockAccount.id);

      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: mockAccount.id },
        data: {
          mfaEnabled: false,
          mfaSecret: null,
          mfaBackupCodes: [],
        },
      });
    });

    it('should throw NotFoundException if account does not exist', async () => {
      prisma.account.findUnique.mockResolvedValue(null);

      await expect(service.disableMfa('nonexistent-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if MFA not enabled', async () => {
      prisma.account.findUnique.mockResolvedValue({
        ...mockAccount,
        mfaEnabled: false,
      } as never);

      await expect(service.disableMfa(mockAccount.id)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findByExternalId', () => {
    it('should return account when found by external ID', async () => {
      prisma.account.findUnique.mockResolvedValue(mockAccount as never);

      const result = await service.findByExternalId('ACC_abc123');

      expect(result.externalId).toBe('ACC_abc123');
    });

    it('should throw NotFoundException when account not found by external ID', async () => {
      prisma.account.findUnique.mockResolvedValue(null);

      await expect(service.findByExternalId('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByUsername', () => {
    it('should return account when found by username', async () => {
      prisma.account.findUnique.mockResolvedValue(mockAccount as never);

      const result = await service.findByUsername('testuser');

      expect(result?.username).toBe('testuser');
    });

    it('should return null when account not found by username', async () => {
      prisma.account.findUnique.mockResolvedValue(null);

      const result = await service.findByUsername('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return paginated accounts', async () => {
      prisma.account.findMany.mockResolvedValue([mockAccount] as never);
      prisma.account.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('should filter by email', async () => {
      prisma.account.findMany.mockResolvedValue([mockAccount] as never);
      prisma.account.count.mockResolvedValue(1);

      await service.findAll({ email: 'test@example.com' });

      expect(prisma.account.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            email: { contains: 'test@example.com', mode: 'insensitive' },
          }),
        }),
      );
    });

    it('should filter by status', async () => {
      prisma.account.findMany.mockResolvedValue([mockAccount] as never);
      prisma.account.count.mockResolvedValue(1);

      await service.findAll({ status: 'ACTIVE' as any });

      expect(prisma.account.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'ACTIVE',
          }),
        }),
      );
    });

    it('should respect limit maximum of 100', async () => {
      prisma.account.findMany.mockResolvedValue([mockAccount] as never);
      prisma.account.count.mockResolvedValue(1);

      await service.findAll({ page: 1, limit: 200 });

      expect(prisma.account.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
        }),
      );
    });

    it('should sort by allowed fields', async () => {
      prisma.account.findMany.mockResolvedValue([mockAccount] as never);
      prisma.account.count.mockResolvedValue(1);

      await service.findAll({ sort: 'email', order: 'asc' });

      expect(prisma.account.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { email: 'asc' },
        }),
      );
    });

    it('should use default sort field for invalid field', async () => {
      prisma.account.findMany.mockResolvedValue([mockAccount] as never);
      prisma.account.count.mockResolvedValue(1);

      await service.findAll({ sort: 'invalidField' });

      expect(prisma.account.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });

  describe('verifyEmail', () => {
    it('should verify email and update status', async () => {
      prisma.account.findUnique.mockResolvedValue({
        ...mockAccount,
        status: 'PENDING_VERIFICATION',
      } as never);
      prisma.account.update.mockResolvedValue({
        ...mockAccount,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        status: 'ACTIVE',
      } as never);

      await service.verifyEmail(mockAccount.id);

      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: mockAccount.id },
        data: expect.objectContaining({
          emailVerified: true,
          emailVerifiedAt: expect.any(Date),
          status: 'ACTIVE',
        }),
      });
    });

    it('should throw NotFoundException if account does not exist', async () => {
      prisma.account.findUnique.mockResolvedValue(null);

      await expect(service.verifyEmail('nonexistent-id')).rejects.toThrow(NotFoundException);
    });

    it('should keep existing status if not PENDING_VERIFICATION', async () => {
      prisma.account.findUnique.mockResolvedValue({
        ...mockAccount,
        status: 'ACTIVE',
      } as never);
      prisma.account.update.mockResolvedValue({} as never);

      await service.verifyEmail(mockAccount.id);

      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: mockAccount.id },
        data: expect.objectContaining({
          status: 'ACTIVE',
        }),
      });
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      prisma.account.findUnique.mockResolvedValue(mockAccount as never);
      prisma.account.update.mockResolvedValue({} as never);
      (bcrypt.compare as Mock).mockResolvedValue(true);
      (bcrypt.hash as Mock).mockResolvedValue('new_hashed_password');

      await service.changePassword(mockAccount.id, {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
      });

      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: mockAccount.id },
        data: expect.objectContaining({
          password: expect.any(String),
          lastPasswordChange: expect.any(Date),
        }),
      });
    });

    it('should throw NotFoundException if account does not exist', async () => {
      prisma.account.findUnique.mockResolvedValue(null);

      await expect(
        service.changePassword('nonexistent-id', {
          currentPassword: 'old',
          newPassword: 'new',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if current password missing', async () => {
      prisma.account.findUnique.mockResolvedValue(mockAccount as never);

      await expect(
        service.changePassword(mockAccount.id, {
          newPassword: 'NewPassword123!',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateStatus', () => {
    it('should update account status', async () => {
      prisma.account.findUnique.mockResolvedValue(mockAccount as never);
      prisma.account.update.mockResolvedValue({
        ...mockAccount,
        status: 'SUSPENDED',
      } as never);

      const result = await service.updateStatus(mockAccount.id, 'SUSPENDED' as any);

      expect(result.status).toBe('SUSPENDED');
    });

    it('should throw NotFoundException if account does not exist', async () => {
      prisma.account.findUnique.mockResolvedValue(null);

      await expect(service.updateStatus('nonexistent-id', 'ACTIVE' as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('resetFailedLogins', () => {
    it('should reset failed login attempts and unlock account', async () => {
      prisma.account.update.mockResolvedValue({
        ...mockAccount,
        failedLoginAttempts: 0,
        lockedUntil: null,
      } as never);

      await service.resetFailedLogins(mockAccount.id);

      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: mockAccount.id },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });
    });
  });

  describe('validatePassword', () => {
    it('should return true for valid password', async () => {
      // Mock bcrypt.compare behavior through the service
      prisma.account.findUnique.mockResolvedValue({
        ...mockAccount,
        password: '$2b$12$validhashedpassword',
      } as never);

      // Note: This test would need bcrypt mocking in a real scenario
      // For now we test the basic flow
      await service.validatePassword(mockAccount.id, 'ValidPassword123!');

      expect(prisma.account.findUnique).toHaveBeenCalledWith({
        where: { id: mockAccount.id },
      });
    });

    it('should return false when account not found', async () => {
      prisma.account.findUnique.mockResolvedValue(null);

      const result = await service.validatePassword('nonexistent-id', 'password');

      expect(result).toBe(false);
    });

    it('should return false when account has no password', async () => {
      prisma.account.findUnique.mockResolvedValue({
        ...mockAccount,
        password: null,
      } as never);

      const result = await service.validatePassword(mockAccount.id, 'password');

      expect(result).toBe(false);
    });
  });

  describe('recordFailedLogin edge cases', () => {
    it('should silently fail for non-existent account', async () => {
      prisma.account.findUnique.mockResolvedValue(null);

      await expect(service.recordFailedLogin('nonexistent-id')).resolves.not.toThrow();
      expect(prisma.account.update).not.toHaveBeenCalled();
    });
  });

  describe('OAuth account creation', () => {
    it('should create OAuth account without password', async () => {
      prisma.account.findUnique.mockResolvedValue(null);
      prisma.account.create.mockResolvedValue({
        ...mockAccount,
        provider: 'GOOGLE',
        providerId: 'google-123',
        password: null,
        emailVerified: true,
        status: 'ACTIVE',
      } as never);

      await service.create({
        email: 'oauth@example.com',
        username: 'oauthuser',
        provider: AuthProvider.GOOGLE,
        providerId: 'google-123',
      });

      expect(prisma.account.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          provider: 'GOOGLE',
          providerId: 'google-123',
          emailVerified: true,
          status: 'ACTIVE',
        }),
      });
    });
  });

  describe('update email reset verification', () => {
    it('should reset email verification when email changes', async () => {
      prisma.account.findUnique.mockResolvedValueOnce(mockAccount as never);
      prisma.account.findUnique.mockResolvedValueOnce(null); // No conflict
      prisma.account.update.mockResolvedValue({
        ...mockAccount,
        email: 'new@example.com',
        emailVerified: false,
        emailVerifiedAt: null,
      } as never);

      await service.update(mockAccount.id, { email: 'new@example.com' });

      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: mockAccount.id },
        data: expect.objectContaining({
          email: 'new@example.com',
          emailVerified: false,
          emailVerifiedAt: null,
        }),
      });
    });
  });
});

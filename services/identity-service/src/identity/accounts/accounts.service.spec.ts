import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { IdentityPrismaService } from '../../database/identity-prisma.service';
import { CryptoService } from '../../common/crypto';
import { AuthProvider, AccountMode } from './dto/create-account.dto';

describe('AccountsService', () => {
  let service: AccountsService;
  let prisma: jest.Mocked<IdentityPrismaService>;
  let cryptoService: jest.Mocked<CryptoService>;

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
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
    };

    const mockCryptoService = {
      generateTotpSecret: jest.fn(),
      encrypt: jest.fn(),
      decrypt: jest.fn(),
      hash: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string, defaultValue: unknown) => defaultValue),
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
  });
});

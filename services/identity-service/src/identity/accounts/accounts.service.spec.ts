import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { IdentityPrismaService } from '../../database/identity-prisma.service';
import { CryptoService } from '../../common/crypto';
import { CreateAccountDto, AuthProvider, AccountMode } from './dto/create-account.dto';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn().mockResolvedValue(true),
}));

describe('AccountsService', () => {
  let service: AccountsService;
  let prisma: jest.Mocked<IdentityPrismaService>;
  let cryptoService: jest.Mocked<CryptoService>;
  let configService: jest.Mocked<ConfigService>;

  const mockAccount = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    externalId: 'ACC_abc123',
    email: 'test@example.com',
    username: 'testuser',
    password: 'hashed_password',
    provider: AuthProvider.LOCAL,
    providerId: null,
    mode: AccountMode.SERVICE,
    status: 'ACTIVE',
    emailVerified: true,
    emailVerifiedAt: new Date(),
    mfaEnabled: false,
    mfaSecret: null,
    mfaBackupCodes: [],
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastPasswordChange: null,
    region: null,
    locale: 'en-US',
    timezone: 'America/New_York',
    countryCode: 'US',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    // Create mock implementations
    const mockPrismaAccount = {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    };

    const mockPrismaService = {
      account: mockPrismaAccount,
      $queryRaw: jest.fn(),
      $executeRaw: jest.fn(),
      $transaction: jest.fn((fn) => fn(mockPrismaService)),
    };

    const mockCryptoService = {
      encrypt: jest.fn().mockReturnValue('encrypted_secret'),
      decrypt: jest.fn().mockReturnValue('decrypted_secret'),
      hash: jest.fn().mockReturnValue('hashed_value'),
      generateTotpSecret: jest.fn().mockReturnValue('TOTP_SECRET_BASE32'),
    };

    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        const config: Record<string, unknown> = {
          'security.bcryptRounds': 12,
          'account.externalIdPrefix': 'ACC_',
          'account.externalIdLength': 10,
          'security.accountLockThreshold': 5,
          'security.accountLockDurationMinutes': 15,
          'security.mfaBackupCodesCount': 10,
        };
        return config[key] ?? defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsService,
        {
          provide: IdentityPrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CryptoService,
          useValue: mockCryptoService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AccountsService>(AccountsService);
    prisma = module.get(IdentityPrismaService);
    cryptoService = module.get(CryptoService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto: CreateAccountDto = {
      email: 'new@example.com',
      username: 'newuser',
      password: 'SecureP@ss123!',
      provider: AuthProvider.LOCAL,
    };

    it('should create a new account successfully', async () => {
      prisma.account.findUnique.mockResolvedValue(null);
      prisma.account.create.mockResolvedValue({
        ...mockAccount,
        email: createDto.email,
        username: createDto.username,
      });

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(result.email).toBe(createDto.email);
      expect(result.username).toBe(createDto.username);
      expect(prisma.account.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      prisma.account.findUnique.mockResolvedValueOnce(mockAccount);

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
      await expect(service.create(createDto)).rejects.toThrow('Email already registered');
    });

    it('should throw ConflictException if username already exists', async () => {
      prisma.account.findUnique
        .mockResolvedValueOnce(null) // email check
        .mockResolvedValueOnce(mockAccount); // username check

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if LOCAL provider without password', async () => {
      prisma.account.findUnique.mockResolvedValue(null);

      const dtoWithoutPassword = { ...createDto, password: undefined };
      await expect(service.create(dtoWithoutPassword)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if OAuth provider without providerId', async () => {
      prisma.account.findUnique.mockResolvedValue(null);

      const oauthDto = {
        ...createDto,
        provider: AuthProvider.GOOGLE,
        password: undefined,
        providerId: undefined,
      };
      await expect(service.create(oauthDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findById', () => {
    it('should return account when found', async () => {
      prisma.account.findUnique.mockResolvedValue(mockAccount);

      const result = await service.findById(mockAccount.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockAccount.id);
      expect(prisma.account.findUnique).toHaveBeenCalledWith({
        where: { id: mockAccount.id },
      });
    });

    it('should throw NotFoundException when account not found', async () => {
      prisma.account.findUnique.mockResolvedValue(null);

      await expect(service.findById('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEmail', () => {
    it('should return account when found', async () => {
      prisma.account.findUnique.mockResolvedValue(mockAccount);

      const result = await service.findByEmail(mockAccount.email);

      expect(result).toBeDefined();
      expect(result?.email).toBe(mockAccount.email);
    });

    it('should return null when account not found', async () => {
      prisma.account.findUnique.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findByUsername', () => {
    it('should return account when found', async () => {
      prisma.account.findUnique.mockResolvedValue(mockAccount);

      const result = await service.findByUsername(mockAccount.username);

      expect(result).toBeDefined();
      expect(result?.username).toBe(mockAccount.username);
    });

    it('should return null when account not found', async () => {
      prisma.account.findUnique.mockResolvedValue(null);

      const result = await service.findByUsername('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return paginated accounts', async () => {
      prisma.account.findMany.mockResolvedValue([mockAccount]);
      prisma.account.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
    });

    it('should filter by email', async () => {
      prisma.account.findMany.mockResolvedValue([mockAccount]);
      prisma.account.count.mockResolvedValue(1);

      await service.findAll({ email: 'test@' });

      expect(prisma.account.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            email: { contains: 'test@', mode: 'insensitive' },
          }),
        }),
      );
    });

    it('should limit to max 100 items per page', async () => {
      prisma.account.findMany.mockResolvedValue([]);
      prisma.account.count.mockResolvedValue(0);

      await service.findAll({ limit: 500 });

      expect(prisma.account.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100, // Should be capped at 100
        }),
      );
    });
  });

  describe('update', () => {
    it('should update account successfully', async () => {
      prisma.account.findUnique.mockResolvedValue(mockAccount);
      prisma.account.update.mockResolvedValue({
        ...mockAccount,
        locale: 'ko-KR',
      });

      const result = await service.update(mockAccount.id, { locale: 'ko-KR' });

      expect(result.locale).toBe('ko-KR');
    });

    it('should throw NotFoundException when account not found', async () => {
      prisma.account.findUnique.mockResolvedValue(null);

      await expect(service.update('non-existent', { locale: 'ko-KR' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when email already exists', async () => {
      prisma.account.findUnique
        .mockResolvedValueOnce(mockAccount) // First call for existence check
        .mockResolvedValueOnce({ ...mockAccount, id: 'other-id' }); // Second call for email check

      await expect(
        service.update(mockAccount.id, { email: 'existing@example.com' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('delete', () => {
    it('should soft delete account', async () => {
      prisma.account.findUnique.mockResolvedValue(mockAccount);
      prisma.account.update.mockResolvedValue({
        ...mockAccount,
        status: 'DELETED',
        deletedAt: new Date(),
      });

      await service.delete(mockAccount.id);

      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: mockAccount.id },
        data: {
          status: 'DELETED',
          deletedAt: expect.any(Date),
        },
      });
    });

    it('should throw NotFoundException when account not found', async () => {
      prisma.account.findUnique.mockResolvedValue(null);

      await expect(service.delete('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('validatePassword', () => {
    it('should return true for valid password', async () => {
      prisma.account.findUnique.mockResolvedValue(mockAccount);

      const result = await service.validatePassword(mockAccount.id, 'correct_password');

      expect(result).toBe(true);
    });

    it('should return false when account not found', async () => {
      prisma.account.findUnique.mockResolvedValue(null);

      const result = await service.validatePassword('non-existent', 'password');

      expect(result).toBe(false);
    });

    it('should return false when account has no password', async () => {
      prisma.account.findUnique.mockResolvedValue({
        ...mockAccount,
        password: null,
      });

      const result = await service.validatePassword(mockAccount.id, 'password');

      expect(result).toBe(false);
    });
  });

  describe('enableMfa', () => {
    it('should enable MFA and return setup data', async () => {
      prisma.account.findUnique.mockResolvedValue({
        ...mockAccount,
        mfaEnabled: false,
      });
      prisma.account.update.mockResolvedValue(mockAccount);

      const result = await service.enableMfa(mockAccount.id);

      expect(result.secret).toBeDefined();
      expect(result.qrCode).toContain('otpauth://totp/');
      expect(result.backupCodes).toHaveLength(10);
      expect(cryptoService.encrypt).toHaveBeenCalled();
    });

    it('should throw NotFoundException when account not found', async () => {
      prisma.account.findUnique.mockResolvedValue(null);

      await expect(service.enableMfa('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when MFA already enabled', async () => {
      prisma.account.findUnique.mockResolvedValue({
        ...mockAccount,
        mfaEnabled: true,
      });

      await expect(service.enableMfa(mockAccount.id)).rejects.toThrow(ConflictException);
    });
  });

  describe('recordFailedLogin', () => {
    it('should increment failed login attempts', async () => {
      prisma.account.findUnique.mockResolvedValue({
        ...mockAccount,
        failedLoginAttempts: 2,
      });
      prisma.account.update.mockResolvedValue(mockAccount);

      await service.recordFailedLogin(mockAccount.id);

      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: mockAccount.id },
        data: expect.objectContaining({
          failedLoginAttempts: 3,
        }),
      });
    });

    it('should lock account after threshold', async () => {
      prisma.account.findUnique.mockResolvedValue({
        ...mockAccount,
        failedLoginAttempts: 4, // One more will reach 5 (threshold)
      });
      prisma.account.update.mockResolvedValue(mockAccount);

      await service.recordFailedLogin(mockAccount.id);

      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: mockAccount.id },
        data: expect.objectContaining({
          failedLoginAttempts: 5,
          lockedUntil: expect.any(Date),
        }),
      });
    });

    it('should silently fail for non-existent account', async () => {
      prisma.account.findUnique.mockResolvedValue(null);

      // Should not throw
      await expect(service.recordFailedLogin('non-existent')).resolves.not.toThrow();
    });
  });

  describe('resetFailedLogins', () => {
    it('should reset failed login attempts', async () => {
      prisma.account.update.mockResolvedValue(mockAccount);

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
});

import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { RegistrationService } from '../../src/composition/registration/registration.service';
import { AccountsService } from '../../src/identity/accounts/accounts.service';
import { ProfilesService } from '../../src/identity/profiles/profiles.service';
import { SagaOrchestratorService } from '../../src/common/saga/saga-orchestrator.service';
import { OutboxService } from '../../src/common/outbox/outbox.service';
import { IdentityPrismaService } from '../../src/database/identity-prisma.service';
import { SagaStatus, SagaStepStatus } from '../../src/common/saga/saga.types';

// Type for mocked Prisma service with jest.fn() methods
type MockPrismaAccount = {
  findUnique: jest.Mock;
};

describe('RegistrationService', () => {
  let service: RegistrationService;
  let prisma: { account: MockPrismaAccount; $transaction: jest.Mock };
  let sagaOrchestrator: jest.Mocked<SagaOrchestratorService>;

  const mockAccount = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    username: 'testuser',
    createdAt: new Date(),
  };

  const mockProfile = {
    id: '223e4567-e89b-12d3-a456-426614174001',
    accountId: mockAccount.id,
    displayName: 'Test User',
  };

  beforeEach(async () => {
    const mockPrisma = {
      account: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn((fn) => fn()),
    };

    const mockAccountsService = {
      create: jest.fn(),
      delete: jest.fn(),
    };

    const mockProfilesService = {
      create: jest.fn(),
      delete: jest.fn(),
    };

    const mockSagaOrchestrator = {
      execute: jest.fn(),
    };

    const mockOutboxService = {
      publishEvent: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistrationService,
        { provide: IdentityPrismaService, useValue: mockPrisma },
        { provide: AccountsService, useValue: mockAccountsService },
        { provide: ProfilesService, useValue: mockProfilesService },
        { provide: SagaOrchestratorService, useValue: mockSagaOrchestrator },
        { provide: OutboxService, useValue: mockOutboxService },
      ],
    }).compile();

    service = module.get<RegistrationService>(RegistrationService);
    prisma = module.get(IdentityPrismaService);
    sagaOrchestrator = module.get(SagaOrchestratorService);
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      (prisma.account.findUnique as jest.Mock).mockResolvedValue(null);
      sagaOrchestrator.execute.mockResolvedValue({
        success: true,
        sagaId: 'saga-123',
        status: SagaStatus.COMPLETED,
        context: {
          dto: {
            email: 'test@example.com',
            password: 'Password123!',
            displayName: 'Test User',
            countryCode: 'KR',
          },
          accountId: mockAccount.id,
          profileId: mockProfile.id,
          account: mockAccount,
        },
        steps: [],
      });

      const result = await service.register(
        {
          email: 'test@example.com',
          password: 'Password123!',
          displayName: 'Test User',
          countryCode: 'KR',
        },
        '192.168.1.1',
        'Mozilla/5.0',
      );

      expect(result.success).toBe(true);
      expect(result.accountId).toBe(mockAccount.id);
      expect(result.email).toBe('test@example.com');
      expect(result.displayName).toBe('Test User');
      expect(result.emailVerificationRequired).toBe(true);
    });

    it('should throw ConflictException if email already exists', async () => {
      (prisma.account.findUnique as jest.Mock).mockResolvedValue({ id: 'existing-id' });

      await expect(
        service.register(
          {
            email: 'existing@example.com',
            password: 'Password123!',
            displayName: 'Test User',
            countryCode: 'KR',
          },
          '192.168.1.1',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException when saga fails', async () => {
      (prisma.account.findUnique as jest.Mock).mockResolvedValue(null);
      sagaOrchestrator.execute.mockResolvedValue({
        success: false,
        sagaId: 'saga-123',
        status: SagaStatus.FAILED,
        context: {},
        error: 'Account creation failed',
        steps: [],
      });

      await expect(
        service.register(
          {
            email: 'test@example.com',
            password: 'Password123!',
            displayName: 'Test User',
            countryCode: 'KR',
          },
          '192.168.1.1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should include locale and timezone when provided', async () => {
      (prisma.account.findUnique as jest.Mock).mockResolvedValue(null);
      sagaOrchestrator.execute.mockResolvedValue({
        success: true,
        sagaId: 'saga-123',
        status: SagaStatus.COMPLETED,
        context: {
          dto: {
            email: 'test@example.com',
            password: 'Password123!',
            displayName: 'Test User',
            countryCode: 'KR',
            locale: 'ko-KR',
            timezone: 'Asia/Seoul',
          },
          accountId: mockAccount.id,
          account: mockAccount,
        },
        steps: [],
      });

      const result = await service.register({
        email: 'test@example.com',
        password: 'Password123!',
        displayName: 'Test User',
        countryCode: 'KR',
        locale: 'ko-KR',
        timezone: 'Asia/Seoul',
      });

      expect(result.success).toBe(true);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should use serializable isolation level for transaction', async () => {
      (prisma.account.findUnique as jest.Mock).mockResolvedValue(null);
      sagaOrchestrator.execute.mockResolvedValue({
        success: true,
        sagaId: 'saga-123',
        status: SagaStatus.COMPLETED,
        context: {
          accountId: mockAccount.id,
          account: mockAccount,
        },
        steps: [],
      });

      await service.register({
        email: 'test@example.com',
        password: 'Password123!',
        displayName: 'Test User',
        countryCode: 'KR',
      });

      expect(prisma.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          isolationLevel: 'Serializable',
        }),
      );
    });

    it('should throw BadRequestException with saga error message', async () => {
      (prisma.account.findUnique as jest.Mock).mockResolvedValue(null);
      sagaOrchestrator.execute.mockResolvedValue({
        success: false,
        sagaId: 'saga-123',
        status: SagaStatus.FAILED,
        context: {},
        error: 'Profile creation failed: Database constraint violation',
        steps: [],
      });

      await expect(
        service.register({
          email: 'test@example.com',
          password: 'Password123!',
          displayName: 'Test User',
          countryCode: 'KR',
        }),
      ).rejects.toThrow('Profile creation failed: Database constraint violation');
    });

    it('should return createdAt from saga context', async () => {
      const createdAt = new Date('2024-01-01T00:00:00Z');
      (prisma.account.findUnique as jest.Mock).mockResolvedValue(null);
      sagaOrchestrator.execute.mockResolvedValue({
        success: true,
        sagaId: 'saga-123',
        status: SagaStatus.COMPLETED,
        context: {
          accountId: mockAccount.id,
          account: { ...mockAccount, createdAt },
        },
        steps: [],
      });

      const result = await service.register({
        email: 'test@example.com',
        password: 'Password123!',
        displayName: 'Test User',
        countryCode: 'KR',
      });

      expect(result.createdAt).toEqual(createdAt);
    });

    it('should generate default createdAt if not in context', async () => {
      (prisma.account.findUnique as jest.Mock).mockResolvedValue(null);
      sagaOrchestrator.execute.mockResolvedValue({
        success: true,
        sagaId: 'saga-123',
        status: SagaStatus.COMPLETED,
        context: {
          accountId: mockAccount.id,
        },
        steps: [],
      });

      const result = await service.register({
        email: 'test@example.com',
        password: 'Password123!',
        displayName: 'Test User',
        countryCode: 'KR',
      });

      expect(result.createdAt).toBeDefined();
      expect(result.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('saga execution', () => {
    it('should execute saga with correct initial context', async () => {
      (prisma.account.findUnique as jest.Mock).mockResolvedValue(null);
      sagaOrchestrator.execute.mockResolvedValue({
        success: true,
        sagaId: 'saga-123',
        status: SagaStatus.COMPLETED,
        context: {
          accountId: mockAccount.id,
          account: mockAccount,
        },
        steps: [],
      });

      await service.register(
        {
          email: 'test@example.com',
          password: 'Password123!',
          displayName: 'Test User',
          countryCode: 'KR',
        },
        '192.168.1.1',
        'Mozilla/5.0',
      );

      expect(sagaOrchestrator.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'UserRegistration',
          steps: expect.arrayContaining([
            expect.objectContaining({ name: 'CreateAccount' }),
            expect.objectContaining({ name: 'CreateProfile' }),
            expect.objectContaining({ name: 'PublishRegistrationEvent' }),
          ]),
        }),
        expect.objectContaining({
          dto: expect.objectContaining({
            email: 'test@example.com',
            displayName: 'Test User',
          }),
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        }),
      );
    });

    it('should handle saga with compensation on failure', async () => {
      (prisma.account.findUnique as jest.Mock).mockResolvedValue(null);
      sagaOrchestrator.execute.mockResolvedValue({
        success: false,
        sagaId: 'saga-123',
        status: SagaStatus.COMPENSATED,
        context: {
          accountId: mockAccount.id,
        },
        error: 'Profile creation failed',
        steps: [
          { name: 'CreateAccount', status: SagaStepStatus.COMPENSATED, retryCount: 0 },
          { name: 'CreateProfile', status: SagaStepStatus.FAILED, retryCount: 0 },
        ],
      });

      await expect(
        service.register({
          email: 'test@example.com',
          password: 'Password123!',
          displayName: 'Test User',
          countryCode: 'KR',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('email normalization', () => {
    it('should check for existing email with lowercase normalization', async () => {
      (prisma.account.findUnique as jest.Mock).mockResolvedValue(null);
      sagaOrchestrator.execute.mockResolvedValue({
        success: true,
        sagaId: 'saga-123',
        status: SagaStatus.COMPLETED,
        context: { accountId: mockAccount.id, account: mockAccount },
        steps: [],
      });

      await service.register({
        email: 'Test@Example.COM',
        password: 'Password123!',
        displayName: 'Test User',
        countryCode: 'KR',
      });

      expect(prisma.account.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        select: { id: true },
      });
    });
  });

  describe('error handling', () => {
    it('should handle transaction timeout', async () => {
      (prisma.account.findUnique as jest.Mock).mockResolvedValue(null);
      prisma.$transaction.mockRejectedValue(new Error('Transaction timeout'));

      await expect(
        service.register({
          email: 'test@example.com',
          password: 'Password123!',
          displayName: 'Test User',
          countryCode: 'KR',
        }),
      ).rejects.toThrow('Transaction timeout');
    });

    it('should handle database connection errors', async () => {
      (prisma.account.findUnique as jest.Mock).mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(
        service.register({
          email: 'test@example.com',
          password: 'Password123!',
          displayName: 'Test User',
          countryCode: 'KR',
        }),
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('username generation', () => {
    it('should handle email with special characters', async () => {
      (prisma.account.findUnique as jest.Mock).mockResolvedValue(null);
      sagaOrchestrator.execute.mockResolvedValue({
        success: true,
        sagaId: 'saga-123',
        status: SagaStatus.COMPLETED,
        context: {
          accountId: mockAccount.id,
          account: mockAccount,
        },
        steps: [],
      });

      const result = await service.register({
        email: 'test.user+tag@example.com',
        password: 'Password123!',
        displayName: 'Test User',
        countryCode: 'KR',
      });

      expect(result.success).toBe(true);
    });
  });
});

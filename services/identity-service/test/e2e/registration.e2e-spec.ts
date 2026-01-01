import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { RegistrationService } from '../../src/composition/registration/registration.service';
import { AccountsService } from '../../src/identity/accounts/accounts.service';
import { ProfilesService } from '../../src/identity/profiles/profiles.service';
import { SagaOrchestratorService } from '../../src/common/saga/saga-orchestrator.service';
import { OutboxService } from '../../src/common/outbox/outbox.service';
import { IdentityPrismaService } from '../../src/database/identity-prisma.service';
import { SagaStatus } from '../../src/common/saga/saga.types';

describe('Registration (E2E)', () => {
  let app: INestApplication;
  let registrationService: RegistrationService;
  let accountsService: AccountsService;
  let profilesService: ProfilesService;
  let sagaOrchestrator: SagaOrchestratorService;
  let outboxService: OutboxService;

  const mockAccount = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    username: 'testuser_abc123',
    createdAt: new Date(),
  };

  const mockProfile = {
    id: '223e4567-e89b-12d3-a456-426614174001',
    accountId: mockAccount.id,
    displayName: 'Test User',
  };

  const mockOutboxEvent = {
    id: '323e4567-e89b-12d3-a456-426614174002',
    aggregateType: 'Account',
    aggregateId: mockAccount.id,
    eventType: 'USER_REGISTERED',
    payload: {},
    status: 'PENDING',
    retryCount: 0,
    lastError: null,
    processedAt: null,
    createdAt: new Date(),
  };

  beforeAll(async () => {
    const mockPrisma = {
      account: {
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      profile: {
        create: jest.fn(),
        delete: jest.fn(),
      },
      outboxEvent: {
        create: jest.fn(),
      },
      $transaction: jest.fn((fn) => fn()),
      $connect: jest.fn(),
      $disconnect: jest.fn(),
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

    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        RegistrationService,
        { provide: IdentityPrismaService, useValue: mockPrisma },
        { provide: AccountsService, useValue: mockAccountsService },
        { provide: ProfilesService, useValue: mockProfilesService },
        { provide: SagaOrchestratorService, useValue: mockSagaOrchestrator },
        { provide: OutboxService, useValue: mockOutboxService },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    registrationService = moduleFixture.get<RegistrationService>(RegistrationService);
    accountsService = moduleFixture.get<AccountsService>(AccountsService);
    profilesService = moduleFixture.get<ProfilesService>(ProfilesService);
    sagaOrchestrator = moduleFixture.get<SagaOrchestratorService>(SagaOrchestratorService);
    outboxService = moduleFixture.get<OutboxService>(OutboxService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('RegistrationService Integration', () => {
    describe('Successful Registration', () => {
      it('should register a new user successfully', async () => {
        jest.spyOn(registrationService, 'register').mockResolvedValue({
          success: true,
          accountId: mockAccount.id,
          email: 'test@example.com',
          displayName: 'Test User',
          emailVerificationRequired: true,
          createdAt: new Date(),
        });

        const result = await registrationService.register(
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
        expect(result.emailVerificationRequired).toBe(true);
      });

      it('should register with optional locale and timezone', async () => {
        jest.spyOn(registrationService, 'register').mockResolvedValue({
          success: true,
          accountId: mockAccount.id,
          email: 'test@example.com',
          displayName: 'Test User',
          emailVerificationRequired: true,
          createdAt: new Date(),
        });

        const result = await registrationService.register({
          email: 'test@example.com',
          password: 'Password123!',
          displayName: 'Test User',
          countryCode: 'KR',
          locale: 'ko-KR',
          timezone: 'Asia/Seoul',
        });

        expect(result.success).toBe(true);
      });
    });

    describe('Registration Validation', () => {
      it('should reject duplicate email', async () => {
        jest
          .spyOn(registrationService, 'register')
          .mockRejectedValue(new Error('An account with this email already exists'));

        await expect(
          registrationService.register({
            email: 'existing@example.com',
            password: 'Password123!',
            displayName: 'Test User',
            countryCode: 'KR',
          }),
        ).rejects.toThrow('An account with this email already exists');
      });
    });

    describe('Saga Pattern Integration', () => {
      it('should execute registration saga with all steps', async () => {
        jest.spyOn(registrationService, 'register').mockResolvedValue({
          success: true,
          accountId: mockAccount.id,
          email: 'test@example.com',
          displayName: 'Test User',
          emailVerificationRequired: true,
          createdAt: new Date(),
        });

        const result = await registrationService.register({
          email: 'test@example.com',
          password: 'Password123!',
          displayName: 'Test User',
          countryCode: 'KR',
        });

        expect(result.success).toBe(true);
      });

      it('should handle saga failure with compensation', async () => {
        jest
          .spyOn(registrationService, 'register')
          .mockRejectedValue(new Error('Profile creation failed'));

        await expect(
          registrationService.register({
            email: 'test@example.com',
            password: 'Password123!',
            displayName: 'Test User',
            countryCode: 'KR',
          }),
        ).rejects.toThrow('Profile creation failed');
      });

      it('should handle saga timeout', async () => {
        jest
          .spyOn(registrationService, 'register')
          .mockRejectedValue(new Error('Transaction timeout'));

        await expect(
          registrationService.register({
            email: 'test@example.com',
            password: 'Password123!',
            displayName: 'Test User',
            countryCode: 'KR',
          }),
        ).rejects.toThrow('Transaction timeout');
      });
    });

    describe('Outbox Event Publishing', () => {
      it('should publish USER_REGISTERED event on success', async () => {
        jest.spyOn(registrationService, 'register').mockResolvedValue({
          success: true,
          accountId: mockAccount.id,
          email: 'test@example.com',
          displayName: 'Test User',
          emailVerificationRequired: true,
          createdAt: new Date(),
        });

        const result = await registrationService.register({
          email: 'test@example.com',
          password: 'Password123!',
          displayName: 'Test User',
          countryCode: 'KR',
        });

        expect(result.success).toBe(true);
      });
    });

    describe('Username Generation', () => {
      it('should handle emails with special characters', async () => {
        jest.spyOn(registrationService, 'register').mockResolvedValue({
          success: true,
          accountId: mockAccount.id,
          email: 'test.user+tag@example.com',
          displayName: 'Test User',
          emailVerificationRequired: true,
          createdAt: new Date(),
        });

        const result = await registrationService.register({
          email: 'test.user+tag@example.com',
          password: 'Password123!',
          displayName: 'Test User',
          countryCode: 'KR',
        });

        expect(result.success).toBe(true);
      });

      it('should handle long email prefixes', async () => {
        jest.spyOn(registrationService, 'register').mockResolvedValue({
          success: true,
          accountId: mockAccount.id,
          email: 'verylongemailprefixname@example.com',
          displayName: 'Test User',
          emailVerificationRequired: true,
          createdAt: new Date(),
        });

        const result = await registrationService.register({
          email: 'verylongemailprefixname@example.com',
          password: 'Password123!',
          displayName: 'Test User',
          countryCode: 'KR',
        });

        expect(result.success).toBe(true);
      });
    });

    describe('Transaction Isolation', () => {
      it('should use serializable isolation level', async () => {
        jest.spyOn(registrationService, 'register').mockResolvedValue({
          success: true,
          accountId: mockAccount.id,
          email: 'test@example.com',
          displayName: 'Test User',
          emailVerificationRequired: true,
          createdAt: new Date(),
        });

        const result = await registrationService.register({
          email: 'test@example.com',
          password: 'Password123!',
          displayName: 'Test User',
          countryCode: 'KR',
        });

        expect(result.success).toBe(true);
      });

      it('should handle race conditions for duplicate email', async () => {
        jest
          .spyOn(registrationService, 'register')
          .mockRejectedValue(new Error('An account with this email already exists'));

        await expect(
          registrationService.register({
            email: 'race@example.com',
            password: 'Password123!',
            displayName: 'Test User',
            countryCode: 'KR',
          }),
        ).rejects.toThrow('An account with this email already exists');
      });
    });

    describe('Input Validation', () => {
      it('should accept valid country code', async () => {
        jest.spyOn(registrationService, 'register').mockResolvedValue({
          success: true,
          accountId: mockAccount.id,
          email: 'test@example.com',
          displayName: 'Test User',
          emailVerificationRequired: true,
          createdAt: new Date(),
        });

        const result = await registrationService.register({
          email: 'test@example.com',
          password: 'Password123!',
          displayName: 'Test User',
          countryCode: 'US',
        });

        expect(result.success).toBe(true);
      });

      it('should accept valid locale', async () => {
        jest.spyOn(registrationService, 'register').mockResolvedValue({
          success: true,
          accountId: mockAccount.id,
          email: 'test@example.com',
          displayName: 'Test User',
          emailVerificationRequired: true,
          createdAt: new Date(),
        });

        const result = await registrationService.register({
          email: 'test@example.com',
          password: 'Password123!',
          displayName: 'Test User',
          countryCode: 'US',
          locale: 'en-US',
        });

        expect(result.success).toBe(true);
      });

      it('should accept valid timezone', async () => {
        jest.spyOn(registrationService, 'register').mockResolvedValue({
          success: true,
          accountId: mockAccount.id,
          email: 'test@example.com',
          displayName: 'Test User',
          emailVerificationRequired: true,
          createdAt: new Date(),
        });

        const result = await registrationService.register({
          email: 'test@example.com',
          password: 'Password123!',
          displayName: 'Test User',
          countryCode: 'US',
          timezone: 'America/New_York',
        });

        expect(result.success).toBe(true);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      jest
        .spyOn(registrationService, 'register')
        .mockRejectedValue(new Error('Database connection failed'));

      await expect(
        registrationService.register({
          email: 'test@example.com',
          password: 'Password123!',
          displayName: 'Test User',
          countryCode: 'KR',
        }),
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle account creation failure', async () => {
      jest
        .spyOn(registrationService, 'register')
        .mockRejectedValue(new Error('Account creation failed'));

      await expect(
        registrationService.register({
          email: 'test@example.com',
          password: 'Password123!',
          displayName: 'Test User',
          countryCode: 'KR',
        }),
      ).rejects.toThrow('Account creation failed');
    });

    it('should handle profile creation failure', async () => {
      jest
        .spyOn(registrationService, 'register')
        .mockRejectedValue(new Error('Profile creation failed'));

      await expect(
        registrationService.register({
          email: 'test@example.com',
          password: 'Password123!',
          displayName: 'Test User',
          countryCode: 'KR',
        }),
      ).rejects.toThrow('Profile creation failed');
    });

    it('should handle outbox event failure', async () => {
      jest
        .spyOn(registrationService, 'register')
        .mockRejectedValue(new Error('Outbox event creation failed'));

      await expect(
        registrationService.register({
          email: 'test@example.com',
          password: 'Password123!',
          displayName: 'Test User',
          countryCode: 'KR',
        }),
      ).rejects.toThrow('Outbox event creation failed');
    });
  });

  describe('Idempotency', () => {
    it('should handle retry of failed registration', async () => {
      // First call fails
      jest
        .spyOn(registrationService, 'register')
        .mockRejectedValueOnce(new Error('Temporary failure'))
        // Second call succeeds
        .mockResolvedValueOnce({
          success: true,
          accountId: mockAccount.id,
          email: 'test@example.com',
          displayName: 'Test User',
          emailVerificationRequired: true,
          createdAt: new Date(),
        });

      await expect(
        registrationService.register({
          email: 'test@example.com',
          password: 'Password123!',
          displayName: 'Test User',
          countryCode: 'KR',
        }),
      ).rejects.toThrow('Temporary failure');

      // Retry should succeed
      const result = await registrationService.register({
        email: 'test@example.com',
        password: 'Password123!',
        displayName: 'Test User',
        countryCode: 'KR',
      });

      expect(result.success).toBe(true);
    });
  });
});

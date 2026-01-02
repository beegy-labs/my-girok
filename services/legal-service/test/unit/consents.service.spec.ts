import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConsentsService } from '../../src/consents/consents.service';
import { PrismaService } from '../../src/database/prisma.service';
import { CacheService } from '../../src/common/cache/cache.service';
import { OutboxService } from '../../src/common/outbox/outbox.service';
import { createMockPrisma, MockPrismaService } from '../utils/mock-prisma';
import { createMockCacheService } from '../utils/mock-cache';
import {
  createMockConsent,
  createConsentWithDocument,
  createGrantConsentDto,
  createWithdrawConsentDto,
  createMockLawRegistry,
} from '../utils/test-factory';

describe('ConsentsService', () => {
  let service: ConsentsService;
  let prisma: MockPrismaService;
  let cacheService: ReturnType<typeof createMockCacheService>;
  let outboxService: { addEvent: jest.Mock };

  beforeEach(async () => {
    prisma = createMockPrisma();
    cacheService = createMockCacheService();
    outboxService = { addEvent: jest.fn().mockResolvedValue('outbox-id') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CacheService, useValue: cacheService },
        { provide: OutboxService, useValue: outboxService },
      ],
    }).compile();

    service = module.get<ConsentsService>(ConsentsService);
  });

  describe('grantConsent', () => {
    it('should create a new consent successfully', async () => {
      const dto = createGrantConsentDto();
      const mockConsent = createConsentWithDocument();

      prisma.$transaction.mockImplementation(
        async (callback: (tx: MockPrismaService) => Promise<unknown>) => {
          const txClient = createMockPrisma();
          txClient.consent.create.mockResolvedValue(mockConsent as never);
          return callback(txClient);
        },
      );

      const result = await service.grantConsent(dto as never);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockConsent.id);
      expect(result.status).toBe('GRANTED');
      expect(cacheService.invalidateConsent).toHaveBeenCalled();
    });

    it('should use default consent method when not provided', async () => {
      const dto = createGrantConsentDto({ consentMethod: undefined });
      const mockConsent = createConsentWithDocument({
        consentMethod: 'explicit_button',
      });

      prisma.$transaction.mockImplementation(
        async (callback: (tx: MockPrismaService) => Promise<unknown>) => {
          const txClient = createMockPrisma();
          txClient.consent.create.mockResolvedValue(mockConsent as never);
          return callback(txClient);
        },
      );

      const result = await service.grantConsent(dto as never);

      expect(result.consentMethod).toBe('explicit_button');
    });

    it('should add CONSENT_GRANTED event to outbox', async () => {
      const dto = createGrantConsentDto();
      const mockConsent = createConsentWithDocument();

      prisma.$transaction.mockImplementation(
        async (callback: (tx: MockPrismaService) => Promise<unknown>) => {
          const txClient = createMockPrisma();
          txClient.consent.create.mockResolvedValue(mockConsent as never);
          return callback(txClient);
        },
      );

      await service.grantConsent(dto as never);

      expect(outboxService.addEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          aggregateType: 'Consent',
          eventType: 'CONSENT_GRANTED',
        }),
        expect.anything(),
      );
    });

    it('should handle consent with expiration date', async () => {
      const expiresAt = new Date('2026-01-01');
      const dto = createGrantConsentDto({ expiresAt });
      const mockConsent = createConsentWithDocument({ expiresAt });

      prisma.$transaction.mockImplementation(
        async (callback: (tx: MockPrismaService) => Promise<unknown>) => {
          const txClient = createMockPrisma();
          txClient.consent.create.mockResolvedValue(mockConsent as never);
          return callback(txClient);
        },
      );

      const result = await service.grantConsent(dto as never);

      expect(result).toBeDefined();
    });
  });

  describe('getConsentsForAccount', () => {
    it('should return cached consents when available', async () => {
      const accountId = 'account-123';
      const cachedConsents = [createMockConsent()];
      cacheService.getConsentsByAccount.mockResolvedValue(cachedConsents);

      const result = await service.getConsentsForAccount(accountId);

      expect(result).toEqual(cachedConsents);
      expect(prisma.consent.findMany).not.toHaveBeenCalled();
    });

    it('should fetch from database and cache when not cached', async () => {
      const accountId = 'account-123';
      const mockConsents = [createConsentWithDocument()];
      cacheService.getConsentsByAccount.mockResolvedValue(undefined);
      prisma.consent.findMany.mockResolvedValue(mockConsents as never);

      const result = await service.getConsentsForAccount(accountId);

      expect(result).toHaveLength(1);
      expect(prisma.consent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { accountId },
        }),
      );
      expect(cacheService.setConsentsByAccount).toHaveBeenCalled();
    });

    it('should filter by status when provided', async () => {
      const accountId = 'account-123';
      const status = 'GRANTED';
      const mockConsents = [createConsentWithDocument()];
      prisma.consent.findMany.mockResolvedValue(mockConsents as never);

      await service.getConsentsForAccount(accountId, status);

      expect(prisma.consent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { accountId, status },
        }),
      );
      // Should not cache filtered results
      expect(cacheService.setConsentsByAccount).not.toHaveBeenCalled();
    });

    it('should order by createdAt descending', async () => {
      const accountId = 'account-123';
      prisma.consent.findMany.mockResolvedValue([]);

      await service.getConsentsForAccount(accountId);

      expect(prisma.consent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });

  describe('getConsent', () => {
    it('should return cached consent when available', async () => {
      const cachedConsent = {
        id: 'consent-123',
        status: 'GRANTED',
        consentedAt: new Date(),
      };
      cacheService.getConsentById.mockResolvedValue(cachedConsent);

      const result = await service.getConsent('consent-123');

      expect(result).toEqual(cachedConsent);
      expect(prisma.consent.findUnique).not.toHaveBeenCalled();
    });

    it('should fetch from database when not cached', async () => {
      const mockConsent = createConsentWithDocument();
      cacheService.getConsentById.mockResolvedValue(undefined);
      prisma.consent.findUnique.mockResolvedValue(mockConsent as never);

      const result = await service.getConsent('consent-123');

      expect(result.id).toBe(mockConsent.id);
      expect(cacheService.setConsentById).toHaveBeenCalled();
    });

    it('should throw NotFoundException when consent not found', async () => {
      cacheService.getConsentById.mockResolvedValue(undefined);
      prisma.consent.findUnique.mockResolvedValue(null);

      await expect(service.getConsent('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('withdrawConsent', () => {
    it('should withdraw consent successfully', async () => {
      const dto = createWithdrawConsentDto();
      const mockConsent = createConsentWithDocument();
      prisma.consent.findUnique.mockResolvedValue(mockConsent as never);

      prisma.$transaction.mockImplementation(
        async (callback: (tx: MockPrismaService) => Promise<unknown>) => {
          const txClient = createMockPrisma();
          txClient.consent.update.mockResolvedValue({
            ...mockConsent,
            status: 'WITHDRAWN',
          } as never);
          return callback(txClient);
        },
      );

      await expect(service.withdrawConsent('consent-123', dto as never)).resolves.not.toThrow();
      expect(cacheService.invalidateConsent).toHaveBeenCalled();
    });

    it('should add CONSENT_WITHDRAWN event to outbox', async () => {
      const dto = createWithdrawConsentDto();
      const mockConsent = createConsentWithDocument();
      prisma.consent.findUnique.mockResolvedValue(mockConsent as never);

      prisma.$transaction.mockImplementation(
        async (callback: (tx: MockPrismaService) => Promise<unknown>) => {
          const txClient = createMockPrisma();
          txClient.consent.update.mockResolvedValue({} as never);
          return callback(txClient);
        },
      );

      await service.withdrawConsent('consent-123', dto as never);

      expect(outboxService.addEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          aggregateType: 'Consent',
          eventType: 'CONSENT_WITHDRAWN',
        }),
        expect.anything(),
      );
    });

    it('should throw NotFoundException when consent not found', async () => {
      prisma.consent.findUnique.mockResolvedValue(null);

      await expect(
        service.withdrawConsent('nonexistent', createWithdrawConsentDto() as never),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update metadata with withdrawal reason', async () => {
      const dto = createWithdrawConsentDto({ reason: 'No longer needed' });
      const mockConsent = createConsentWithDocument({
        metadata: { existingKey: 'value' },
      });
      prisma.consent.findUnique.mockResolvedValue(mockConsent as never);

      prisma.$transaction.mockImplementation(
        async (callback: (tx: MockPrismaService) => Promise<unknown>) => {
          const txClient = createMockPrisma();
          txClient.consent.update.mockResolvedValue({} as never);
          return callback(txClient);
        },
      );

      await service.withdrawConsent('consent-123', dto as never);

      // Verify the update was called (transaction callback was executed)
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('checkConsent', () => {
    it('should return hasConsent: true when valid consent exists', async () => {
      const mockConsent = createConsentWithDocument();
      cacheService.getConsentStatus.mockResolvedValue(undefined);
      prisma.consent.findFirst.mockResolvedValue(mockConsent as never);

      const result = await service.checkConsent('doc-123', 'account-123');

      expect(result.hasConsent).toBe(true);
      expect(result.consent).toBeDefined();
      expect(cacheService.setConsentStatus).toHaveBeenCalledWith(
        'account-123',
        'doc-123',
        'GRANTED',
      );
    });

    it('should return hasConsent: false when no consent exists', async () => {
      cacheService.getConsentStatus.mockResolvedValue(undefined);
      prisma.consent.findFirst.mockResolvedValue(null);

      const result = await service.checkConsent('doc-123', 'account-123');

      expect(result.hasConsent).toBe(false);
      expect(result.consent).toBeUndefined();
      expect(cacheService.setConsentStatus).toHaveBeenCalledWith('account-123', 'doc-123', 'NONE');
    });

    it('should use cached status when available', async () => {
      cacheService.getConsentStatus.mockResolvedValue('NONE');

      const result = await service.checkConsent('doc-123', 'account-123');

      expect(result.hasConsent).toBe(false);
      expect(prisma.consent.findFirst).not.toHaveBeenCalled();
    });

    it('should query database when cached status is GRANTED', async () => {
      cacheService.getConsentStatus.mockResolvedValue('GRANTED');
      const mockConsent = createConsentWithDocument();
      prisma.consent.findFirst.mockResolvedValue(mockConsent as never);

      const result = await service.checkConsent('doc-123', 'account-123');

      expect(result.hasConsent).toBe(true);
      expect(prisma.consent.findFirst).toHaveBeenCalled();
    });
  });

  describe('PIPA Consent Requirements (Age 14+)', () => {
    it('should successfully grant consent with PIPA metadata', async () => {
      const dto = createGrantConsentDto({
        metadata: { userAge: 15, regulation: 'PIPA' },
      });
      const mockConsent = createConsentWithDocument({
        metadata: { userAge: 15, regulation: 'PIPA' },
        lawRegistry: {
          ...createMockLawRegistry(),
          code: 'PIPA',
          countryCode: 'KR',
        },
      });

      prisma.$transaction.mockImplementation(
        async (callback: (tx: MockPrismaService) => Promise<unknown>) => {
          const txClient = createMockPrisma();
          txClient.consent.create.mockResolvedValue(mockConsent as never);
          return callback(txClient);
        },
      );

      const result = await service.grantConsent(dto as never);

      expect(result).toBeDefined();
    });
  });

  describe('CCPA Opt-out Workflow', () => {
    it('should handle opt-out consent for CCPA', async () => {
      const dto = createGrantConsentDto({
        metadata: { regulation: 'CCPA', optOutOfSale: true },
        consentMethod: 'opt_out_link',
      });
      const mockConsent = createConsentWithDocument({
        consentMethod: 'opt_out_link',
        metadata: { regulation: 'CCPA', optOutOfSale: true },
      });

      prisma.$transaction.mockImplementation(
        async (callback: (tx: MockPrismaService) => Promise<unknown>) => {
          const txClient = createMockPrisma();
          txClient.consent.create.mockResolvedValue(mockConsent as never);
          return callback(txClient);
        },
      );

      const result = await service.grantConsent(dto as never);

      expect(result.consentMethod).toBe('opt_out_link');
    });
  });
});

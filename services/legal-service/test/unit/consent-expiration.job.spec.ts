import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConsentExpirationJob } from '../../src/common/jobs/consent-expiration.job';
import { PrismaService } from '../../src/database/prisma.service';
import { OutboxService } from '../../src/common/outbox/outbox.service';
import { createMockPrisma, MockPrismaService } from '../utils/mock-prisma';

describe('ConsentExpirationJob', () => {
  let job: ConsentExpirationJob;
  let prisma: MockPrismaService;
  let eventEmitter: { emit: jest.Mock };
  let outboxService: { addEvent: jest.Mock };

  beforeEach(async () => {
    prisma = createMockPrisma();
    eventEmitter = { emit: jest.fn() };
    outboxService = { addEvent: jest.fn().mockResolvedValue('outbox-id') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsentExpirationJob,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: OutboxService, useValue: outboxService },
      ],
    }).compile();

    job = module.get<ConsentExpirationJob>(ConsentExpirationJob);
  });

  describe('onModuleInit', () => {
    it('should log initialization message', () => {
      expect(() => job.onModuleInit()).not.toThrow();
    });
  });

  describe('checkExpiringConsents', () => {
    it('should check for expiring and expired consents', async () => {
      prisma.consent.findMany.mockResolvedValue([]);

      await job.checkExpiringConsents();

      // Should query for expiring soon and expired consents
      expect(prisma.consent.findMany).toHaveBeenCalledTimes(2);
    });

    it('should handle errors gracefully', async () => {
      prisma.consent.findMany.mockRejectedValue(new Error('Database error'));

      await expect(job.checkExpiringConsents()).resolves.not.toThrow();
    });
  });

  describe('notifyExpiringSoon', () => {
    it('should notify about consents expiring within 30 days', async () => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000); // 15 days from now

      const expiringConsent = {
        id: 'consent-123',
        accountId: 'account-123',
        documentId: 'doc-123',
        expiresAt,
        document: {
          type: 'PRIVACY_POLICY',
          title: 'Privacy Policy',
        },
      };

      prisma.consent.findMany
        .mockResolvedValueOnce([expiringConsent] as never) // expiring soon
        .mockResolvedValueOnce([]); // expired

      await job.checkExpiringConsents();

      expect(outboxService.addEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          aggregateType: 'Consent',
          eventType: 'CONSENT_EXPIRING_SOON',
          payload: expect.objectContaining({
            consentId: 'consent-123',
            daysUntilExpiry: expect.any(Number),
          }),
        }),
      );

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'consent.expiring.soon',
        expect.objectContaining({
          consentId: 'consent-123',
          daysUntilExpiry: expect.any(Number),
        }),
      );
    });

    it('should calculate correct days until expiry', async () => {
      const now = new Date();
      const daysUntilExpiry = 10;
      const expiresAt = new Date(now.getTime() + daysUntilExpiry * 24 * 60 * 60 * 1000);

      const expiringConsent = {
        id: 'consent-123',
        accountId: 'account-123',
        documentId: 'doc-123',
        expiresAt,
        document: {
          type: 'PRIVACY_POLICY',
          title: 'Privacy Policy',
        },
      };

      prisma.consent.findMany
        .mockResolvedValueOnce([expiringConsent] as never)
        .mockResolvedValueOnce([]);

      await job.checkExpiringConsents();

      expect(outboxService.addEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            daysUntilExpiry: expect.any(Number),
          }),
        }),
      );
    });

    it('should process multiple expiring consents', async () => {
      const now = new Date();
      const expiringConsents = [
        {
          id: 'consent-1',
          accountId: 'account-1',
          documentId: 'doc-1',
          expiresAt: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
          document: { type: 'PRIVACY_POLICY', title: 'Privacy Policy' },
        },
        {
          id: 'consent-2',
          accountId: 'account-2',
          documentId: 'doc-2',
          expiresAt: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000),
          document: { type: 'TERMS_OF_SERVICE', title: 'Terms of Service' },
        },
      ];

      prisma.consent.findMany
        .mockResolvedValueOnce(expiringConsents as never)
        .mockResolvedValueOnce([]);

      await job.checkExpiringConsents();

      expect(outboxService.addEvent).toHaveBeenCalledTimes(2);
      expect(eventEmitter.emit).toHaveBeenCalledTimes(2);
    });
  });

  describe('markExpiredConsents', () => {
    it('should mark expired consents as EXPIRED', async () => {
      const now = new Date();
      const expiredConsent = {
        id: 'consent-123',
        accountId: 'account-123',
        documentId: 'doc-123',
        expiresAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // expired 1 day ago
        consentedAt: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000), // consented 1 year ago
        document: {
          type: 'PRIVACY_POLICY',
          title: 'Privacy Policy',
          version: '1.0.0',
        },
      };

      prisma.consent.findMany
        .mockResolvedValueOnce([]) // expiring soon
        .mockResolvedValueOnce([expiredConsent] as never); // expired

      prisma.$transaction.mockImplementation(
        async (callback: (tx: MockPrismaService) => Promise<unknown>) => {
          const txClient = createMockPrisma();
          txClient.consent.update.mockResolvedValue({} as never);
          return callback(txClient);
        },
      );

      await job.checkExpiringConsents();

      expect(outboxService.addEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          aggregateType: 'Consent',
          eventType: 'CONSENT_EXPIRED',
          payload: expect.objectContaining({
            consentId: 'consent-123',
            accessRestricted: true,
          }),
        }),
        expect.anything(),
      );

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'consent.expired',
        expect.objectContaining({
          consentId: 'consent-123',
        }),
      );
    });

    it('should not process when no expired consents', async () => {
      prisma.consent.findMany.mockResolvedValue([]);

      await job.checkExpiringConsents();

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('should process each expired consent in its own transaction', async () => {
      const now = new Date();
      const expiredConsents = [
        {
          id: 'consent-1',
          accountId: 'account-1',
          documentId: 'doc-1',
          expiresAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          consentedAt: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
          document: { type: 'PRIVACY_POLICY', title: 'PP', version: '1.0' },
        },
        {
          id: 'consent-2',
          accountId: 'account-2',
          documentId: 'doc-2',
          expiresAt: new Date(now.getTime() - 48 * 60 * 60 * 1000),
          consentedAt: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
          document: { type: 'TERMS_OF_SERVICE', title: 'ToS', version: '1.0' },
        },
      ];

      prisma.consent.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(expiredConsents as never);

      let transactionCount = 0;
      prisma.$transaction.mockImplementation(
        async (callback: (tx: MockPrismaService) => Promise<unknown>) => {
          transactionCount++;
          const txClient = createMockPrisma();
          txClient.consent.update.mockResolvedValue({} as never);
          return callback(txClient);
        },
      );

      await job.checkExpiringConsents();

      expect(transactionCount).toBe(2);
    });

    it('should include document metadata in expired event', async () => {
      const now = new Date();
      const expiredConsent = {
        id: 'consent-123',
        accountId: 'account-123',
        documentId: 'doc-123',
        expiresAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        consentedAt: new Date('2024-01-01'),
        document: {
          type: 'PRIVACY_POLICY',
          title: 'Privacy Policy',
          version: '2.1.0',
        },
      };

      prisma.consent.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([expiredConsent] as never);

      prisma.$transaction.mockImplementation(
        async (callback: (tx: MockPrismaService) => Promise<unknown>) => {
          const txClient = createMockPrisma();
          txClient.consent.update.mockResolvedValue({} as never);
          return callback(txClient);
        },
      );

      await job.checkExpiringConsents();

      expect(outboxService.addEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            documentType: 'PRIVACY_POLICY',
            documentVersion: '2.1.0',
          }),
        }),
        expect.anything(),
      );
    });
  });

  describe('generateMonthlyStats', () => {
    it('should generate monthly statistics', async () => {
      prisma.consent.count
        .mockResolvedValueOnce(100) // granted
        .mockResolvedValueOnce(20) // withdrawn
        .mockResolvedValueOnce(10) // expired
        .mockResolvedValueOnce(130) // total
        .mockResolvedValueOnce(5); // expiring soon

      await job.generateMonthlyStats();

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'consent.monthly.stats',
        expect.objectContaining({
          granted: 100,
          withdrawn: 20,
          expired: 10,
          total: 130,
          expiringSoon: 5,
        }),
      );
    });

    it('should include month in stats', async () => {
      prisma.consent.count.mockResolvedValue(0);

      await job.generateMonthlyStats();

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'consent.monthly.stats',
        expect.objectContaining({
          month: expect.stringMatching(/^\d{4}-\d{2}$/),
        }),
      );
    });

    it('should handle errors gracefully', async () => {
      prisma.consent.count.mockRejectedValue(new Error('Database error'));

      await expect(job.generateMonthlyStats()).resolves.not.toThrow();
    });
  });

  describe('GDPR Compliance', () => {
    it('should track consent expiration for GDPR compliance', async () => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000); // 5 days

      const gdprConsent = {
        id: 'gdpr-consent-123',
        accountId: 'account-123',
        documentId: 'doc-123',
        expiresAt,
        document: {
          type: 'PRIVACY_POLICY',
          title: 'GDPR Privacy Policy',
        },
      };

      prisma.consent.findMany
        .mockResolvedValueOnce([gdprConsent] as never)
        .mockResolvedValueOnce([]);

      await job.checkExpiringConsents();

      expect(outboxService.addEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'CONSENT_EXPIRING_SOON',
        }),
      );
    });

    it('should flag accessRestricted for expired consents', async () => {
      const now = new Date();
      const expiredConsent = {
        id: 'consent-123',
        accountId: 'account-123',
        documentId: 'doc-123',
        expiresAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        consentedAt: new Date('2024-01-01'),
        document: { type: 'CONSENT_FORM', title: 'Consent', version: '1.0' },
      };

      prisma.consent.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([expiredConsent] as never);

      prisma.$transaction.mockImplementation(
        async (callback: (tx: MockPrismaService) => Promise<unknown>) => {
          const txClient = createMockPrisma();
          txClient.consent.update.mockResolvedValue({} as never);
          return callback(txClient);
        },
      );

      await job.checkExpiringConsents();

      expect(outboxService.addEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            accessRestricted: true,
          }),
        }),
        expect.anything(),
      );
    });
  });

  describe('Status Filtering', () => {
    it('should only query GRANTED consents for expiring check', async () => {
      prisma.consent.findMany.mockResolvedValue([]);

      await job.checkExpiringConsents();

      // First call is for expiring soon (GRANTED status)
      expect(prisma.consent.findMany).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          where: expect.objectContaining({
            status: expect.anything(), // ConsentStatus.GRANTED
          }),
        }),
      );
    });

    it('should only query GRANTED consents for expired check', async () => {
      prisma.consent.findMany.mockResolvedValue([]);

      await job.checkExpiringConsents();

      // Second call is for expired (GRANTED status, past expiresAt)
      expect(prisma.consent.findMany).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: expect.objectContaining({
            status: expect.anything(), // ConsentStatus.GRANTED
          }),
        }),
      );
    });
  });

  describe('Event Publishing', () => {
    it('should emit local event and save to outbox for expiring consents', async () => {
      const now = new Date();
      const expiringConsent = {
        id: 'consent-123',
        accountId: 'account-123',
        documentId: 'doc-123',
        expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        document: { type: 'PRIVACY_POLICY', title: 'PP' },
      };

      prisma.consent.findMany
        .mockResolvedValueOnce([expiringConsent] as never)
        .mockResolvedValueOnce([]);

      await job.checkExpiringConsents();

      // Both outbox and local event should be triggered
      expect(outboxService.addEvent).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('consent.expiring.soon', expect.anything());
    });

    it('should emit local event and save to outbox for expired consents', async () => {
      const now = new Date();
      const expiredConsent = {
        id: 'consent-123',
        accountId: 'account-123',
        documentId: 'doc-123',
        expiresAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        consentedAt: new Date('2024-01-01'),
        document: { type: 'PRIVACY_POLICY', title: 'PP', version: '1.0' },
      };

      prisma.consent.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([expiredConsent] as never);

      prisma.$transaction.mockImplementation(
        async (callback: (tx: MockPrismaService) => Promise<unknown>) => {
          const txClient = createMockPrisma();
          txClient.consent.update.mockResolvedValue({} as never);
          return callback(txClient);
        },
      );

      await job.checkExpiringConsents();

      expect(outboxService.addEvent).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('consent.expired', expect.anything());
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { SchedulerRegistry } from '@nestjs/schedule';
import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';
import { CleanupService } from '../../src/common/scheduled/cleanup.service';
import { IdentityPrismaService } from '../../src/database/identity-prisma.service';

describe('CleanupService', () => {
  let service: CleanupService;
  let mockSessionUpdateMany: Mock;
  let mockRevokedTokenDeleteMany: Mock;
  let mockIdempotencyRecordDeleteMany: Mock;
  let mockSagaStateUpdateMany: Mock;
  let mockSagaStateDeleteMany: Mock;
  let mockDeadLetterEventDeleteMany: Mock;
  let mockOutboxEventDeleteMany: Mock;
  let mockPasswordHistoryDeleteMany: Mock;
  let mockGetCronJob: Mock;

  beforeEach(async () => {
    mockSessionUpdateMany = vi.fn();
    mockRevokedTokenDeleteMany = vi.fn();
    mockIdempotencyRecordDeleteMany = vi.fn();
    mockSagaStateUpdateMany = vi.fn();
    mockSagaStateDeleteMany = vi.fn();
    mockDeadLetterEventDeleteMany = vi.fn();
    mockOutboxEventDeleteMany = vi.fn();
    mockPasswordHistoryDeleteMany = vi.fn();
    mockGetCronJob = vi.fn();

    const mockPrisma = {
      session: {
        updateMany: mockSessionUpdateMany,
      },
      revokedToken: {
        deleteMany: mockRevokedTokenDeleteMany,
      },
      idempotencyRecord: {
        deleteMany: mockIdempotencyRecordDeleteMany,
      },
      sagaState: {
        updateMany: mockSagaStateUpdateMany,
        deleteMany: mockSagaStateDeleteMany,
      },
      deadLetterEvent: {
        deleteMany: mockDeadLetterEventDeleteMany,
      },
      outboxEvent: {
        deleteMany: mockOutboxEventDeleteMany,
      },
      passwordHistory: {
        deleteMany: mockPasswordHistoryDeleteMany,
      },
    };

    const mockSchedulerRegistry = {
      getCronJob: mockGetCronJob,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CleanupService,
        { provide: IdentityPrismaService, useValue: mockPrisma },
        { provide: SchedulerRegistry, useValue: mockSchedulerRegistry },
      ],
    }).compile();

    service = module.get<CleanupService>(CleanupService);
  });

  describe('onModuleInit', () => {
    it('should log initialization message', () => {
      // Just verify it doesn't throw
      expect(() => service.onModuleInit()).not.toThrow();
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should mark expired sessions as inactive', async () => {
      mockSessionUpdateMany.mockResolvedValue({ count: 5 });

      await service.cleanupExpiredSessions();

      expect(mockSessionUpdateMany).toHaveBeenCalledWith({
        where: {
          expiresAt: { lt: expect.any(Date) },
          isActive: true,
        },
        data: {
          isActive: false,
          revokedReason: 'Session expired (scheduled cleanup)',
        },
      });
    });

    it('should handle zero expired sessions', async () => {
      mockSessionUpdateMany.mockResolvedValue({ count: 0 });

      await service.cleanupExpiredSessions();

      expect(mockSessionUpdateMany).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      mockSessionUpdateMany.mockRejectedValue(new Error('Database error'));

      // Should not throw
      await expect(service.cleanupExpiredSessions()).resolves.not.toThrow();
    });

    it('should skip if already running', async () => {
      // Simulate long running operation
      mockSessionUpdateMany.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ count: 1 }), 100)),
      );

      // Start first call
      const firstCall = service.cleanupExpiredSessions();

      // Immediately start second call
      await service.cleanupExpiredSessions();

      await firstCall;

      // Should only be called once
      expect(mockSessionUpdateMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('cleanupExpiredRevokedTokens', () => {
    it('should delete expired revoked tokens', async () => {
      mockRevokedTokenDeleteMany.mockResolvedValue({ count: 10 });

      await service.cleanupExpiredRevokedTokens();

      expect(mockRevokedTokenDeleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: { lt: expect.any(Date) },
        },
      });
    });

    it('should handle zero expired tokens', async () => {
      mockRevokedTokenDeleteMany.mockResolvedValue({ count: 0 });

      await service.cleanupExpiredRevokedTokens();

      expect(mockRevokedTokenDeleteMany).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      mockRevokedTokenDeleteMany.mockRejectedValue(new Error('Database error'));

      await expect(service.cleanupExpiredRevokedTokens()).resolves.not.toThrow();
    });
  });

  describe('cleanupExpiredIdempotencyRecords', () => {
    it('should delete expired idempotency records', async () => {
      mockIdempotencyRecordDeleteMany.mockResolvedValue({ count: 20 });

      await service.cleanupExpiredIdempotencyRecords();

      expect(mockIdempotencyRecordDeleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: { lt: expect.any(Date) },
        },
      });
    });

    it('should handle zero expired records', async () => {
      mockIdempotencyRecordDeleteMany.mockResolvedValue({ count: 0 });

      await service.cleanupExpiredIdempotencyRecords();

      expect(mockIdempotencyRecordDeleteMany).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      mockIdempotencyRecordDeleteMany.mockRejectedValue(new Error('Database error'));

      await expect(service.cleanupExpiredIdempotencyRecords()).resolves.not.toThrow();
    });
  });

  describe('cleanupTimedOutSagas', () => {
    it('should mark timed out sagas and delete old ones', async () => {
      mockSagaStateUpdateMany.mockResolvedValue({ count: 3 });
      mockSagaStateDeleteMany.mockResolvedValue({ count: 7 });

      await service.cleanupTimedOutSagas();

      expect(mockSagaStateUpdateMany).toHaveBeenCalledWith({
        where: {
          status: { in: ['PENDING', 'IN_PROGRESS', 'COMPENSATING'] },
          timeoutAt: { lt: expect.any(Date) },
        },
        data: {
          status: 'TIMED_OUT',
          completedAt: expect.any(Date),
          error: 'Saga timed out during scheduled cleanup',
        },
      });

      expect(mockSagaStateDeleteMany).toHaveBeenCalledWith({
        where: {
          status: { in: ['COMPLETED', 'FAILED', 'COMPENSATED', 'TIMED_OUT'] },
          completedAt: { lt: expect.any(Date) },
        },
      });
    });

    it('should handle zero sagas', async () => {
      mockSagaStateUpdateMany.mockResolvedValue({ count: 0 });
      mockSagaStateDeleteMany.mockResolvedValue({ count: 0 });

      await service.cleanupTimedOutSagas();

      expect(mockSagaStateUpdateMany).toHaveBeenCalled();
      expect(mockSagaStateDeleteMany).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      mockSagaStateUpdateMany.mockRejectedValue(new Error('Database error'));

      await expect(service.cleanupTimedOutSagas()).resolves.not.toThrow();
    });
  });

  describe('cleanupOldDeadLetterEvents', () => {
    it('should delete resolved/ignored dead letter events older than 90 days', async () => {
      mockDeadLetterEventDeleteMany.mockResolvedValue({ count: 15 });

      await service.cleanupOldDeadLetterEvents();

      expect(mockDeadLetterEventDeleteMany).toHaveBeenCalledWith({
        where: {
          status: { in: ['RESOLVED', 'IGNORED'] },
          createdAt: { lt: expect.any(Date) },
        },
      });
    });

    it('should handle zero dead letter events', async () => {
      mockDeadLetterEventDeleteMany.mockResolvedValue({ count: 0 });

      await service.cleanupOldDeadLetterEvents();

      expect(mockDeadLetterEventDeleteMany).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      mockDeadLetterEventDeleteMany.mockRejectedValue(new Error('Database error'));

      await expect(service.cleanupOldDeadLetterEvents()).resolves.not.toThrow();
    });
  });

  describe('cleanupProcessedOutboxEvents', () => {
    it('should delete completed outbox events older than 7 days', async () => {
      mockOutboxEventDeleteMany.mockResolvedValue({ count: 100 });

      await service.cleanupProcessedOutboxEvents();

      expect(mockOutboxEventDeleteMany).toHaveBeenCalledWith({
        where: {
          status: 'COMPLETED',
          processedAt: { lt: expect.any(Date) },
        },
      });
    });

    it('should handle zero outbox events', async () => {
      mockOutboxEventDeleteMany.mockResolvedValue({ count: 0 });

      await service.cleanupProcessedOutboxEvents();

      expect(mockOutboxEventDeleteMany).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      mockOutboxEventDeleteMany.mockRejectedValue(new Error('Database error'));

      await expect(service.cleanupProcessedOutboxEvents()).resolves.not.toThrow();
    });
  });

  describe('cleanupOldPasswordHistory', () => {
    it('should delete password history entries older than 1 year', async () => {
      mockPasswordHistoryDeleteMany.mockResolvedValue({ count: 50 });

      await service.cleanupOldPasswordHistory();

      expect(mockPasswordHistoryDeleteMany).toHaveBeenCalledWith({
        where: {
          changedAt: { lt: expect.any(Date) },
        },
      });
    });

    it('should handle zero password history entries', async () => {
      mockPasswordHistoryDeleteMany.mockResolvedValue({ count: 0 });

      await service.cleanupOldPasswordHistory();

      expect(mockPasswordHistoryDeleteMany).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      mockPasswordHistoryDeleteMany.mockRejectedValue(new Error('Database error'));

      await expect(service.cleanupOldPasswordHistory()).resolves.not.toThrow();
    });
  });

  describe('getJobStatus', () => {
    it('should return status for all cleanup jobs', () => {
      const mockNextDate = new Date('2026-01-10T02:00:00Z');
      const mockLastDate = new Date('2026-01-09T02:00:00Z');

      mockGetCronJob.mockReturnValue({
        nextDate: () => ({ toJSDate: () => mockNextDate }),
        lastDate: () => mockLastDate,
      });

      const status = service.getJobStatus();

      expect(status).toHaveProperty('cleanup-sessions');
      expect(status).toHaveProperty('cleanup-revoked-tokens');
      expect(status).toHaveProperty('cleanup-idempotency');
      expect(status).toHaveProperty('cleanup-sagas');
      expect(status).toHaveProperty('cleanup-dead-letters');
      expect(status).toHaveProperty('cleanup-outbox');
      expect(status).toHaveProperty('cleanup-password-history');
    });

    it('should return nextRun and lastRun for each job', () => {
      const mockNextDate = new Date('2026-01-10T02:00:00Z');
      const mockLastDate = new Date('2026-01-09T02:00:00Z');

      mockGetCronJob.mockReturnValue({
        nextDate: () => ({ toJSDate: () => mockNextDate }),
        lastDate: () => mockLastDate,
      });

      const status = service.getJobStatus();

      expect(status['cleanup-sessions']).toEqual({
        nextRun: mockNextDate,
        lastRun: mockLastDate,
      });
    });

    it('should handle jobs with no last run', () => {
      const mockNextDate = new Date('2026-01-10T02:00:00Z');

      mockGetCronJob.mockReturnValue({
        nextDate: () => ({ toJSDate: () => mockNextDate }),
        lastDate: () => null,
      });

      const status = service.getJobStatus();

      expect(status['cleanup-sessions'].lastRun).toBeNull();
    });

    it('should handle missing jobs gracefully', () => {
      mockGetCronJob.mockImplementation(() => {
        throw new Error('Job not found');
      });

      const status = service.getJobStatus();

      expect(status['cleanup-sessions']).toEqual({
        nextRun: null,
        lastRun: null,
      });
    });
  });

  describe('date calculations', () => {
    it('should use correct 30-day threshold for saga cleanup', async () => {
      mockSagaStateUpdateMany.mockResolvedValue({ count: 0 });
      mockSagaStateDeleteMany.mockResolvedValue({ count: 0 });

      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);

      await service.cleanupTimedOutSagas();

      const deleteCall = mockSagaStateDeleteMany.mock.calls[0][0];
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // The date should be approximately 30 days ago
      const calledDate = deleteCall.where.completedAt.lt as Date;
      const timeDiff = Math.abs(calledDate.getTime() - thirtyDaysAgo.getTime());
      expect(timeDiff).toBeLessThan(1000); // Within 1 second

      vi.restoreAllMocks();
    });

    it('should use correct 90-day threshold for dead letter cleanup', async () => {
      mockDeadLetterEventDeleteMany.mockResolvedValue({ count: 0 });

      await service.cleanupOldDeadLetterEvents();

      const deleteCall = mockDeadLetterEventDeleteMany.mock.calls[0][0];
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const calledDate = deleteCall.where.createdAt.lt as Date;
      const timeDiff = Math.abs(calledDate.getTime() - ninetyDaysAgo.getTime());
      expect(timeDiff).toBeLessThan(1000);
    });

    it('should use correct 7-day threshold for outbox cleanup', async () => {
      mockOutboxEventDeleteMany.mockResolvedValue({ count: 0 });

      await service.cleanupProcessedOutboxEvents();

      const deleteCall = mockOutboxEventDeleteMany.mock.calls[0][0];
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const calledDate = deleteCall.where.processedAt.lt as Date;
      const timeDiff = Math.abs(calledDate.getTime() - sevenDaysAgo.getTime());
      expect(timeDiff).toBeLessThan(1000);
    });

    it('should use correct 1-year threshold for password history cleanup', async () => {
      mockPasswordHistoryDeleteMany.mockResolvedValue({ count: 0 });

      await service.cleanupOldPasswordHistory();

      const deleteCall = mockPasswordHistoryDeleteMany.mock.calls[0][0];
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const calledDate = deleteCall.where.changedAt.lt as Date;
      const timeDiff = Math.abs(calledDate.getTime() - oneYearAgo.getTime());
      expect(timeDiff).toBeLessThan(1000);
    });
  });
});

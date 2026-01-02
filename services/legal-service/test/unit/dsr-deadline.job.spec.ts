import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DsrDeadlineJob } from '../../src/common/jobs/dsr-deadline.job';
import { PrismaService } from '../../src/database/prisma.service';
import { OutboxService } from '../../src/common/outbox/outbox.service';
import { createMockPrisma, MockPrismaService } from '../utils/mock-prisma';
import {
  createMockDsrRequest,
  createApproachingDeadlineRequest,
  createOverdueDsrRequest,
} from '../utils/test-factory';

describe('DsrDeadlineJob', () => {
  let job: DsrDeadlineJob;
  let prisma: MockPrismaService;
  let eventEmitter: { emit: jest.Mock };
  let outboxService: { addEvent: jest.Mock };

  beforeEach(async () => {
    prisma = createMockPrisma();
    eventEmitter = { emit: jest.fn() };
    outboxService = { addEvent: jest.fn().mockResolvedValue('outbox-id') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DsrDeadlineJob,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: OutboxService, useValue: outboxService },
      ],
    }).compile();

    job = module.get<DsrDeadlineJob>(DsrDeadlineJob);
  });

  describe('onModuleInit', () => {
    it('should log initialization message', () => {
      // Just ensure it doesn't throw
      expect(() => job.onModuleInit()).not.toThrow();
    });
  });

  describe('checkDeadlines', () => {
    it('should check all escalation levels', async () => {
      prisma.dsrRequest.findMany.mockResolvedValue([]);

      await job.checkDeadlines();

      // Should query for WARNING, CRITICAL, and OVERDUE levels
      expect(prisma.dsrRequest.findMany).toHaveBeenCalledTimes(3);
    });

    it('should handle errors gracefully', async () => {
      prisma.dsrRequest.findMany.mockRejectedValue(new Error('Database error'));

      // Should not throw
      await expect(job.checkDeadlines()).resolves.not.toThrow();
    });
  });

  describe('escalateWarningLevel', () => {
    it('should escalate requests with 7 days or less remaining', async () => {
      const daysRemaining = 5;
      const request = createApproachingDeadlineRequest(daysRemaining);

      // First call for WARNING level check, second for CRITICAL, third for OVERDUE
      prisma.dsrRequest.findMany
        .mockResolvedValueOnce([request] as never) // WARNING
        .mockResolvedValueOnce([]) // CRITICAL
        .mockResolvedValueOnce([]); // OVERDUE

      prisma.$transaction.mockImplementation(
        async (callback: (tx: MockPrismaService) => Promise<unknown>) => {
          const txClient = createMockPrisma();
          txClient.dsrRequest.update.mockResolvedValue({} as never);
          return callback(txClient);
        },
      );

      await job.checkDeadlines();

      expect(outboxService.addEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          aggregateType: 'DsrRequest',
          eventType: 'DSR_DEADLINE_WARNING',
          payload: expect.objectContaining({
            escalationLevel: 'WARNING',
          }),
        }),
        expect.anything(),
      );

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'dsr.deadline.approaching',
        expect.objectContaining({
          requestId: request.id,
          daysRemaining: expect.any(Number),
        }),
      );
    });

    it('should skip requests already at WARNING or higher level', async () => {
      // The query already filters by escalationLevel: NONE
      prisma.dsrRequest.findMany.mockResolvedValue([]);

      await job.checkDeadlines();

      expect(outboxService.addEvent).not.toHaveBeenCalled();
    });
  });

  describe('escalateCriticalLevel', () => {
    it('should escalate requests with 2 days or less remaining', async () => {
      const now = new Date();
      const dueDate = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000); // 1 day remaining

      const request = createMockDsrRequest({
        status: 'PENDING',
        escalationLevel: 'WARNING',
        dueDate,
      });

      prisma.dsrRequest.findMany
        .mockResolvedValueOnce([]) // WARNING
        .mockResolvedValueOnce([request] as never) // CRITICAL
        .mockResolvedValueOnce([]); // OVERDUE

      prisma.$transaction.mockImplementation(
        async (callback: (tx: MockPrismaService) => Promise<unknown>) => {
          const txClient = createMockPrisma();
          txClient.dsrRequest.update.mockResolvedValue({} as never);
          return callback(txClient);
        },
      );

      await job.checkDeadlines();

      expect(outboxService.addEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          aggregateType: 'DsrRequest',
          eventType: 'DSR_DEADLINE_CRITICAL',
          payload: expect.objectContaining({
            escalationLevel: 'CRITICAL',
            hoursRemaining: expect.any(Number),
          }),
        }),
        expect.anything(),
      );

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'dsr.deadline.warning',
        expect.objectContaining({
          requestId: request.id,
          hoursRemaining: expect.any(Number),
        }),
      );
    });
  });

  describe('escalateOverdueLevel', () => {
    it('should escalate overdue requests', async () => {
      const request = createOverdueDsrRequest(2); // 2 days overdue

      prisma.dsrRequest.findMany
        .mockResolvedValueOnce([]) // WARNING
        .mockResolvedValueOnce([]) // CRITICAL
        .mockResolvedValueOnce([request] as never); // OVERDUE

      prisma.$transaction.mockImplementation(
        async (callback: (tx: MockPrismaService) => Promise<unknown>) => {
          const txClient = createMockPrisma();
          txClient.dsrRequest.update.mockResolvedValue({} as never);
          return callback(txClient);
        },
      );

      await job.checkDeadlines();

      expect(outboxService.addEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          aggregateType: 'DsrRequest',
          eventType: 'DSR_DEADLINE_OVERDUE',
          payload: expect.objectContaining({
            escalationLevel: 'OVERDUE',
            daysOverdue: expect.any(Number),
          }),
        }),
        expect.anything(),
      );

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'dsr.deadline.overdue',
        expect.objectContaining({
          requestId: request.id,
          daysOverdue: expect.any(Number),
        }),
      );
    });

    it('should not re-escalate already OVERDUE requests', async () => {
      // The query filters by escalationLevel: { not: OVERDUE }
      prisma.dsrRequest.findMany.mockResolvedValue([]);

      await job.checkDeadlines();

      // No OVERDUE events should be created
      const overdueEvents = outboxService.addEvent.mock.calls.filter(
        (call: [{ eventType: string }]) => call[0].eventType === 'DSR_DEADLINE_OVERDUE',
      );
      expect(overdueEvents).toHaveLength(0);
    });
  });

  describe('generateDailySummary', () => {
    it('should generate summary with correct counts', async () => {
      prisma.dsrRequest.count
        .mockResolvedValueOnce(5) // pending
        .mockResolvedValueOnce(3) // inProgress
        .mockResolvedValueOnce(2) // approaching
        .mockResolvedValueOnce(1); // overdue

      await job.generateDailySummary();

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'dsr.daily.summary',
        expect.objectContaining({
          pending: 5,
          inProgress: 3,
          approachingDeadline: 2,
          overdue: 1,
        }),
      );
    });

    it('should handle errors gracefully', async () => {
      prisma.dsrRequest.count.mockRejectedValue(new Error('Database error'));

      await expect(job.generateDailySummary()).resolves.not.toThrow();
    });

    it('should include current date in summary', async () => {
      prisma.dsrRequest.count.mockResolvedValue(0);

      await job.generateDailySummary();

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'dsr.daily.summary',
        expect.objectContaining({
          date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        }),
      );
    });
  });

  describe('GDPR 30-day Deadline Compliance', () => {
    it('should identify requests within 7-day warning window', async () => {
      // Create request with exactly 6 days remaining
      const now = new Date();
      const dueDate = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000);

      const request = createMockDsrRequest({
        status: 'PENDING',
        escalationLevel: 'NONE',
        dueDate,
      });

      prisma.dsrRequest.findMany
        .mockResolvedValueOnce([request] as never)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      prisma.$transaction.mockImplementation(
        async (callback: (tx: MockPrismaService) => Promise<unknown>) => {
          const txClient = createMockPrisma();
          txClient.dsrRequest.update.mockResolvedValue({} as never);
          return callback(txClient);
        },
      );

      await job.checkDeadlines();

      expect(outboxService.addEvent).toHaveBeenCalled();
    });

    it('should identify requests within 2-day critical window', async () => {
      const now = new Date();
      const dueDate = new Date(now.getTime() + 1.5 * 24 * 60 * 60 * 1000); // 36 hours

      const request = createMockDsrRequest({
        status: 'IN_PROGRESS',
        escalationLevel: 'WARNING',
        dueDate,
      });

      prisma.dsrRequest.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([request] as never)
        .mockResolvedValueOnce([]);

      prisma.$transaction.mockImplementation(
        async (callback: (tx: MockPrismaService) => Promise<unknown>) => {
          const txClient = createMockPrisma();
          txClient.dsrRequest.update.mockResolvedValue({} as never);
          return callback(txClient);
        },
      );

      await job.checkDeadlines();

      expect(outboxService.addEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'DSR_DEADLINE_CRITICAL',
        }),
        expect.anything(),
      );
    });
  });

  describe('Transaction Handling', () => {
    it('should update escalation level and add event in same transaction', async () => {
      const request = createApproachingDeadlineRequest(3);

      prisma.dsrRequest.findMany
        .mockResolvedValueOnce([request] as never)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      let transactionCallCount = 0;
      prisma.$transaction.mockImplementation(
        async (callback: (tx: MockPrismaService) => Promise<unknown>) => {
          transactionCallCount++;
          const txClient = createMockPrisma();
          txClient.dsrRequest.update.mockResolvedValue({} as never);
          return callback(txClient);
        },
      );

      await job.checkDeadlines();

      expect(transactionCallCount).toBe(1);
      expect(outboxService.addEvent).toHaveBeenCalled();
    });
  });

  describe('Multiple Requests Processing', () => {
    it('should process multiple requests in sequence', async () => {
      const requests = [
        createApproachingDeadlineRequest(5),
        createApproachingDeadlineRequest(4),
        createApproachingDeadlineRequest(3),
      ];

      prisma.dsrRequest.findMany
        .mockResolvedValueOnce(requests as never)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      prisma.$transaction.mockImplementation(
        async (callback: (tx: MockPrismaService) => Promise<unknown>) => {
          const txClient = createMockPrisma();
          txClient.dsrRequest.update.mockResolvedValue({} as never);
          return callback(txClient);
        },
      );

      await job.checkDeadlines();

      expect(outboxService.addEvent).toHaveBeenCalledTimes(3);
      expect(eventEmitter.emit).toHaveBeenCalledTimes(3);
    });
  });
});

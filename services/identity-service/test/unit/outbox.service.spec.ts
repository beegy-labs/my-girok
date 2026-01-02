import { Test, TestingModule } from '@nestjs/testing';
import { OutboxService } from '../../src/common/outbox/outbox.service';
import { IdentityPrismaService } from '../../src/database/identity-prisma.service';

describe('OutboxService', () => {
  let service: OutboxService;
  let mockOutboxEventCreate: jest.Mock;
  let mockOutboxEventFindUnique: jest.Mock;
  let mockOutboxEventFindMany: jest.Mock;
  let mockOutboxEventUpdate: jest.Mock;
  let mockOutboxEventDeleteMany: jest.Mock;
  let mockOutboxEventCount: jest.Mock;
  let mockTransaction: jest.Mock;

  const mockOutboxEvent = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    aggregateType: 'Account',
    aggregateId: '223e4567-e89b-12d3-a456-426614174001',
    eventType: 'USER_REGISTERED',
    payload: { email: 'test@example.com' },
    status: 'PENDING',
    retryCount: 0,
    lastError: null,
    processedAt: null,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    mockOutboxEventCreate = jest.fn();
    mockOutboxEventFindUnique = jest.fn();
    mockOutboxEventFindMany = jest.fn();
    mockOutboxEventUpdate = jest.fn();
    mockOutboxEventDeleteMany = jest.fn();
    mockOutboxEventCount = jest.fn();

    const mockPrisma = {
      outboxEvent: {
        create: mockOutboxEventCreate,
        findUnique: mockOutboxEventFindUnique,
        findMany: mockOutboxEventFindMany,
        update: mockOutboxEventUpdate,
        deleteMany: mockOutboxEventDeleteMany,
        count: mockOutboxEventCount,
      },
      $transaction: jest.fn(),
    };

    mockTransaction = mockPrisma.$transaction as jest.Mock;
    mockTransaction.mockImplementation((fn) => fn(mockPrisma));

    const module: TestingModule = await Test.createTestingModule({
      providers: [OutboxService, { provide: IdentityPrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<OutboxService>(OutboxService);
  });

  describe('publishEvent', () => {
    it('should create a new outbox event', async () => {
      mockOutboxEventCreate.mockResolvedValue(mockOutboxEvent);

      const result = await service.publishEvent({
        aggregateType: 'Account',
        aggregateId: mockOutboxEvent.aggregateId,
        eventType: 'USER_REGISTERED',
        payload: { email: 'test@example.com' },
      });

      expect(result).toBeDefined();
      expect(result.eventType).toBe('USER_REGISTERED');
      expect(mockOutboxEventCreate).toHaveBeenCalled();
    });

    it('should set initial status to PENDING', async () => {
      mockOutboxEventCreate.mockResolvedValue(mockOutboxEvent);

      await service.publishEvent({
        aggregateType: 'Account',
        aggregateId: mockOutboxEvent.aggregateId,
        eventType: 'USER_REGISTERED',
        payload: {},
      });

      expect(mockOutboxEventCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'PENDING',
          retryCount: 0,
        }),
      });
    });
  });

  describe('publishInTransaction', () => {
    it('should create event within existing transaction', async () => {
      const mockTx = {
        outboxEvent: {
          create: jest.fn().mockResolvedValue(mockOutboxEvent),
        },
      };

      const result = await service.publishInTransaction(mockTx as never, {
        aggregateType: 'Account',
        aggregateId: mockOutboxEvent.aggregateId,
        eventType: 'USER_REGISTERED',
        payload: { email: 'test@example.com' },
      });

      expect(result).toBeDefined();
      expect(mockTx.outboxEvent.create).toHaveBeenCalled();
    });
  });

  describe('getPendingEvents', () => {
    it('should return pending events with limit', async () => {
      const mockEvents = [mockOutboxEvent, { ...mockOutboxEvent, id: 'event-2' }];
      mockOutboxEventFindMany.mockResolvedValue(mockEvents);

      const result = await service.getPendingEvents(50);

      expect(result).toHaveLength(2);
      expect(mockOutboxEventFindMany).toHaveBeenCalledWith({
        where: {
          status: 'PENDING',
          retryCount: { lt: 3 },
        },
        orderBy: { createdAt: 'asc' },
        take: 50,
      });
    });

    it('should use default limit of 100', async () => {
      mockOutboxEventFindMany.mockResolvedValue([]);

      await service.getPendingEvents();

      expect(mockOutboxEventFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
        }),
      );
    });
  });

  describe('markAsCompleted', () => {
    it('should mark event as completed with processedAt timestamp', async () => {
      mockOutboxEventUpdate.mockResolvedValue({
        ...mockOutboxEvent,
        status: 'COMPLETED',
        processedAt: new Date(),
      });

      await service.markAsCompleted(mockOutboxEvent.id);

      expect(mockOutboxEventUpdate).toHaveBeenCalledWith({
        where: { id: mockOutboxEvent.id },
        data: {
          status: 'COMPLETED',
          processedAt: expect.any(Date),
        },
      });
    });
  });

  describe('markAsFailed', () => {
    it('should increment retry count and keep PENDING status', async () => {
      mockOutboxEventFindUnique.mockResolvedValue({
        ...mockOutboxEvent,
        retryCount: 1,
      });
      mockOutboxEventUpdate.mockResolvedValue({
        ...mockOutboxEvent,
        retryCount: 2,
        status: 'PENDING',
        lastError: 'Connection timeout',
      });

      await service.markAsFailed(mockOutboxEvent.id, 'Connection timeout');

      expect(mockOutboxEventUpdate).toHaveBeenCalledWith({
        where: { id: mockOutboxEvent.id },
        data: {
          status: 'PENDING',
          retryCount: 2,
          lastError: 'Connection timeout',
        },
      });
    });

    it('should mark as FAILED after max retries', async () => {
      mockOutboxEventFindUnique.mockResolvedValue({
        ...mockOutboxEvent,
        retryCount: 2, // Already at 2, next will be 3 (max)
      });
      mockOutboxEventUpdate.mockResolvedValue({
        ...mockOutboxEvent,
        retryCount: 3,
        status: 'FAILED',
      });

      await service.markAsFailed(mockOutboxEvent.id, 'Final failure');

      expect(mockOutboxEventUpdate).toHaveBeenCalledWith({
        where: { id: mockOutboxEvent.id },
        data: {
          status: 'FAILED',
          retryCount: 3,
          lastError: 'Final failure',
        },
      });
    });

    it('should do nothing if event not found', async () => {
      mockOutboxEventFindUnique.mockResolvedValue(null);

      await service.markAsFailed('nonexistent-id', 'Error');

      expect(mockOutboxEventUpdate).not.toHaveBeenCalled();
    });
  });

  describe('markAsProcessing', () => {
    it('should update status to PROCESSING', async () => {
      mockOutboxEventUpdate.mockResolvedValue({
        ...mockOutboxEvent,
        status: 'PROCESSING',
      });

      await service.markAsProcessing(mockOutboxEvent.id);

      expect(mockOutboxEventUpdate).toHaveBeenCalledWith({
        where: { id: mockOutboxEvent.id },
        data: { status: 'PROCESSING' },
      });
    });
  });

  describe('cleanupCompletedEvents', () => {
    it('should delete completed events older than specified days', async () => {
      mockOutboxEventDeleteMany.mockResolvedValue({ count: 10 });

      const result = await service.cleanupCompletedEvents(7);

      expect(result).toBe(10);
      expect(mockOutboxEventDeleteMany).toHaveBeenCalledWith({
        where: {
          status: 'COMPLETED',
          processedAt: { lt: expect.any(Date) },
        },
      });
    });

    it('should use default of 7 days', async () => {
      mockOutboxEventDeleteMany.mockResolvedValue({ count: 5 });

      await service.cleanupCompletedEvents();

      expect(mockOutboxEventDeleteMany).toHaveBeenCalledWith({
        where: {
          status: 'COMPLETED',
          processedAt: { lt: expect.any(Date) },
        },
      });
    });

    it('should return 0 when no events to cleanup', async () => {
      mockOutboxEventDeleteMany.mockResolvedValue({ count: 0 });

      const result = await service.cleanupCompletedEvents();

      expect(result).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return counts for all statuses', async () => {
      mockOutboxEventCount
        .mockResolvedValueOnce(10) // pending
        .mockResolvedValueOnce(2) // processing
        .mockResolvedValueOnce(100) // completed
        .mockResolvedValueOnce(5); // failed

      const result = await service.getStats();

      expect(result).toEqual({
        pending: 10,
        processing: 2,
        completed: 100,
        failed: 5,
      });
    });

    it('should handle empty outbox', async () => {
      mockOutboxEventCount.mockResolvedValue(0);

      const result = await service.getStats();

      expect(result).toEqual({
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
      });
    });
  });

  describe('event payload handling', () => {
    it('should store complex payload objects', async () => {
      const complexPayload = {
        accountId: '123',
        email: 'test@example.com',
        metadata: {
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        },
        tags: ['important', 'user-action'],
      };

      mockOutboxEventCreate.mockResolvedValue({
        ...mockOutboxEvent,
        payload: complexPayload,
      });

      const result = await service.publishEvent({
        aggregateType: 'Account',
        aggregateId: '123',
        eventType: 'COMPLEX_EVENT',
        payload: complexPayload,
      });

      expect(result.payload).toEqual(complexPayload);
    });
  });

  describe('error handling', () => {
    it('should propagate database errors on publish', async () => {
      mockTransaction.mockRejectedValue(new Error('Database connection failed'));

      await expect(
        service.publishEvent({
          aggregateType: 'Account',
          aggregateId: '123',
          eventType: 'TEST_EVENT',
          payload: {},
        }),
      ).rejects.toThrow('Database connection failed');
    });
  });
});

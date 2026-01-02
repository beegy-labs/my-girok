import { Test, TestingModule } from '@nestjs/testing';

import { OutboxService, OutboxEventInput } from '../../src/common/outbox/outbox.service';
import { PrismaService } from '../../src/database/prisma.service';
import { createMockPrismaService, MockPrismaService } from '../utils/mock-prisma';
import { createOutboxEvent, generateTestId, resetTestCounter } from '../utils/test-factory';

describe('OutboxService', () => {
  let service: OutboxService;
  let mockPrisma: MockPrismaService;
  let mockTx: { $executeRaw: jest.Mock };

  beforeEach(async () => {
    resetTestCounter();

    mockPrisma = createMockPrismaService();

    // Create a mock transaction client with $executeRaw
    mockTx = {
      $executeRaw: jest.fn().mockResolvedValue(1),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [OutboxService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<OutboxService>(OutboxService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addEvent', () => {
    it('should add an event to the outbox', async () => {
      // Arrange
      const eventType = 'ROLE_CREATED';
      const aggregateId = generateTestId();
      const payload = { roleId: aggregateId, name: 'Test Role' };

      mockTx.$executeRaw.mockResolvedValue(1);

      // Act
      const result = await service.addEvent(mockTx as any, eventType, aggregateId, payload);

      // Assert
      expect(result).toBeDefined();
      expect(mockTx.$executeRaw).toHaveBeenCalled();
    });

    it('should generate a unique ID for each event', async () => {
      // Arrange
      mockTx.$executeRaw.mockResolvedValue(1);

      // Act
      const id1 = await service.addEvent(mockTx as any, 'TEST', 'agg-1', {});
      const id2 = await service.addEvent(mockTx as any, 'TEST', 'agg-2', {});

      // Assert
      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(mockTx.$executeRaw).toHaveBeenCalledTimes(2);
    });
  });

  describe('saveEvent', () => {
    it('should save a single event using OutboxEventInput', async () => {
      // Arrange
      const event: OutboxEventInput = {
        eventType: 'OPERATOR_INVITED',
        aggregateId: generateTestId(),
        payload: { email: 'test@example.com' },
      };

      mockTx.$executeRaw.mockResolvedValue(1);

      // Act
      const result = await service.saveEvent(mockTx as any, event);

      // Assert
      expect(result).toBeDefined();
      expect(mockTx.$executeRaw).toHaveBeenCalled();
    });
  });

  describe('saveEvents', () => {
    it('should save multiple events atomically', async () => {
      // Arrange
      const events: OutboxEventInput[] = [
        {
          eventType: 'PERMISSION_GRANTED',
          aggregateId: generateTestId(),
          payload: { operatorId: 'op-1', permissionId: 'perm-1' },
        },
        {
          eventType: 'PERMISSION_GRANTED',
          aggregateId: generateTestId(),
          payload: { operatorId: 'op-1', permissionId: 'perm-2' },
        },
      ];

      mockTx.$executeRaw.mockResolvedValue(1);

      // Act
      const result = await service.saveEvents(mockTx as any, events);

      // Assert
      expect(result).toHaveLength(2);
      expect(mockTx.$executeRaw).toHaveBeenCalledTimes(2);
    });

    it('should return empty array for empty input', async () => {
      // Act
      const result = await service.saveEvents(mockTx as any, []);

      // Assert
      expect(result).toHaveLength(0);
      expect(mockTx.$executeRaw).not.toHaveBeenCalled();
    });
  });

  describe('getPendingEvents', () => {
    it('should return pending events with retry count less than 5', async () => {
      // Arrange
      const pendingEvents = [
        createOutboxEvent({ status: 'PENDING', retryCount: 0 }),
        createOutboxEvent({ status: 'PENDING', retryCount: 2 }),
      ];

      mockPrisma.$queryRaw.mockResolvedValue(pendingEvents);

      // Act
      const result = await service.getPendingEvents();

      // Assert
      expect(result).toHaveLength(2);
      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
    });

    it('should respect custom limit', async () => {
      // Arrange
      mockPrisma.$queryRaw.mockResolvedValue([]);

      // Act
      await service.getPendingEvents(50);

      // Assert
      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
    });

    it('should order events by creation time ascending', async () => {
      // Arrange
      const olderEvent = createOutboxEvent({ createdAt: new Date('2024-01-01') });
      const newerEvent = createOutboxEvent({ createdAt: new Date('2024-01-02') });

      mockPrisma.$queryRaw.mockResolvedValue([olderEvent, newerEvent]);

      // Act
      const result = await service.getPendingEvents();

      // Assert
      expect(result[0].createdAt.getTime()).toBeLessThan(result[1].createdAt.getTime());
    });
  });

  describe('markAsPublished', () => {
    it('should update event status to PUBLISHED', async () => {
      // Arrange
      const eventId = generateTestId();

      mockPrisma.$executeRaw.mockResolvedValue(1);

      // Act
      await service.markAsPublished(eventId);

      // Assert
      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
    });
  });

  describe('markAsFailed', () => {
    it('should update event status to FAILED with error message', async () => {
      // Arrange
      const eventId = generateTestId();
      const errorMessage = 'Connection timeout to message broker';

      mockPrisma.$executeRaw.mockResolvedValue(1);

      // Act
      await service.markAsFailed(eventId, errorMessage);

      // Assert
      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
    });
  });

  describe('incrementRetryCount', () => {
    it('should increment retry count and update error message', async () => {
      // Arrange
      const eventId = generateTestId();
      const errorMessage = 'Temporary network error';

      mockPrisma.$queryRaw.mockResolvedValue([{ retryCount: 3 }]);

      // Act
      const newRetryCount = await service.incrementRetryCount(eventId, errorMessage);

      // Assert
      expect(newRetryCount).toBe(3);
      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
    });

    it('should return the new retry count', async () => {
      // Arrange
      const eventId = generateTestId();

      mockPrisma.$queryRaw.mockResolvedValue([{ retryCount: 5 }]);

      // Act
      const result = await service.incrementRetryCount(eventId, 'Max retries reached');

      // Assert
      expect(result).toBe(5);
    });
  });

  describe('cleanupPublishedEvents', () => {
    it('should delete published events older than default 7 days', async () => {
      // Arrange
      mockPrisma.$executeRaw.mockResolvedValue(10);

      // Act
      const result = await service.cleanupPublishedEvents();

      // Assert
      expect(result).toBe(10);
      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
    });

    it('should use custom retention period', async () => {
      // Arrange
      mockPrisma.$executeRaw.mockResolvedValue(5);

      // Act
      const result = await service.cleanupPublishedEvents(30);

      // Assert
      expect(result).toBe(5);
    });

    it('should return 0 when no events to cleanup', async () => {
      // Arrange
      mockPrisma.$executeRaw.mockResolvedValue(0);

      // Act
      const result = await service.cleanupPublishedEvents();

      // Assert
      expect(result).toBe(0);
    });
  });
});

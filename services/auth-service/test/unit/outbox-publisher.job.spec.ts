import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import { OutboxPublisherJob } from '../../src/common/outbox/outbox-publisher.job';
import { OutboxService } from '../../src/common/outbox/outbox.service';
import { createOutboxEvent, resetTestCounter } from '../utils/test-factory';

describe('OutboxPublisherJob', () => {
  let job: OutboxPublisherJob;
  let mockOutboxService: {
    getPendingEvents: Mock;
    markAsPublished: Mock;
    markAsFailed: Mock;
    incrementRetryCount: Mock;
    cleanupPublishedEvents: Mock;
  };
  let mockConfigService: { get: Mock };

  beforeEach(async () => {
    resetTestCounter();

    mockOutboxService = {
      getPendingEvents: vi.fn(),
      markAsPublished: vi.fn(),
      markAsFailed: vi.fn(),
      incrementRetryCount: vi.fn(),
      cleanupPublishedEvents: vi.fn(),
    };

    mockConfigService = {
      get: vi.fn((key: string, defaultValue?: string) => {
        if (key === 'OUTBOX_PUBLISHER_ENABLED') {
          return defaultValue ?? 'true';
        }
        return defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboxPublisherJob,
        { provide: OutboxService, useValue: mockOutboxService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    job = module.get<OutboxPublisherJob>(OutboxPublisherJob);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // Initialization Tests
  // ============================================================================

  describe('onModuleInit', () => {
    it('should log initialization message when enabled', () => {
      // Arrange
      const logSpy = vi.spyOn((job as any).logger, 'log');

      // Act
      job.onModuleInit();

      // Assert
      expect(logSpy).toHaveBeenCalledWith(
        'OutboxPublisherJob initialized - polling every 1 second',
      );
    });

    it('should log warning when disabled', async () => {
      // Arrange - create job with disabled config
      mockConfigService.get.mockImplementation((key: string, defaultValue?: string) => {
        if (key === 'OUTBOX_PUBLISHER_ENABLED') {
          return 'false';
        }
        return defaultValue;
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          OutboxPublisherJob,
          { provide: OutboxService, useValue: mockOutboxService },
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      const disabledJob = module.get<OutboxPublisherJob>(OutboxPublisherJob);
      const warnSpy = vi.spyOn((disabledJob as any).logger, 'warn');

      // Act
      disabledJob.onModuleInit();

      // Assert
      expect(warnSpy).toHaveBeenCalledWith(
        'OutboxPublisherJob is disabled via OUTBOX_PUBLISHER_ENABLED=false',
      );
    });
  });

  // ============================================================================
  // Graceful Shutdown Tests
  // ============================================================================

  describe('onModuleDestroy', () => {
    it('should log shutdown messages when not processing', async () => {
      // Arrange
      const logSpy = vi.spyOn((job as any).logger, 'log');

      // Act
      await job.onModuleDestroy();

      // Assert
      expect(logSpy).toHaveBeenCalledWith('OutboxPublisherJob shutting down...');
      expect(logSpy).toHaveBeenCalledWith('OutboxPublisherJob shutdown complete');
    });

    it('should wait for processing to complete', async () => {
      // Arrange
      (job as any).isProcessing = true;
      const warnSpy = vi.spyOn((job as any).logger, 'warn');

      // Simulate processing completing after 200ms
      setTimeout(() => {
        (job as any).isProcessing = false;
      }, 200);

      // Act
      const startTime = Date.now();
      await job.onModuleDestroy();
      const elapsedTime = Date.now() - startTime;

      // Assert - should have waited at least 200ms
      expect(elapsedTime).toBeGreaterThanOrEqual(150);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('should timeout and warn if processing takes too long', async () => {
      // Arrange
      (job as any).isProcessing = true;
      const warnSpy = vi.spyOn((job as any).logger, 'warn');
      const logSpy = vi.spyOn((job as any).logger, 'log');

      // Use fake timers to control time
      vi.useFakeTimers();

      // Start the shutdown process
      const shutdownPromise = job.onModuleDestroy();

      // Advance time past the 10 second timeout
      await vi.advanceTimersByTimeAsync(10100);

      // Wait for the promise to resolve
      await shutdownPromise;

      // Restore real timers
      vi.useRealTimers();

      // Assert
      expect(logSpy).toHaveBeenCalledWith('OutboxPublisherJob shutting down...');
      expect(warnSpy).toHaveBeenCalledWith('Shutdown timeout reached while processing events');
    });

    it('should set isShuttingDown flag', async () => {
      // Arrange
      expect((job as any).isShuttingDown).toBe(false);

      // Act
      await job.onModuleDestroy();

      // Assert
      expect((job as any).isShuttingDown).toBe(true);
    });
  });

  // ============================================================================
  // publishPendingEvents Tests
  // ============================================================================

  describe('publishPendingEvents', () => {
    it('should skip processing when disabled', async () => {
      // Arrange
      (job as any).isEnabled = false;

      // Act
      await job.publishPendingEvents();

      // Assert
      expect(mockOutboxService.getPendingEvents).not.toHaveBeenCalled();
    });

    it('should skip processing when shutting down', async () => {
      // Arrange
      (job as any).isShuttingDown = true;

      // Act
      await job.publishPendingEvents();

      // Assert
      expect(mockOutboxService.getPendingEvents).not.toHaveBeenCalled();
    });

    it('should skip processing when already processing', async () => {
      // Arrange
      (job as any).isProcessing = true;
      const debugSpy = vi.spyOn((job as any).logger, 'debug');

      // Act
      await job.publishPendingEvents();

      // Assert
      expect(mockOutboxService.getPendingEvents).not.toHaveBeenCalled();
      expect(debugSpy).toHaveBeenCalledWith('Previous publish cycle still running, skipping');
    });

    it('should return early when no pending events', async () => {
      // Arrange
      mockOutboxService.getPendingEvents.mockResolvedValue([]);

      // Act
      await job.publishPendingEvents();

      // Assert
      expect(mockOutboxService.getPendingEvents).toHaveBeenCalledWith(100);
      expect(mockOutboxService.markAsPublished).not.toHaveBeenCalled();
    });

    it('should process and publish pending events', async () => {
      // Arrange
      const events = [
        createOutboxEvent({ eventType: 'ROLE_CREATED', aggregateId: 'role-1' }),
        createOutboxEvent({ eventType: 'OPERATOR_INVITED', aggregateId: 'op-1' }),
      ];
      mockOutboxService.getPendingEvents.mockResolvedValue(events);
      mockOutboxService.markAsPublished.mockResolvedValue(undefined);

      // Act
      await job.publishPendingEvents();

      // Assert
      expect(mockOutboxService.getPendingEvents).toHaveBeenCalledWith(100);
      expect(mockOutboxService.markAsPublished).toHaveBeenCalledTimes(2);
      expect(mockOutboxService.markAsPublished).toHaveBeenCalledWith(events[0].id);
      expect(mockOutboxService.markAsPublished).toHaveBeenCalledWith(events[1].id);
    });

    it('should log debug message for pending events', async () => {
      // Arrange
      const events = [createOutboxEvent(), createOutboxEvent(), createOutboxEvent()];
      mockOutboxService.getPendingEvents.mockResolvedValue(events);
      mockOutboxService.markAsPublished.mockResolvedValue(undefined);
      const debugSpy = vi.spyOn((job as any).logger, 'debug');

      // Act
      await job.publishPendingEvents();

      // Assert
      expect(debugSpy).toHaveBeenCalledWith('Processing 3 pending outbox events');
    });

    it('should reset isProcessing flag after completion', async () => {
      // Arrange
      mockOutboxService.getPendingEvents.mockResolvedValue([]);

      // Act
      await job.publishPendingEvents();

      // Assert
      expect((job as any).isProcessing).toBe(false);
    });

    it('should reset isProcessing flag even on error', async () => {
      // Arrange
      mockOutboxService.getPendingEvents.mockRejectedValue(new Error('DB error'));

      // Act
      await job.publishPendingEvents();

      // Assert
      expect((job as any).isProcessing).toBe(false);
    });

    it('should log error when getPendingEvents fails', async () => {
      // Arrange
      const error = new Error('Database connection failed');
      mockOutboxService.getPendingEvents.mockRejectedValue(error);
      const errorSpy = vi.spyOn((job as any).logger, 'error');

      // Act
      await job.publishPendingEvents();

      // Assert
      expect(errorSpy).toHaveBeenCalledWith('Failed to process outbox events', error);
    });
  });

  // ============================================================================
  // Retry and Failure Handling Tests
  // ============================================================================

  describe('retry and failure handling', () => {
    it('should increment retry count on publish failure', async () => {
      // Arrange
      const event = createOutboxEvent({ retryCount: 2 });
      mockOutboxService.getPendingEvents.mockResolvedValue([event]);
      mockOutboxService.incrementRetryCount.mockResolvedValue(3);

      // Mock publishToRedpanda to fail
      vi.spyOn(job as any, 'publishToRedpanda').mockRejectedValue(new Error('Network error'));

      const warnSpy = vi.spyOn((job as any).logger, 'warn');

      // Act
      await job.publishPendingEvents();

      // Assert
      expect(mockOutboxService.incrementRetryCount).toHaveBeenCalledWith(event.id, 'Network error');
      expect(warnSpy).toHaveBeenCalledWith(
        `Outbox event ${event.id} publish failed (attempt 3/5): Network error`,
      );
      expect(mockOutboxService.markAsFailed).not.toHaveBeenCalled();
    });

    it('should mark event as failed after max retries', async () => {
      // Arrange
      const event = createOutboxEvent({ retryCount: 4 });
      mockOutboxService.getPendingEvents.mockResolvedValue([event]);
      mockOutboxService.incrementRetryCount.mockResolvedValue(5);
      mockOutboxService.markAsFailed.mockResolvedValue(undefined);

      // Mock publishToRedpanda to fail
      vi.spyOn(job as any, 'publishToRedpanda').mockRejectedValue(new Error('Persistent failure'));

      const errorSpy = vi.spyOn((job as any).logger, 'error');

      // Act
      await job.publishPendingEvents();

      // Assert
      expect(mockOutboxService.incrementRetryCount).toHaveBeenCalledWith(
        event.id,
        'Persistent failure',
      );
      expect(mockOutboxService.markAsFailed).toHaveBeenCalledWith(event.id, 'Persistent failure');
      expect(errorSpy).toHaveBeenCalledWith(
        `Outbox event ${event.id} failed after 5 attempts: Persistent failure`,
      );
    });

    it('should handle non-Error objects in catch block', async () => {
      // Arrange
      const event = createOutboxEvent();
      mockOutboxService.getPendingEvents.mockResolvedValue([event]);
      mockOutboxService.incrementRetryCount.mockResolvedValue(1);

      // Mock publishToRedpanda to throw a non-Error object
      vi.spyOn(job as any, 'publishToRedpanda').mockRejectedValue('String error');

      const warnSpy = vi.spyOn((job as any).logger, 'warn');

      // Act
      await job.publishPendingEvents();

      // Assert
      expect(mockOutboxService.incrementRetryCount).toHaveBeenCalledWith(event.id, 'String error');
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('String error'));
    });

    it('should continue processing remaining events after one fails', async () => {
      // Arrange
      const events = [
        createOutboxEvent({ id: 'event-1' }),
        createOutboxEvent({ id: 'event-2' }),
        createOutboxEvent({ id: 'event-3' }),
      ];
      mockOutboxService.getPendingEvents.mockResolvedValue(events);
      mockOutboxService.incrementRetryCount.mockResolvedValue(1);
      mockOutboxService.markAsPublished.mockResolvedValue(undefined);

      // First event fails, others succeed
      vi.spyOn(job as any, 'publishToRedpanda')
        .mockRejectedValueOnce(new Error('First failed'))
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);

      // Act
      await job.publishPendingEvents();

      // Assert
      expect(mockOutboxService.incrementRetryCount).toHaveBeenCalledTimes(1);
      expect(mockOutboxService.markAsPublished).toHaveBeenCalledTimes(2);
      expect(mockOutboxService.markAsPublished).toHaveBeenCalledWith('event-2');
      expect(mockOutboxService.markAsPublished).toHaveBeenCalledWith('event-3');
    });
  });

  // ============================================================================
  // cleanupOldEvents Tests
  // ============================================================================

  describe('cleanupOldEvents', () => {
    it('should skip cleanup when disabled', async () => {
      // Arrange
      (job as any).isEnabled = false;

      // Act
      await job.cleanupOldEvents();

      // Assert
      expect(mockOutboxService.cleanupPublishedEvents).not.toHaveBeenCalled();
    });

    it('should call cleanupPublishedEvents with 7 days retention', async () => {
      // Arrange
      mockOutboxService.cleanupPublishedEvents.mockResolvedValue(10);

      // Act
      await job.cleanupOldEvents();

      // Assert
      expect(mockOutboxService.cleanupPublishedEvents).toHaveBeenCalledWith(7);
    });

    it('should log error on cleanup failure', async () => {
      // Arrange
      const error = new Error('Cleanup failed');
      mockOutboxService.cleanupPublishedEvents.mockRejectedValue(error);
      const errorSpy = vi.spyOn((job as any).logger, 'error');

      // Act
      await job.cleanupOldEvents();

      // Assert
      expect(errorSpy).toHaveBeenCalledWith('Failed to cleanup old outbox events', error);
    });
  });

  // ============================================================================
  // Topic Mapping Tests (via publishToRedpanda)
  // ============================================================================

  describe('topic mapping', () => {
    it('should map ROLE_* events to auth.role topic', async () => {
      // Arrange
      const event = createOutboxEvent({
        eventType: 'ROLE_CREATED',
        aggregateId: 'role-123',
      });
      mockOutboxService.getPendingEvents.mockResolvedValue([event]);
      mockOutboxService.markAsPublished.mockResolvedValue(undefined);
      const logSpy = vi.spyOn((job as any).logger, 'log');

      // Act
      await job.publishPendingEvents();

      // Assert
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Topic: auth.role'));
    });

    it('should map OPERATOR_* events to auth.operator topic', async () => {
      // Arrange
      const event = createOutboxEvent({
        eventType: 'OPERATOR_INVITED',
        aggregateId: 'op-123',
      });
      mockOutboxService.getPendingEvents.mockResolvedValue([event]);
      mockOutboxService.markAsPublished.mockResolvedValue(undefined);
      const logSpy = vi.spyOn((job as any).logger, 'log');

      // Act
      await job.publishPendingEvents();

      // Assert
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Topic: auth.operator'));
    });

    it('should map SANCTION_* events to auth.sanction topic', async () => {
      // Arrange
      const event = createOutboxEvent({
        eventType: 'SANCTION_ISSUED',
        aggregateId: 'sanc-123',
      });
      mockOutboxService.getPendingEvents.mockResolvedValue([event]);
      mockOutboxService.markAsPublished.mockResolvedValue(undefined);
      const logSpy = vi.spyOn((job as any).logger, 'log');

      // Act
      await job.publishPendingEvents();

      // Assert
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Topic: auth.sanction'));
    });

    it('should map SERVICE_* events to auth.service topic', async () => {
      // Arrange
      const event = createOutboxEvent({
        eventType: 'SERVICE_CREATED',
        aggregateId: 'svc-123',
      });
      mockOutboxService.getPendingEvents.mockResolvedValue([event]);
      mockOutboxService.markAsPublished.mockResolvedValue(undefined);
      const logSpy = vi.spyOn((job as any).logger, 'log');

      // Act
      await job.publishPendingEvents();

      // Assert
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Topic: auth.service'));
    });

    it('should map PERMISSION_* events to auth.permission topic', async () => {
      // Arrange
      const event = createOutboxEvent({
        eventType: 'PERMISSION_GRANTED',
        aggregateId: 'perm-123',
      });
      mockOutboxService.getPendingEvents.mockResolvedValue([event]);
      mockOutboxService.markAsPublished.mockResolvedValue(undefined);
      const logSpy = vi.spyOn((job as any).logger, 'log');

      // Act
      await job.publishPendingEvents();

      // Assert
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Topic: auth.permission'));
    });

    it('should map unknown events to auth.events topic', async () => {
      // Arrange
      const event = createOutboxEvent({
        eventType: 'UNKNOWN_EVENT',
        aggregateId: 'unk-123',
      });
      mockOutboxService.getPendingEvents.mockResolvedValue([event]);
      mockOutboxService.markAsPublished.mockResolvedValue(undefined);
      const logSpy = vi.spyOn((job as any).logger, 'log');

      // Act
      await job.publishPendingEvents();

      // Assert
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Topic: auth.events'));
    });

    it('should handle event types with no underscore', async () => {
      // Arrange
      const event = createOutboxEvent({
        eventType: 'SINGLETYPEEVENT',
        aggregateId: 'single-123',
      });
      mockOutboxService.getPendingEvents.mockResolvedValue([event]);
      mockOutboxService.markAsPublished.mockResolvedValue(undefined);
      const logSpy = vi.spyOn((job as any).logger, 'log');

      // Act
      await job.publishPendingEvents();

      // Assert
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Topic: auth.events'));
    });
  });

  // ============================================================================
  // publishToRedpanda Tests
  // ============================================================================

  describe('publishToRedpanda (private method)', () => {
    it('should log publish information', async () => {
      // Arrange
      const event = createOutboxEvent({
        eventType: 'ROLE_CREATED',
        aggregateId: 'role-abc',
      });
      mockOutboxService.getPendingEvents.mockResolvedValue([event]);
      mockOutboxService.markAsPublished.mockResolvedValue(undefined);
      const logSpy = vi.spyOn((job as any).logger, 'log');

      // Act
      await job.publishPendingEvents();

      // Assert
      expect(logSpy).toHaveBeenCalledWith(
        `[PUBLISH] Topic: auth.role, EventType: ROLE_CREATED, AggregateId: role-abc`,
      );
    });

    it('should simulate network latency', async () => {
      // Arrange
      const event = createOutboxEvent();
      mockOutboxService.getPendingEvents.mockResolvedValue([event]);
      mockOutboxService.markAsPublished.mockResolvedValue(undefined);

      const startTime = Date.now();

      // Act
      await job.publishPendingEvents();

      const elapsedTime = Date.now() - startTime;

      // Assert - should take at least 10ms due to simulated latency
      expect(elapsedTime).toBeGreaterThanOrEqual(5);
    });
  });

  // ============================================================================
  // Configuration Tests
  // ============================================================================

  describe('configuration', () => {
    it('should be enabled by default', () => {
      // Assert
      expect((job as any).isEnabled).toBe(true);
    });

    it('should be disabled when OUTBOX_PUBLISHER_ENABLED is false', async () => {
      // Arrange
      mockConfigService.get.mockImplementation((key: string, defaultValue?: string) => {
        if (key === 'OUTBOX_PUBLISHER_ENABLED') {
          return 'false';
        }
        return defaultValue;
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          OutboxPublisherJob,
          { provide: OutboxService, useValue: mockOutboxService },
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      const disabledJob = module.get<OutboxPublisherJob>(OutboxPublisherJob);

      // Assert
      expect((disabledJob as any).isEnabled).toBe(false);
    });

    it('should use default true when OUTBOX_PUBLISHER_ENABLED is not set', async () => {
      // Arrange
      mockConfigService.get.mockImplementation((_key: string, defaultValue?: string) => {
        return defaultValue;
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          OutboxPublisherJob,
          { provide: OutboxService, useValue: mockOutboxService },
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      const defaultJob = module.get<OutboxPublisherJob>(OutboxPublisherJob);

      // Assert
      expect((defaultJob as any).isEnabled).toBe(true);
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('edge cases', () => {
    it('should handle empty event type gracefully', async () => {
      // Arrange
      const event = createOutboxEvent({
        eventType: '',
        aggregateId: 'test-123',
      });
      mockOutboxService.getPendingEvents.mockResolvedValue([event]);
      mockOutboxService.markAsPublished.mockResolvedValue(undefined);
      const logSpy = vi.spyOn((job as any).logger, 'log');

      // Act
      await job.publishPendingEvents();

      // Assert - should default to auth.events for empty/unknown type
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Topic: auth.events'));
    });

    it('should handle underscore-only event type', async () => {
      // Arrange
      const event = createOutboxEvent({
        eventType: '_TEST',
        aggregateId: 'test-123',
      });
      mockOutboxService.getPendingEvents.mockResolvedValue([event]);
      mockOutboxService.markAsPublished.mockResolvedValue(undefined);
      const logSpy = vi.spyOn((job as any).logger, 'log');

      // Act
      await job.publishPendingEvents();

      // Assert
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Topic: auth.events'));
    });

    it('should process large batch of events', async () => {
      // Arrange
      const events = Array.from({ length: 100 }, (_, i) =>
        createOutboxEvent({ id: `event-${i}`, eventType: 'ROLE_CREATED' }),
      );
      mockOutboxService.getPendingEvents.mockResolvedValue(events);
      mockOutboxService.markAsPublished.mockResolvedValue(undefined);

      // Act
      await job.publishPendingEvents();

      // Assert
      expect(mockOutboxService.markAsPublished).toHaveBeenCalledTimes(100);
    });

    it('should handle concurrent calls by skipping when already processing', async () => {
      // Arrange
      const events = [createOutboxEvent()];
      mockOutboxService.getPendingEvents.mockImplementation(async () => {
        // Simulate slow processing
        await new Promise((resolve) => setTimeout(resolve, 50));
        return events;
      });
      mockOutboxService.markAsPublished.mockResolvedValue(undefined);

      // Act - start two concurrent calls
      const call1 = job.publishPendingEvents();
      const call2 = job.publishPendingEvents();

      await Promise.all([call1, call2]);

      // Assert - only one should have actually processed
      expect(mockOutboxService.getPendingEvents).toHaveBeenCalledTimes(1);
    });
  });
});

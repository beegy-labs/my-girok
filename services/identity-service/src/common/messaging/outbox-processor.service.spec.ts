import { Test, TestingModule } from '@nestjs/testing';
import { OutboxProcessorService } from './outbox-processor.service';
import { OutboxService, OutboxEvent } from '../outbox/outbox.service';
import { KafkaProducerService } from './kafka-producer.service';

describe('OutboxProcessorService', () => {
  let service: OutboxProcessorService;
  let mockOutboxService: {
    getPendingEvents: jest.Mock;
    markAsProcessing: jest.Mock;
    markAsCompleted: jest.Mock;
    markAsFailed: jest.Mock;
    cleanupCompletedEvents: jest.Mock;
    getStats: jest.Mock;
  };
  let mockProducerService: {
    publish: jest.Mock;
  };

  const mockOutboxEvent: OutboxEvent = {
    id: 'event-123',
    aggregateType: 'Account',
    aggregateId: 'account-456',
    eventType: 'ACCOUNT_CREATED',
    payload: { email: 'test@example.com' },
    status: 'PENDING',
    retryCount: 0,
    lastError: null,
    processedAt: null,
    createdAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    mockOutboxService = {
      getPendingEvents: jest.fn(),
      markAsProcessing: jest.fn(),
      markAsCompleted: jest.fn(),
      markAsFailed: jest.fn(),
      cleanupCompletedEvents: jest.fn(),
      getStats: jest.fn(),
    };

    mockProducerService = {
      publish: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboxProcessorService,
        { provide: OutboxService, useValue: mockOutboxService },
        { provide: KafkaProducerService, useValue: mockProducerService },
      ],
    }).compile();

    service = module.get<OutboxProcessorService>(OutboxProcessorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processOutbox', () => {
    it('should process pending events', async () => {
      mockOutboxService.getPendingEvents.mockResolvedValue([mockOutboxEvent]);
      mockOutboxService.markAsProcessing.mockResolvedValue(undefined);
      mockProducerService.publish.mockResolvedValue([]);
      mockOutboxService.markAsCompleted.mockResolvedValue(undefined);

      await service.processOutbox();

      expect(mockOutboxService.getPendingEvents).toHaveBeenCalledWith(100);
      expect(mockOutboxService.markAsProcessing).toHaveBeenCalledWith('event-123');
      expect(mockProducerService.publish).toHaveBeenCalledWith(
        'identity.account.events',
        expect.objectContaining({
          id: 'event-123',
          aggregateType: 'Account',
          aggregateId: 'account-456',
          eventType: 'ACCOUNT_CREATED',
        }),
      );
      expect(mockOutboxService.markAsCompleted).toHaveBeenCalledWith('event-123');
    });

    it('should skip processing when no pending events', async () => {
      mockOutboxService.getPendingEvents.mockResolvedValue([]);

      await service.processOutbox();

      expect(mockOutboxService.markAsProcessing).not.toHaveBeenCalled();
      expect(mockProducerService.publish).not.toHaveBeenCalled();
    });

    it('should not run concurrently', async () => {
      // Simulate slow processing
      mockOutboxService.getPendingEvents.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return [mockOutboxEvent];
      });
      mockOutboxService.markAsProcessing.mockResolvedValue(undefined);
      mockProducerService.publish.mockResolvedValue([]);
      mockOutboxService.markAsCompleted.mockResolvedValue(undefined);

      // Start first processing
      const firstProcess = service.processOutbox();

      // Try to start second processing immediately
      await service.processOutbox();

      // Wait for first to complete
      await firstProcess;

      // Should only call getPendingEvents once due to lock
      expect(mockOutboxService.getPendingEvents).toHaveBeenCalledTimes(1);
    });

    it('should handle publish failure', async () => {
      mockOutboxService.getPendingEvents.mockResolvedValue([mockOutboxEvent]);
      mockOutboxService.markAsProcessing.mockResolvedValue(undefined);
      mockProducerService.publish.mockRejectedValue(new Error('Publish failed'));
      mockOutboxService.markAsFailed.mockResolvedValue(undefined);

      await service.processOutbox();

      expect(mockOutboxService.markAsFailed).toHaveBeenCalledWith('event-123', 'Publish failed');
      expect(mockOutboxService.markAsCompleted).not.toHaveBeenCalled();
    });

    it('should not process when disabled', async () => {
      service.setProcessingEnabled(false);
      mockOutboxService.getPendingEvents.mockResolvedValue([mockOutboxEvent]);

      await service.processOutbox();

      expect(mockOutboxService.getPendingEvents).not.toHaveBeenCalled();
    });
  });

  describe('getTopicForAggregate', () => {
    it('should map Account to account events topic', async () => {
      mockOutboxService.getPendingEvents.mockResolvedValue([mockOutboxEvent]);
      mockOutboxService.markAsProcessing.mockResolvedValue(undefined);
      mockProducerService.publish.mockResolvedValue([]);
      mockOutboxService.markAsCompleted.mockResolvedValue(undefined);

      await service.processOutbox();

      expect(mockProducerService.publish).toHaveBeenCalledWith(
        'identity.account.events',
        expect.any(Object),
      );
    });

    it('should map Session to session events topic', async () => {
      const sessionEvent = { ...mockOutboxEvent, aggregateType: 'Session' };
      mockOutboxService.getPendingEvents.mockResolvedValue([sessionEvent]);
      mockOutboxService.markAsProcessing.mockResolvedValue(undefined);
      mockProducerService.publish.mockResolvedValue([]);
      mockOutboxService.markAsCompleted.mockResolvedValue(undefined);

      await service.processOutbox();

      expect(mockProducerService.publish).toHaveBeenCalledWith(
        'identity.session.events',
        expect.any(Object),
      );
    });

    it('should map Device to device events topic', async () => {
      const deviceEvent = { ...mockOutboxEvent, aggregateType: 'Device' };
      mockOutboxService.getPendingEvents.mockResolvedValue([deviceEvent]);
      mockOutboxService.markAsProcessing.mockResolvedValue(undefined);
      mockProducerService.publish.mockResolvedValue([]);
      mockOutboxService.markAsCompleted.mockResolvedValue(undefined);

      await service.processOutbox();

      expect(mockProducerService.publish).toHaveBeenCalledWith(
        'identity.device.events',
        expect.any(Object),
      );
    });

    it('should use default topic for unknown aggregate type', async () => {
      const unknownEvent = { ...mockOutboxEvent, aggregateType: 'Unknown' };
      mockOutboxService.getPendingEvents.mockResolvedValue([unknownEvent]);
      mockOutboxService.markAsProcessing.mockResolvedValue(undefined);
      mockProducerService.publish.mockResolvedValue([]);
      mockOutboxService.markAsCompleted.mockResolvedValue(undefined);

      await service.processOutbox();

      // Falls back to account events
      expect(mockProducerService.publish).toHaveBeenCalledWith(
        'identity.account.events',
        expect.any(Object),
      );
    });
  });

  describe('triggerProcessing', () => {
    it('should manually trigger outbox processing', async () => {
      mockOutboxService.getPendingEvents.mockResolvedValue([]);

      await service.triggerProcessing();

      expect(mockOutboxService.getPendingEvents).toHaveBeenCalled();
    });
  });

  describe('setProcessingEnabled', () => {
    it('should enable processing', () => {
      service.setProcessingEnabled(true);
      // No error means success
      expect(service).toBeDefined();
    });

    it('should disable processing', () => {
      service.setProcessingEnabled(false);
      expect(service).toBeDefined();
    });
  });

  describe('getStats', () => {
    it('should return processing statistics', async () => {
      mockOutboxService.getStats.mockResolvedValue({
        pending: 10,
        processing: 2,
        completed: 100,
        failed: 5,
      });

      const result = await service.getStats();

      expect(result).toEqual({
        stats: {
          pending: 10,
          processing: 2,
          completed: 100,
          failed: 5,
        },
        isProcessing: false,
        processingEnabled: true,
      });
    });
  });

  describe('cleanupOldEvents', () => {
    it('should cleanup old completed events', async () => {
      mockOutboxService.cleanupCompletedEvents.mockResolvedValue(50);

      await service.cleanupOldEvents();

      expect(mockOutboxService.cleanupCompletedEvents).toHaveBeenCalledWith(7);
    });
  });

  describe('onModuleInit', () => {
    it('should initialize service', async () => {
      await service.onModuleInit();
      // No error means success
      expect(service).toBeDefined();
    });
  });

  describe('onModuleDestroy', () => {
    it('should disable processing on destroy', async () => {
      await service.onModuleDestroy();

      mockOutboxService.getPendingEvents.mockResolvedValue([mockOutboxEvent]);
      await service.processOutbox();

      // Should not process because disabled
      expect(mockOutboxService.getPendingEvents).not.toHaveBeenCalled();
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { vi, describe, it, expect, beforeEach, afterEach, Mock, MockedFunction } from 'vitest';
import { KafkaProducerService, EventMessage } from './kafka-producer.service';
import { Kafka, RecordMetadata } from 'kafkajs';

// Create mock producer outside the module mock for reference
const mockProducerMethods = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  send: vi.fn(),
};

// Mock kafkajs
vi.mock('kafkajs', () => {
  return {
    Kafka: class MockKafka {
      producer() {
        return mockProducerMethods;
      }
    },
    logLevel: {
      NOTHING: 0,
      ERROR: 1,
      WARN: 2,
      INFO: 3,
      DEBUG: 4,
    },
  };
});

describe('KafkaProducerService', () => {
  let service: KafkaProducerService;
  let mockProducer: typeof mockProducerMethods;

  const mockEvent: EventMessage = {
    id: 'event-123',
    aggregateType: 'Account',
    aggregateId: 'account-456',
    eventType: 'ACCOUNT_CREATED',
    payload: { email: 'test@example.com' },
    timestamp: '2024-01-01T00:00:00Z',
    metadata: { source: 'test' },
  };

  const mockMetadata: RecordMetadata[] = [
    {
      topicName: 'identity.account.events',
      partition: 0,
      errorCode: 0,
      offset: '100',
      timestamp: '1704067200000',
    },
  ];

  beforeEach(async () => {
    // Reset mock producer methods
    mockProducer = mockProducerMethods;
    mockProducer.connect.mockResolvedValue(undefined);
    mockProducer.disconnect.mockResolvedValue(undefined);
    mockProducer.send.mockResolvedValue(mockMetadata);

    const module: TestingModule = await Test.createTestingModule({
      providers: [KafkaProducerService],
    }).compile();

    service = module.get<KafkaProducerService>(KafkaProducerService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('connect', () => {
    it('should connect to Kafka broker', async () => {
      await service.connect();

      expect(mockProducer.connect).toHaveBeenCalled();
      expect(service.isProducerConnected()).toBe(true);
    });

    it('should not reconnect if already connected', async () => {
      await service.connect();
      await service.connect();

      expect(mockProducer.connect).toHaveBeenCalledTimes(1);
    });

    it('should throw error on connection failure', async () => {
      mockProducer.connect.mockRejectedValue(new Error('Connection failed'));

      await expect(service.connect()).rejects.toThrow('Connection failed');
    });
  });

  describe('disconnect', () => {
    it('should disconnect from Kafka broker', async () => {
      await service.connect();
      await service.disconnect();

      expect(mockProducer.disconnect).toHaveBeenCalled();
      expect(service.isProducerConnected()).toBe(false);
    });

    it('should not throw if not connected', async () => {
      await expect(service.disconnect()).resolves.not.toThrow();
    });
  });

  describe('publish', () => {
    it('should publish event to topic', async () => {
      await service.connect();
      const result = await service.publish('identity.account.events' as any, mockEvent);

      expect(result).toEqual(mockMetadata);
      expect(mockProducer.send).toHaveBeenCalledWith({
        topic: 'identity.account.events',
        messages: [
          {
            key: 'Account:account-456',
            value: JSON.stringify(mockEvent),
            headers: {
              'event-type': 'ACCOUNT_CREATED',
              'aggregate-type': 'Account',
              'aggregate-id': 'account-456',
              'event-id': 'event-123',
              timestamp: '2024-01-01T00:00:00Z',
            },
          },
        ],
      });
    });

    it('should auto-connect if not connected', async () => {
      await service.publish('identity.account.events' as any, mockEvent);

      expect(mockProducer.connect).toHaveBeenCalled();
      expect(mockProducer.send).toHaveBeenCalled();
    });

    it('should throw error on publish failure', async () => {
      await service.connect();
      mockProducer.send.mockRejectedValue(new Error('Publish failed'));

      await expect(service.publish('identity.account.events' as any, mockEvent)).rejects.toThrow(
        'Publish failed',
      );
    });
  });

  describe('publishBatch', () => {
    it('should publish multiple events in batch', async () => {
      await service.connect();
      const events: EventMessage[] = [
        mockEvent,
        { ...mockEvent, id: 'event-124', eventType: 'ACCOUNT_UPDATED' },
      ];

      const result = await service.publishBatch('identity.account.events' as any, events);

      expect(result).toEqual(mockMetadata);
      expect(mockProducer.send).toHaveBeenCalledWith(
        expect.objectContaining({
          topic: 'identity.account.events',
          messages: expect.arrayContaining([
            expect.objectContaining({ key: 'Account:account-456' }),
          ]),
        }),
      );
    });

    it('should auto-connect if not connected', async () => {
      await service.publishBatch('identity.account.events' as any, [mockEvent]);

      expect(mockProducer.connect).toHaveBeenCalled();
    });
  });

  describe('sendToDLQ', () => {
    it('should send failed event to dead letter queue', async () => {
      await service.connect();
      const error = new Error('Processing failed');

      await service.sendToDLQ('identity.account.events', mockEvent, error);

      expect(mockProducer.send).toHaveBeenCalledWith(
        expect.objectContaining({
          topic: 'identity.dlq',
          messages: [
            expect.objectContaining({
              value: expect.stringContaining('Processing failed'),
            }),
          ],
        }),
      );
    });

    it('should include original topic in DLQ metadata', async () => {
      await service.connect();
      const error = new Error('Processing failed');

      await service.sendToDLQ('identity.account.events', mockEvent, error);

      const sendCall = mockProducer.send.mock.calls[0][0];
      const messageValue = JSON.parse(sendCall.messages[0].value);

      expect(messageValue.metadata.originalTopic).toBe('identity.account.events');
      expect(messageValue.metadata.error).toBe('Processing failed');
      expect(messageValue.metadata.dlqTimestamp).toBeDefined();
    });
  });

  describe('isProducerConnected', () => {
    it('should return false initially', () => {
      expect(service.isProducerConnected()).toBe(false);
    });

    it('should return true after connection', async () => {
      await service.connect();
      expect(service.isProducerConnected()).toBe(true);
    });

    it('should return false after disconnection', async () => {
      await service.connect();
      await service.disconnect();
      expect(service.isProducerConnected()).toBe(false);
    });
  });

  describe('onModuleInit', () => {
    it('should connect on module init', async () => {
      await service.onModuleInit();

      expect(mockProducer.connect).toHaveBeenCalled();
    });

    it('should not throw if connection fails', async () => {
      mockProducer.connect.mockRejectedValue(new Error('Connection failed'));

      await expect(service.onModuleInit()).resolves.not.toThrow();
    });
  });

  describe('onModuleDestroy', () => {
    it('should disconnect on module destroy', async () => {
      await service.connect();
      await service.onModuleDestroy();

      expect(mockProducer.disconnect).toHaveBeenCalled();
    });
  });
});

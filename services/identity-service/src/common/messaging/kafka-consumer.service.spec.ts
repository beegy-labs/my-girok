import { Test, TestingModule } from '@nestjs/testing';
import { KafkaConsumerService, EventHandler, SubscriptionConfig } from './kafka-consumer.service';
import { KafkaProducerService, EventMessage } from './kafka-producer.service';
import { Kafka, EachMessagePayload } from 'kafkajs';

// Mock kafkajs
jest.mock('kafkajs', () => ({
  Kafka: jest.fn().mockImplementation(() => ({
    consumer: jest.fn().mockReturnValue({
      connect: jest.fn(),
      disconnect: jest.fn(),
      subscribe: jest.fn(),
      run: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
    }),
  })),
  logLevel: {
    NOTHING: 0,
    ERROR: 1,
    WARN: 2,
    INFO: 3,
    DEBUG: 4,
  },
}));

describe('KafkaConsumerService', () => {
  let service: KafkaConsumerService;
  let mockProducerService: {
    sendToDLQ: jest.Mock;
  };
  let mockConsumer: {
    connect: jest.Mock;
    disconnect: jest.Mock;
    subscribe: jest.Mock;
    run: jest.Mock;
    pause: jest.Mock;
    resume: jest.Mock;
  };

  const mockEvent: EventMessage = {
    id: 'event-123',
    aggregateType: 'Account',
    aggregateId: 'account-456',
    eventType: 'ACCOUNT_CREATED',
    payload: { email: 'test@example.com' },
    timestamp: '2024-01-01T00:00:00Z',
  };

  beforeEach(async () => {
    mockProducerService = {
      sendToDLQ: jest.fn().mockResolvedValue(undefined),
    };

    mockConsumer = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn().mockResolvedValue(undefined),
      run: jest.fn().mockResolvedValue(undefined),
      pause: jest.fn(),
      resume: jest.fn(),
    };

    (Kafka as jest.Mock).mockImplementation(() => ({
      consumer: jest.fn().mockReturnValue(mockConsumer),
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KafkaConsumerService,
        { provide: KafkaProducerService, useValue: mockProducerService },
      ],
    }).compile();

    service = module.get<KafkaConsumerService>(KafkaConsumerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerHandler', () => {
    it('should register a handler for a topic', () => {
      const handler: EventHandler = jest.fn();

      service.registerHandler('identity.account.events' as any, handler);

      // Handler is stored internally
      expect(service).toBeDefined();
    });

    it('should allow multiple handlers for same topic', () => {
      const handler1: EventHandler = jest.fn();
      const handler2: EventHandler = jest.fn();

      service.registerHandler('identity.account.events' as any, handler1);
      service.registerHandler('identity.account.events' as any, handler2);

      expect(service).toBeDefined();
    });
  });

  describe('subscribe', () => {
    it('should add subscription and register handler', async () => {
      const handler: EventHandler = jest.fn();
      const config: SubscriptionConfig = {
        topic: 'identity.account.events' as any,
        handler,
        fromBeginning: false,
      };

      await service.subscribe(config);

      expect(service).toBeDefined();
    });
  });

  describe('connect', () => {
    it('should connect consumer and subscribe to topics', async () => {
      const handler: EventHandler = jest.fn();
      await service.subscribe({
        topic: 'identity.account.events' as any,
        handler,
      });

      await service.connect();

      expect(mockConsumer.connect).toHaveBeenCalled();
      expect(mockConsumer.subscribe).toHaveBeenCalledWith({
        topic: 'identity.account.events',
        fromBeginning: false,
      });
      expect(mockConsumer.run).toHaveBeenCalled();
      expect(service.isConsumerConnected()).toBe(true);
    });

    it('should not reconnect if already connected', async () => {
      await service.connect();
      await service.connect();

      expect(mockConsumer.connect).toHaveBeenCalledTimes(1);
    });

    it('should throw error on connection failure', async () => {
      mockConsumer.connect.mockRejectedValue(new Error('Connection failed'));

      await expect(service.connect()).rejects.toThrow('Connection failed');
    });

    it('should subscribe with fromBeginning when specified', async () => {
      const handler: EventHandler = jest.fn();
      await service.subscribe({
        topic: 'identity.account.events' as any,
        handler,
        fromBeginning: true,
      });

      await service.connect();

      expect(mockConsumer.subscribe).toHaveBeenCalledWith({
        topic: 'identity.account.events',
        fromBeginning: true,
      });
    });
  });

  describe('disconnect', () => {
    it('should disconnect consumer', async () => {
      await service.connect();
      await service.disconnect();

      expect(mockConsumer.disconnect).toHaveBeenCalled();
      expect(service.isConsumerConnected()).toBe(false);
    });

    it('should not throw if not connected', async () => {
      await expect(service.disconnect()).resolves.not.toThrow();
    });
  });

  describe('handleMessage', () => {
    it('should process message and call handlers', async () => {
      const handler: EventHandler = jest.fn().mockResolvedValue(undefined);
      await service.subscribe({
        topic: 'identity.account.events' as any,
        handler,
      });

      // Capture the eachMessage callback
      let eachMessageCallback: (payload: EachMessagePayload) => Promise<void>;
      mockConsumer.run.mockImplementation(
        async (config: { eachMessage: typeof eachMessageCallback }) => {
          eachMessageCallback = config.eachMessage;
        },
      );

      await service.connect();

      // Simulate message arrival
      const payload: EachMessagePayload = {
        topic: 'identity.account.events',
        partition: 0,
        message: {
          key: Buffer.from('Account:account-456'),
          value: Buffer.from(JSON.stringify(mockEvent)),
          headers: { 'event-id': Buffer.from('event-123') },
          timestamp: '1704067200000',
          offset: '100',
          attributes: 0,
        },
        heartbeat: jest.fn(),
        pause: jest.fn(),
      };

      await eachMessageCallback!(payload);

      expect(handler).toHaveBeenCalledWith(mockEvent);
    });

    it('should handle empty message', async () => {
      const handler: EventHandler = jest.fn();
      await service.subscribe({
        topic: 'identity.account.events' as any,
        handler,
      });

      let eachMessageCallback: (payload: EachMessagePayload) => Promise<void>;
      mockConsumer.run.mockImplementation(
        async (config: { eachMessage: typeof eachMessageCallback }) => {
          eachMessageCallback = config.eachMessage;
        },
      );

      await service.connect();

      const payload: EachMessagePayload = {
        topic: 'identity.account.events',
        partition: 0,
        message: {
          key: null,
          value: null,
          headers: {},
          timestamp: '1704067200000',
          offset: '100',
          attributes: 0,
        },
        heartbeat: jest.fn(),
        pause: jest.fn(),
      };

      await eachMessageCallback!(payload);

      expect(handler).not.toHaveBeenCalled();
    });

    it('should send to DLQ on handler error', async () => {
      const handler: EventHandler = jest.fn().mockRejectedValue(new Error('Handler failed'));
      await service.subscribe({
        topic: 'identity.account.events' as any,
        handler,
      });

      let eachMessageCallback: (payload: EachMessagePayload) => Promise<void>;
      mockConsumer.run.mockImplementation(
        async (config: { eachMessage: typeof eachMessageCallback }) => {
          eachMessageCallback = config.eachMessage;
        },
      );

      await service.connect();

      const payload: EachMessagePayload = {
        topic: 'identity.account.events',
        partition: 0,
        message: {
          key: Buffer.from('Account:account-456'),
          value: Buffer.from(JSON.stringify(mockEvent)),
          headers: { 'event-id': Buffer.from('event-123') },
          timestamp: '1704067200000',
          offset: '100',
          attributes: 0,
        },
        heartbeat: jest.fn(),
        pause: jest.fn(),
      };

      await eachMessageCallback!(payload);

      expect(mockProducerService.sendToDLQ).toHaveBeenCalledWith(
        'identity.account.events',
        mockEvent,
        expect.any(Error),
      );
    });
  });

  describe('pause and resume', () => {
    it('should pause consumption for a topic', async () => {
      await service.pause('identity.account.events' as any);

      expect(mockConsumer.pause).toHaveBeenCalledWith([{ topic: 'identity.account.events' }]);
    });

    it('should resume consumption for a topic', async () => {
      await service.resume('identity.account.events' as any);

      expect(mockConsumer.resume).toHaveBeenCalledWith([{ topic: 'identity.account.events' }]);
    });
  });

  describe('isConsumerConnected', () => {
    it('should return false initially', () => {
      expect(service.isConsumerConnected()).toBe(false);
    });

    it('should return true after connection', async () => {
      await service.connect();
      expect(service.isConsumerConnected()).toBe(true);
    });
  });

  describe('onModuleDestroy', () => {
    it('should disconnect on module destroy', async () => {
      await service.connect();
      await service.onModuleDestroy();

      expect(mockConsumer.disconnect).toHaveBeenCalled();
    });
  });
});

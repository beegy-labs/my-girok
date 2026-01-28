import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import { KafkaProducerService } from './kafka-producer.service';
import { RecordMetadata } from 'kafkajs';
import { EmailTemplate } from '../mail/mail.interface';
import { MailSendMessage } from './kafka.types';

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

// Mock kafka.config
vi.mock('./kafka.config', () => ({
  getKafkaConfig: () => ({
    clientId: 'mail-service-test',
    brokers: ['localhost:9092'],
    logLevel: 2,
  }),
  getTopics: () => ({
    MAIL_SEND: 'mail.send',
    MAIL_DLQ: 'mail.send.dlq',
    MAIL_STATUS: 'mail.status',
  }),
}));

describe('KafkaProducerService', () => {
  let service: KafkaProducerService;
  let mockProducer: typeof mockProducerMethods;
  let configService: { get: Mock };

  const mockMailMessage: Omit<MailSendMessage, 'id' | 'timestamp'> = {
    emailLogId: 'email-log-123',
    tenantId: 'tenant-001',
    accountId: 'account-001',
    toEmail: 'user@example.com',
    fromEmail: 'noreply@example.com',
    template: EmailTemplate.EMAIL_TEMPLATE_WELCOME,
    locale: 'en',
    variables: { name: 'John' },
    sourceService: 'auth-service',
    retryCount: 0,
  };

  const mockMetadata: RecordMetadata[] = [
    {
      topicName: 'mail.send',
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

    const mockConfigService = {
      get: vi.fn((key: string, defaultValue?: unknown) => {
        const config: Record<string, unknown> = {
          'kafka.brokers': 'localhost:9092',
        };
        return config[key] ?? defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [KafkaProducerService, { provide: ConfigService, useValue: mockConfigService }],
    }).compile();

    service = module.get<KafkaProducerService>(KafkaProducerService);
    configService = module.get(ConfigService);
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
      expect(service.isProducerConnected()).toBe(false);
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
      expect(mockProducer.disconnect).not.toHaveBeenCalled();
    });

    it('should handle disconnect errors gracefully', async () => {
      await service.connect();
      mockProducer.disconnect.mockRejectedValue(new Error('Disconnect error'));

      await expect(service.disconnect()).resolves.not.toThrow();
    });
  });

  describe('publishMailSend', () => {
    it('should publish email message to mail.send topic', async () => {
      await service.connect();
      const messageId = await service.publishMailSend(mockMailMessage);

      expect(messageId).toBeDefined();
      expect(mockProducer.send).toHaveBeenCalledWith(
        expect.objectContaining({
          topic: 'mail.send',
          messages: expect.arrayContaining([
            expect.objectContaining({
              key: 'email-log-123',
              value: expect.any(String),
            }),
          ]),
        }),
      );
    });

    it('should auto-connect if not connected', async () => {
      await service.publishMailSend(mockMailMessage);

      expect(mockProducer.connect).toHaveBeenCalled();
      expect(mockProducer.send).toHaveBeenCalled();
    });

    it('should include message headers', async () => {
      await service.connect();
      await service.publishMailSend(mockMailMessage);

      const sendCall = mockProducer.send.mock.calls[0][0];
      expect(sendCall.messages[0].headers).toEqual(
        expect.objectContaining({
          'message-id': expect.any(String),
          'message-type': 'new',
          timestamp: expect.any(String),
        }),
      );
    });

    it('should generate unique message ID', async () => {
      await service.connect();

      const id1 = await service.publishMailSend(mockMailMessage);
      const id2 = await service.publishMailSend(mockMailMessage);

      expect(id1).not.toBe(id2);
    });

    it('should set message-type to retry for retry messages', async () => {
      await service.connect();
      await service.publishMailSend({ ...mockMailMessage, retryCount: 1 });

      const sendCall = mockProducer.send.mock.calls[0][0];
      expect(sendCall.messages[0].headers['message-type']).toBe('retry');
    });

    it('should include timestamp in message', async () => {
      await service.connect();
      await service.publishMailSend(mockMailMessage);

      const sendCall = mockProducer.send.mock.calls[0][0];
      const message = JSON.parse(sendCall.messages[0].value);
      expect(message.timestamp).toBeDefined();
      expect(new Date(message.timestamp).getTime()).not.toBeNaN();
    });
  });

  describe('publishMailStatus', () => {
    it('should publish status update to mail.status topic', async () => {
      await service.connect();
      await service.publishMailStatus({
        emailLogId: 'email-log-123',
        eventType: 'delivered',
        details: { smtpResponse: '250 OK' },
      });

      expect(mockProducer.send).toHaveBeenCalledWith(
        expect.objectContaining({
          topic: 'mail.status',
        }),
      );
    });

    it('should set message-type to event type', async () => {
      await service.connect();
      await service.publishMailStatus({
        emailLogId: 'email-log-123',
        eventType: 'bounced',
        details: {},
      });

      const sendCall = mockProducer.send.mock.calls[0][0];
      expect(sendCall.messages[0].headers['message-type']).toBe('bounced');
    });
  });

  describe('sendToDlq', () => {
    it('should send failed message to DLQ topic', async () => {
      await service.connect();
      const error = new Error('Processing failed');
      const originalMessage: MailSendMessage = {
        ...mockMailMessage,
        id: 'msg-123',
        timestamp: new Date().toISOString(),
      };

      await service.sendToDlq(originalMessage, error, 'mail.send');

      expect(mockProducer.send).toHaveBeenCalledWith(
        expect.objectContaining({
          topic: 'mail.send.dlq',
        }),
      );
    });

    it('should include error details in DLQ message', async () => {
      await service.connect();
      const error = new Error('Processing failed');
      error.stack = 'Error stack trace';

      const originalMessage: MailSendMessage = {
        ...mockMailMessage,
        id: 'msg-123',
        timestamp: new Date().toISOString(),
      };

      await service.sendToDlq(originalMessage, error, 'mail.send');

      const sendCall = mockProducer.send.mock.calls[0][0];
      const dlqMessage = JSON.parse(sendCall.messages[0].value);

      expect(dlqMessage.errorMessage).toBe('Processing failed');
      expect(dlqMessage.errorStack).toBe('Error stack trace');
      expect(dlqMessage.originalTopic).toBe('mail.send');
      expect(dlqMessage.dlqTimestamp).toBeDefined();
    });

    it('should preserve original message data in DLQ', async () => {
      await service.connect();
      const error = new Error('Processing failed');
      const originalMessage: MailSendMessage = {
        ...mockMailMessage,
        id: 'msg-123',
        timestamp: '2024-01-01T00:00:00Z',
      };

      await service.sendToDlq(originalMessage, error, 'mail.send');

      const sendCall = mockProducer.send.mock.calls[0][0];
      const dlqMessage = JSON.parse(sendCall.messages[0].value);

      expect(dlqMessage.emailLogId).toBe('email-log-123');
      expect(dlqMessage.toEmail).toBe('user@example.com');
      expect(dlqMessage.template).toBe(EmailTemplate.EMAIL_TEMPLATE_WELCOME);
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

  describe('isKafkaEnabled', () => {
    it('should return true when brokers are configured', () => {
      expect(service.isKafkaEnabled()).toBe(true);
    });

    it('should return false when brokers are not configured', async () => {
      const mockConfigServiceDisabled = {
        get: vi.fn((key: string, defaultValue?: unknown) => {
          return defaultValue;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          KafkaProducerService,
          { provide: ConfigService, useValue: mockConfigServiceDisabled },
        ],
      }).compile();

      const disabledService = module.get<KafkaProducerService>(KafkaProducerService);
      expect(disabledService.isKafkaEnabled()).toBe(false);
    });
  });

  describe('onModuleInit', () => {
    it('should connect on module init when enabled', async () => {
      await service.onModuleInit();

      expect(mockProducer.connect).toHaveBeenCalled();
    });

    it('should not throw if connection fails during init', async () => {
      mockProducer.connect.mockRejectedValue(new Error('Connection failed'));

      await expect(service.onModuleInit()).resolves.not.toThrow();
    });

    it('should not connect when Kafka is disabled', async () => {
      const mockConfigServiceDisabled = {
        get: vi.fn((key: string, defaultValue?: unknown) => defaultValue),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          KafkaProducerService,
          { provide: ConfigService, useValue: mockConfigServiceDisabled },
        ],
      }).compile();

      const disabledService = module.get<KafkaProducerService>(KafkaProducerService);
      mockProducer.connect.mockClear();

      await disabledService.onModuleInit();

      expect(mockProducer.connect).not.toHaveBeenCalled();
    });
  });

  describe('onModuleDestroy', () => {
    it('should disconnect on module destroy', async () => {
      await service.connect();
      await service.onModuleDestroy();

      expect(mockProducer.disconnect).toHaveBeenCalled();
    });
  });

  describe('publish with Kafka disabled', () => {
    let disabledService: KafkaProducerService;

    beforeEach(async () => {
      const mockConfigServiceDisabled = {
        get: vi.fn((key: string, defaultValue?: unknown) => defaultValue),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          KafkaProducerService,
          { provide: ConfigService, useValue: mockConfigServiceDisabled },
        ],
      }).compile();

      disabledService = module.get<KafkaProducerService>(KafkaProducerService);
      mockProducer.send.mockClear();
    });

    it('should not publish when Kafka is disabled', async () => {
      const messageId = await disabledService.publishMailSend(mockMailMessage);

      expect(messageId).toBeDefined(); // Still returns an ID
      expect(mockProducer.send).not.toHaveBeenCalled();
    });
  });
});

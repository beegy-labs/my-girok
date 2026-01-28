import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import { EachMessagePayload } from 'kafkajs';
import { KafkaConsumerService } from './kafka-consumer.service';
import { KafkaProducerService } from './kafka-producer.service';
import { SesService } from '../ses/ses.service';
import { TemplateService } from '../templates/template.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EmailTemplate } from '../mail/mail.interface';
import { MailSendMessage } from './kafka.types';

// Create mock consumer outside the module mock for reference
const mockConsumerMethods = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  subscribe: vi.fn(),
  run: vi.fn(),
};

// Mock kafkajs
vi.mock('kafkajs', () => {
  return {
    Kafka: class MockKafka {
      consumer() {
        return mockConsumerMethods;
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
  getConsumerGroupId: () => 'mail-service-consumer-test',
  getTopics: () => ({
    MAIL_SEND: 'mail.send',
    MAIL_DLQ: 'mail.send.dlq',
    MAIL_STATUS: 'mail.status',
  }),
}));

describe('KafkaConsumerService', () => {
  let service: KafkaConsumerService;
  let mockConsumer: typeof mockConsumerMethods;
  let mockProducerService: {
    sendToDlq: Mock;
    publishMailSend: Mock;
  };
  let mockSesService: {
    sendEmail: Mock;
  };
  let mockTemplateService: {
    templateEnumToName: Mock;
    render: Mock;
  };
  let mockPrismaService: {
    emailLog: { update: Mock };
  };
  let mockAuditService: {
    logEmailSent: Mock;
  };

  const mockMailMessage: MailSendMessage = {
    id: 'msg-123',
    emailLogId: 'email-log-123',
    tenantId: 'tenant-001',
    accountId: 'account-001',
    toEmail: 'user@example.com',
    fromEmail: 'noreply@example.com',
    template: EmailTemplate.EMAIL_TEMPLATE_PASSWORD_RESET,
    locale: 'en',
    variables: { resetLink: 'https://example.com/reset' },
    sourceService: 'auth-service',
    retryCount: 0,
    timestamp: '2024-01-01T00:00:00Z',
  };

  beforeEach(async () => {
    // Reset mock consumer methods
    mockConsumer = mockConsumerMethods;
    mockConsumer.connect.mockResolvedValue(undefined);
    mockConsumer.disconnect.mockResolvedValue(undefined);
    mockConsumer.subscribe.mockResolvedValue(undefined);
    mockConsumer.run.mockResolvedValue(undefined);

    mockProducerService = {
      sendToDlq: vi.fn().mockResolvedValue(undefined),
      publishMailSend: vi.fn().mockResolvedValue('new-msg-id'),
    };

    mockSesService = {
      sendEmail: vi.fn().mockResolvedValue({
        success: true,
        messageId: 'ses-msg-123',
      }),
    };

    mockTemplateService = {
      templateEnumToName: vi.fn().mockReturnValue('password-reset'),
      render: vi.fn().mockResolvedValue({
        subject: 'Password Reset Request',
        body: '<p>Reset your password</p>',
      }),
    };

    mockPrismaService = {
      emailLog: {
        update: vi.fn().mockResolvedValue({}),
      },
    };

    mockAuditService = {
      logEmailSent: vi.fn().mockResolvedValue(undefined),
    };

    const mockConfigService = {
      get: vi.fn((key: string, defaultValue?: unknown) => {
        const config: Record<string, unknown> = {
          'kafka.brokers': 'localhost:9092',
          'retry.maxAttempts': 3,
          'retry.backoffMs': 1000,
        };
        return config[key] ?? defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KafkaConsumerService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: KafkaProducerService, useValue: mockProducerService },
        { provide: SesService, useValue: mockSesService },
        { provide: TemplateService, useValue: mockTemplateService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<KafkaConsumerService>(KafkaConsumerService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('connect', () => {
    it('should connect consumer and subscribe to mail.send topic', async () => {
      await service.connect();

      expect(mockConsumer.connect).toHaveBeenCalled();
      expect(mockConsumer.subscribe).toHaveBeenCalledWith({
        topic: 'mail.send',
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
      expect(service.isConsumerConnected()).toBe(false);
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
      expect(mockConsumer.disconnect).not.toHaveBeenCalled();
    });

    it('should handle disconnect errors gracefully', async () => {
      await service.connect();
      mockConsumer.disconnect.mockRejectedValue(new Error('Disconnect error'));

      await expect(service.disconnect()).resolves.not.toThrow();
    });
  });

  describe('message processing', () => {
    let eachMessageCallback: (payload: EachMessagePayload) => Promise<void>;

    beforeEach(async () => {
      // Capture the eachMessage callback
      mockConsumer.run.mockImplementation(
        async (config: { eachMessage: typeof eachMessageCallback }) => {
          eachMessageCallback = config.eachMessage;
        },
      );

      await service.connect();
    });

    it('should process message and send email via SES', async () => {
      const payload: EachMessagePayload = {
        topic: 'mail.send',
        partition: 0,
        message: {
          key: Buffer.from('email-log-123'),
          value: Buffer.from(JSON.stringify(mockMailMessage)),
          headers: { 'message-id': Buffer.from('msg-123') },
          timestamp: '1704067200000',
          offset: '100',
          attributes: 0,
        },
        heartbeat: vi.fn(),
        pause: vi.fn(),
      };

      await eachMessageCallback(payload);

      expect(mockTemplateService.render).toHaveBeenCalledWith(
        'password-reset',
        'en',
        mockMailMessage.variables,
      );
      expect(mockSesService.sendEmail).toHaveBeenCalledWith({
        to: 'user@example.com',
        from: 'noreply@example.com',
        subject: 'Password Reset Request',
        htmlBody: '<p>Reset your password</p>',
        emailLogId: 'email-log-123',
      });
    });

    it('should update email status to SENT on success', async () => {
      const payload: EachMessagePayload = {
        topic: 'mail.send',
        partition: 0,
        message: {
          key: Buffer.from('email-log-123'),
          value: Buffer.from(JSON.stringify(mockMailMessage)),
          headers: {},
          timestamp: '1704067200000',
          offset: '100',
          attributes: 0,
        },
        heartbeat: vi.fn(),
        pause: vi.fn(),
      };

      await eachMessageCallback(payload);

      expect(mockPrismaService.emailLog.update).toHaveBeenCalledWith({
        where: { id: 'email-log-123' },
        data: expect.objectContaining({
          status: 'SENT',
          messageId: 'ses-msg-123',
          sentAt: expect.any(Date),
        }),
      });
    });

    it('should log to audit service for auth templates', async () => {
      const payload: EachMessagePayload = {
        topic: 'mail.send',
        partition: 0,
        message: {
          key: Buffer.from('email-log-123'),
          value: Buffer.from(JSON.stringify(mockMailMessage)),
          headers: {},
          timestamp: '1704067200000',
          offset: '100',
          attributes: 0,
        },
        heartbeat: vi.fn(),
        pause: vi.fn(),
      };

      await eachMessageCallback(payload);

      expect(mockAuditService.logEmailSent).toHaveBeenCalledWith({
        tenantId: 'tenant-001',
        accountId: 'account-001',
        template: 'password-reset',
        toEmail: 'user@example.com',
        success: true,
        errorMessage: undefined,
        emailLogId: 'email-log-123',
      });
    });

    it('should not log to audit for non-auth templates', async () => {
      const welcomeMessage = {
        ...mockMailMessage,
        template: EmailTemplate.EMAIL_TEMPLATE_WELCOME,
      };
      mockTemplateService.templateEnumToName.mockReturnValue('welcome');

      const payload: EachMessagePayload = {
        topic: 'mail.send',
        partition: 0,
        message: {
          key: Buffer.from('email-log-123'),
          value: Buffer.from(JSON.stringify(welcomeMessage)),
          headers: {},
          timestamp: '1704067200000',
          offset: '100',
          attributes: 0,
        },
        heartbeat: vi.fn(),
        pause: vi.fn(),
      };

      await eachMessageCallback(payload);

      // Welcome template is not in auth templates list
      // Based on the code, WELCOME is not in authTemplates
      expect(mockAuditService.logEmailSent).not.toHaveBeenCalled();
    });

    it('should skip empty messages', async () => {
      const payload: EachMessagePayload = {
        topic: 'mail.send',
        partition: 0,
        message: {
          key: null,
          value: null,
          headers: {},
          timestamp: '1704067200000',
          offset: '100',
          attributes: 0,
        },
        heartbeat: vi.fn(),
        pause: vi.fn(),
      };

      await eachMessageCallback(payload);

      expect(mockSesService.sendEmail).not.toHaveBeenCalled();
    });
  });

  describe('retry logic', () => {
    let eachMessageCallback: (payload: EachMessagePayload) => Promise<void>;

    beforeEach(async () => {
      mockConsumer.run.mockImplementation(
        async (config: { eachMessage: typeof eachMessageCallback }) => {
          eachMessageCallback = config.eachMessage;
        },
      );

      await service.connect();
    });

    it('should retry message on failure when retryCount < maxRetries', async () => {
      mockSesService.sendEmail.mockResolvedValue({
        success: false,
        error: 'SES error',
      });

      const payload: EachMessagePayload = {
        topic: 'mail.send',
        partition: 0,
        message: {
          key: Buffer.from('email-log-123'),
          value: Buffer.from(JSON.stringify(mockMailMessage)),
          headers: {},
          timestamp: '1704067200000',
          offset: '100',
          attributes: 0,
        },
        heartbeat: vi.fn(),
        pause: vi.fn(),
      };

      await eachMessageCallback(payload);

      // Should republish with incremented retry count
      expect(mockProducerService.publishMailSend).toHaveBeenCalledWith(
        expect.objectContaining({
          retryCount: 1,
        }),
      );
    });

    it('should send to DLQ when max retries exceeded', async () => {
      mockSesService.sendEmail.mockResolvedValue({
        success: false,
        error: 'SES error',
      });

      const maxRetriedMessage = {
        ...mockMailMessage,
        retryCount: 3, // Already at max
      };

      const payload: EachMessagePayload = {
        topic: 'mail.send',
        partition: 0,
        message: {
          key: Buffer.from('email-log-123'),
          value: Buffer.from(JSON.stringify(maxRetriedMessage)),
          headers: {},
          timestamp: '1704067200000',
          offset: '100',
          attributes: 0,
        },
        heartbeat: vi.fn(),
        pause: vi.fn(),
      };

      await eachMessageCallback(payload);

      expect(mockProducerService.sendToDlq).toHaveBeenCalledWith(
        expect.objectContaining({ emailLogId: 'email-log-123' }),
        expect.any(Error),
        'mail.send',
      );
    });

    it('should update status to FAILED when sent to DLQ', async () => {
      mockSesService.sendEmail.mockResolvedValue({
        success: false,
        error: 'SES error',
      });

      const maxRetriedMessage = {
        ...mockMailMessage,
        retryCount: 3,
      };

      const payload: EachMessagePayload = {
        topic: 'mail.send',
        partition: 0,
        message: {
          key: Buffer.from('email-log-123'),
          value: Buffer.from(JSON.stringify(maxRetriedMessage)),
          headers: {},
          timestamp: '1704067200000',
          offset: '100',
          attributes: 0,
        },
        heartbeat: vi.fn(),
        pause: vi.fn(),
      };

      await eachMessageCallback(payload);

      expect(mockPrismaService.emailLog.update).toHaveBeenCalledWith({
        where: { id: 'email-log-123' },
        data: expect.objectContaining({
          status: 'FAILED',
          error: expect.any(String),
        }),
      });
    });

    it('should log failure to audit service on DLQ', async () => {
      mockSesService.sendEmail.mockResolvedValue({
        success: false,
        error: 'SES error',
      });

      const maxRetriedMessage = {
        ...mockMailMessage,
        retryCount: 3,
      };

      const payload: EachMessagePayload = {
        topic: 'mail.send',
        partition: 0,
        message: {
          key: Buffer.from('email-log-123'),
          value: Buffer.from(JSON.stringify(maxRetriedMessage)),
          headers: {},
          timestamp: '1704067200000',
          offset: '100',
          attributes: 0,
        },
        heartbeat: vi.fn(),
        pause: vi.fn(),
      };

      await eachMessageCallback(payload);

      expect(mockAuditService.logEmailSent).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errorMessage: expect.any(String),
        }),
      );
    });
  });

  describe('DLQ handling', () => {
    let eachMessageCallback: (payload: EachMessagePayload) => Promise<void>;

    beforeEach(async () => {
      mockConsumer.run.mockImplementation(
        async (config: { eachMessage: typeof eachMessageCallback }) => {
          eachMessageCallback = config.eachMessage;
        },
      );

      await service.connect();
    });

    it('should send message to DLQ with proper format', async () => {
      mockSesService.sendEmail.mockRejectedValue(new Error('SES connection error'));

      const maxRetriedMessage = {
        ...mockMailMessage,
        retryCount: 3,
      };

      const payload: EachMessagePayload = {
        topic: 'mail.send',
        partition: 0,
        message: {
          key: Buffer.from('email-log-123'),
          value: Buffer.from(JSON.stringify(maxRetriedMessage)),
          headers: {},
          timestamp: '1704067200000',
          offset: '100',
          attributes: 0,
        },
        heartbeat: vi.fn(),
        pause: vi.fn(),
      };

      await eachMessageCallback(payload);

      expect(mockProducerService.sendToDlq).toHaveBeenCalledWith(
        maxRetriedMessage,
        expect.objectContaining({ message: 'SES connection error' }),
        'mail.send',
      );
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

    it('should return false after disconnection', async () => {
      await service.connect();
      await service.disconnect();
      expect(service.isConsumerConnected()).toBe(false);
    });
  });

  describe('onModuleInit', () => {
    it('should connect on module init when enabled', async () => {
      await service.onModuleInit();

      expect(mockConsumer.connect).toHaveBeenCalled();
    });

    it('should not throw if connection fails during init', async () => {
      mockConsumer.connect.mockRejectedValue(new Error('Connection failed'));

      await expect(service.onModuleInit()).resolves.not.toThrow();
    });

    it('should not connect when Kafka is disabled', async () => {
      const mockConfigServiceDisabled = {
        get: vi.fn((key: string, defaultValue?: unknown) => defaultValue),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          KafkaConsumerService,
          { provide: ConfigService, useValue: mockConfigServiceDisabled },
          { provide: KafkaProducerService, useValue: mockProducerService },
          { provide: SesService, useValue: mockSesService },
          { provide: TemplateService, useValue: mockTemplateService },
          { provide: PrismaService, useValue: mockPrismaService },
          { provide: AuditService, useValue: mockAuditService },
        ],
      }).compile();

      const disabledService = module.get<KafkaConsumerService>(KafkaConsumerService);
      mockConsumer.connect.mockClear();

      await disabledService.onModuleInit();

      expect(mockConsumer.connect).not.toHaveBeenCalled();
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

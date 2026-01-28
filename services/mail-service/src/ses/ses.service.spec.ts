import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import { SesService } from './ses.service';
import {
  MessageRejected,
  MailFromDomainNotVerifiedException,
  ConfigurationSetDoesNotExistException,
} from '@aws-sdk/client-ses';

// Mock SESClient and SendEmailCommand
const mockSend = vi.fn();

vi.mock('@aws-sdk/client-ses', async () => {
  const actual = await vi.importActual('@aws-sdk/client-ses');
  return {
    ...actual,
    SESClient: class MockSESClient {
      send = mockSend;
    },
    SendEmailCommand: class MockSendEmailCommand {
      constructor(public input: unknown) {}
    },
    VerifyEmailIdentityCommand: class MockVerifyEmailIdentityCommand {
      constructor(public input: { EmailAddress: string }) {}
    },
    MessageRejected: class MessageRejected extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'MessageRejected';
      }
    },
    MailFromDomainNotVerifiedException: class MailFromDomainNotVerifiedException extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'MailFromDomainNotVerifiedException';
      }
    },
    ConfigurationSetDoesNotExistException: class ConfigurationSetDoesNotExistException extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'ConfigurationSetDoesNotExistException';
      }
    },
  };
});

describe('SesService', () => {
  let service: SesService;
  let configService: { get: Mock };

  const createMockConfigService = (enabled: boolean = true) => ({
    get: vi.fn((key: string, defaultValue?: unknown) => {
      const config: Record<string, unknown> = {
        'ses.configurationSet': 'mail-tracking',
        'ses.fromAddresses.default': 'noreply@example.com',
        'ses.region': 'ap-northeast-2',
        ...(enabled && {
          'ses.accessKeyId': 'test-access-key',
          'ses.secretAccessKey': 'test-secret-key',
        }),
      };
      return config[key] ?? defaultValue;
    }),
  });

  beforeEach(async () => {
    mockSend.mockReset();
    mockSend.mockResolvedValue({
      MessageId: 'ses-msg-123',
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [SesService, { provide: ConfigService, useValue: createMockConfigService(true) }],
    }).compile();

    service = module.get<SesService>(SesService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('sendEmail', () => {
    it('should send email via AWS SES', async () => {
      const result = await service.sendEmail({
        to: 'user@example.com',
        from: 'noreply@example.com',
        subject: 'Test Email',
        htmlBody: '<p>Hello World</p>',
        emailLogId: 'email-log-123',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('ses-msg-123');
      expect(mockSend).toHaveBeenCalled();
    });

    it('should include CC and BCC recipients when provided', async () => {
      await service.sendEmail({
        to: 'user@example.com',
        from: 'noreply@example.com',
        subject: 'Test Email',
        htmlBody: '<p>Hello World</p>',
        cc: ['cc@example.com'],
        bcc: ['bcc@example.com'],
      });

      const command = mockSend.mock.calls[0][0];
      expect(command.input.Destination.CcAddresses).toEqual(['cc@example.com']);
      expect(command.input.Destination.BccAddresses).toEqual(['bcc@example.com']);
    });

    it('should include reply-to address when provided', async () => {
      await service.sendEmail({
        to: 'user@example.com',
        from: 'noreply@example.com',
        subject: 'Test Email',
        htmlBody: '<p>Hello World</p>',
        replyTo: 'support@example.com',
      });

      const command = mockSend.mock.calls[0][0];
      expect(command.input.ReplyToAddresses).toEqual(['support@example.com']);
    });

    it('should include text body when provided', async () => {
      await service.sendEmail({
        to: 'user@example.com',
        from: 'noreply@example.com',
        subject: 'Test Email',
        htmlBody: '<p>Hello World</p>',
        textBody: 'Hello World',
      });

      const command = mockSend.mock.calls[0][0];
      expect(command.input.Message.Body.Text).toEqual({
        Data: 'Hello World',
        Charset: 'UTF-8',
      });
    });

    it('should include emailLogId in tags when provided', async () => {
      await service.sendEmail({
        to: 'user@example.com',
        from: 'noreply@example.com',
        subject: 'Test Email',
        htmlBody: '<p>Hello World</p>',
        emailLogId: 'email-log-123',
      });

      const command = mockSend.mock.calls[0][0];
      expect(command.input.Tags).toEqual([{ Name: 'emailLogId', Value: 'email-log-123' }]);
    });

    it('should use default from email when not provided', async () => {
      await service.sendEmail({
        to: 'user@example.com',
        from: '',
        subject: 'Test Email',
        htmlBody: '<p>Hello World</p>',
      });

      const command = mockSend.mock.calls[0][0];
      expect(command.input.Source).toBe('noreply@example.com');
    });

    it('should include configuration set', async () => {
      await service.sendEmail({
        to: 'user@example.com',
        from: 'noreply@example.com',
        subject: 'Test Email',
        htmlBody: '<p>Hello World</p>',
      });

      const command = mockSend.mock.calls[0][0];
      expect(command.input.ConfigurationSetName).toBe('mail-tracking');
    });
  });

  describe('error handling', () => {
    it('should handle MessageRejected error', async () => {
      const error = new MessageRejected({ message: 'Message rejected', $metadata: {} });
      mockSend.mockRejectedValue(error);

      const result = await service.sendEmail({
        to: 'user@example.com',
        from: 'noreply@example.com',
        subject: 'Test',
        htmlBody: '<p>Test</p>',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email rejected by SES');
      expect(result.errorCode).toBe('MESSAGE_REJECTED');
    });

    it('should handle MailFromDomainNotVerifiedException error', async () => {
      const error = new MailFromDomainNotVerifiedException({
        message: 'Domain not verified',
        $metadata: {},
      });
      mockSend.mockRejectedValue(error);

      const result = await service.sendEmail({
        to: 'user@example.com',
        from: 'noreply@unverified.com',
        subject: 'Test',
        htmlBody: '<p>Test</p>',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Sender domain not verified in SES');
      expect(result.errorCode).toBe('DOMAIN_NOT_VERIFIED');
    });

    it('should handle ConfigurationSetDoesNotExistException error', async () => {
      const error = new ConfigurationSetDoesNotExistException({
        message: 'Config set not found',
        $metadata: {},
      });
      mockSend.mockRejectedValue(error);

      const result = await service.sendEmail({
        to: 'user@example.com',
        from: 'noreply@example.com',
        subject: 'Test',
        htmlBody: '<p>Test</p>',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('SES configuration set not found');
      expect(result.errorCode).toBe('CONFIG_SET_NOT_FOUND');
    });

    it('should handle generic errors', async () => {
      mockSend.mockRejectedValue(new Error('Network error'));

      const result = await service.sendEmail({
        to: 'user@example.com',
        from: 'noreply@example.com',
        subject: 'Test',
        htmlBody: '<p>Test</p>',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(result.errorCode).toBe('SEND_FAILED');
    });

    it('should handle non-Error exceptions', async () => {
      mockSend.mockRejectedValue('String error');

      const result = await service.sendEmail({
        to: 'user@example.com',
        from: 'noreply@example.com',
        subject: 'Test',
        htmlBody: '<p>Test</p>',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('String error');
    });
  });

  describe('dry run mode (SES disabled)', () => {
    let disabledService: SesService;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SesService,
          { provide: ConfigService, useValue: createMockConfigService(false) },
        ],
      }).compile();

      disabledService = module.get<SesService>(SesService);
    });

    it('should return success in dry run mode', async () => {
      mockSend.mockClear();

      const result = await disabledService.sendEmail({
        to: 'user@example.com',
        from: 'noreply@example.com',
        subject: 'Test Email',
        htmlBody: '<p>Hello World</p>',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toContain('dry-run-');
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should indicate SES is disabled', () => {
      expect(disabledService.isSesEnabled()).toBe(false);
    });
  });

  describe('verifyEmailIdentity', () => {
    it('should send verification request when enabled', async () => {
      mockSend.mockResolvedValue({});

      const result = await service.verifyEmailIdentity('verify@example.com');

      expect(result).toBe(true);
      expect(mockSend).toHaveBeenCalled();
    });

    it('should return false on verification failure', async () => {
      mockSend.mockRejectedValue(new Error('Verification failed'));

      const result = await service.verifyEmailIdentity('invalid@example.com');

      expect(result).toBe(false);
    });

    it('should return true in dry run mode without sending', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SesService,
          { provide: ConfigService, useValue: createMockConfigService(false) },
        ],
      }).compile();

      const disabledService = module.get<SesService>(SesService);
      mockSend.mockClear();

      const result = await disabledService.verifyEmailIdentity('verify@example.com');

      expect(result).toBe(true);
      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  describe('isSesEnabled', () => {
    it('should return true when credentials are configured', () => {
      expect(service.isSesEnabled()).toBe(true);
    });

    it('should return false when credentials are not configured', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SesService,
          { provide: ConfigService, useValue: createMockConfigService(false) },
        ],
      }).compile();

      const disabledService = module.get<SesService>(SesService);
      expect(disabledService.isSesEnabled()).toBe(false);
    });
  });

  describe('getDefaultFromEmail', () => {
    it('should return the default from email', () => {
      expect(service.getDefaultFromEmail()).toBe('noreply@example.com');
    });
  });

  describe('onModuleInit', () => {
    it('should initialize without error when enabled', async () => {
      await expect(service.onModuleInit()).resolves.not.toThrow();
    });

    it('should log warning when disabled', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SesService,
          { provide: ConfigService, useValue: createMockConfigService(false) },
        ],
      }).compile();

      const disabledService = module.get<SesService>(SesService);
      await expect(disabledService.onModuleInit()).resolves.not.toThrow();
    });
  });

  describe('message formatting', () => {
    it('should set UTF-8 charset for subject', async () => {
      await service.sendEmail({
        to: 'user@example.com',
        from: 'noreply@example.com',
        subject: 'Test Subject',
        htmlBody: '<p>Test</p>',
      });

      const command = mockSend.mock.calls[0][0];
      expect(command.input.Message.Subject).toEqual({
        Data: 'Test Subject',
        Charset: 'UTF-8',
      });
    });

    it('should set UTF-8 charset for HTML body', async () => {
      await service.sendEmail({
        to: 'user@example.com',
        from: 'noreply@example.com',
        subject: 'Test',
        htmlBody: '<p>Test Body</p>',
      });

      const command = mockSend.mock.calls[0][0];
      expect(command.input.Message.Body.Html).toEqual({
        Data: '<p>Test Body</p>',
        Charset: 'UTF-8',
      });
    });
  });
});

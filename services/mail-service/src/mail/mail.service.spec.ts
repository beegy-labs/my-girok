import { Test, TestingModule } from '@nestjs/testing';
import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import { MailService } from './mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { TemplateService } from '../templates/template.service';
import { KafkaProducerService } from '../kafka/kafka-producer.service';
import { SesService } from '../ses/ses.service';
import { EmailTemplate, EmailStatus } from './mail.interface';

// Type for mocked Prisma service
type MockPrismaEmailLog = {
  findUnique: Mock;
  findMany: Mock;
  create: Mock;
  update: Mock;
  updateMany: Mock;
  count: Mock;
};

type MockPrismaInbox = {
  findUnique: Mock;
  findMany: Mock;
  create: Mock;
  update: Mock;
  updateMany: Mock;
  count: Mock;
};

describe('MailService', () => {
  let service: MailService;
  let prisma: { emailLog: MockPrismaEmailLog; inbox: MockPrismaInbox; $transaction: Mock };
  let templateService: {
    templateEnumToName: Mock;
    render: Mock;
  };
  let kafkaProducer: {
    isKafkaEnabled: Mock;
    publishMailSend: Mock;
  };

  const mockEmailLog = {
    id: 'email-log-123',
    tenantId: 'tenant-001',
    accountId: 'account-001',
    sourceService: 'auth-service',
    fromEmail: 'noreply@example.com',
    toEmail: 'user@example.com',
    template: 'WELCOME',
    locale: 'en',
    subject: 'Welcome to Example!',
    status: 'PENDING',
    metadata: {},
    messageId: null,
    error: null,
    sentAt: null,
    openedAt: null,
    clickedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockInbox = {
    id: 'inbox-123',
    tenantId: 'tenant-001',
    accountId: 'account-001',
    emailLogId: 'email-log-123',
    readAt: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    emailLog: mockEmailLog,
  };

  beforeEach(async () => {
    const mockEmailLogCreate = vi.fn();
    const mockInboxCreate = vi.fn();

    const mockPrisma = {
      emailLog: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: mockEmailLogCreate,
        update: vi.fn(),
        updateMany: vi.fn(),
        count: vi.fn(),
      },
      inbox: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: mockInboxCreate,
        update: vi.fn(),
        updateMany: vi.fn(),
        count: vi.fn(),
      },
      // Mock $transaction - execute callback with transaction context
      $transaction: vi.fn().mockImplementation(async (callback: unknown) => {
        const tx = {
          emailLog: { create: mockEmailLogCreate },
          inbox: { create: mockInboxCreate },
        };
        return (callback as (tx: typeof tx) => Promise<unknown>)(tx);
      }),
    };

    const mockTemplateService = {
      templateEnumToName: vi.fn().mockReturnValue('welcome'),
      render: vi.fn().mockResolvedValue({
        subject: 'Welcome to Example!',
        body: '<p>Welcome!</p>',
      }),
    };

    const mockKafkaProducer = {
      isKafkaEnabled: vi.fn().mockReturnValue(true),
      publishMailSend: vi.fn().mockResolvedValue('message-id-123'),
    };

    const mockSesService = {
      sendEmail: vi.fn().mockResolvedValue({ success: true, messageId: 'ses-msg-123' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TemplateService, useValue: mockTemplateService },
        { provide: KafkaProducerService, useValue: mockKafkaProducer },
        { provide: SesService, useValue: mockSesService },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
    prisma = module.get(PrismaService);
    templateService = module.get(TemplateService);
    kafkaProducer = module.get(KafkaProducerService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('sendEmail', () => {
    it('should create EmailLog and publish to Kafka', async () => {
      prisma.emailLog.create.mockResolvedValue(mockEmailLog);

      const result = await service.sendEmail({
        tenantId: 'tenant-001',
        accountId: 'account-001',
        toEmail: 'user@example.com',
        template: EmailTemplate.EMAIL_TEMPLATE_WELCOME,
        locale: 'en',
        variables: { name: 'John' },
        sourceService: 'auth-service',
        fromEmail: 'noreply@example.com',
      });

      expect(result.success).toBe(true);
      expect(result.emailLogId).toBe('email-log-123');
      expect(prisma.emailLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'tenant-001',
          accountId: 'account-001',
          toEmail: 'user@example.com',
          template: 'WELCOME',
          status: 'PENDING',
        }),
      });
      expect(kafkaProducer.publishMailSend).toHaveBeenCalled();
    });

    it('should create Inbox entry if accountId is provided', async () => {
      prisma.emailLog.create.mockResolvedValue(mockEmailLog);
      prisma.inbox.create.mockResolvedValue(mockInbox);

      await service.sendEmail({
        tenantId: 'tenant-001',
        accountId: 'account-001',
        toEmail: 'user@example.com',
        template: EmailTemplate.EMAIL_TEMPLATE_WELCOME,
        locale: 'en',
        variables: {},
        sourceService: 'auth-service',
        fromEmail: 'noreply@example.com',
      });

      expect(prisma.inbox.create).toHaveBeenCalledWith({
        data: {
          tenantId: 'tenant-001',
          accountId: 'account-001',
          emailLogId: 'email-log-123',
        },
      });
    });

    it('should not create Inbox entry if accountId is not provided', async () => {
      prisma.emailLog.create.mockResolvedValue({
        ...mockEmailLog,
        accountId: null,
      });

      await service.sendEmail({
        tenantId: 'tenant-001',
        toEmail: 'user@example.com',
        template: EmailTemplate.EMAIL_TEMPLATE_WELCOME,
        locale: 'en',
        variables: {},
        sourceService: 'auth-service',
        fromEmail: 'noreply@example.com',
      });

      expect(prisma.inbox.create).not.toHaveBeenCalled();
    });

    it('should log warning if Kafka is disabled', async () => {
      kafkaProducer.isKafkaEnabled.mockReturnValue(false);
      prisma.emailLog.create.mockResolvedValue(mockEmailLog);

      const result = await service.sendEmail({
        tenantId: 'tenant-001',
        toEmail: 'user@example.com',
        template: EmailTemplate.EMAIL_TEMPLATE_WELCOME,
        locale: 'en',
        variables: {},
        sourceService: 'auth-service',
        fromEmail: 'noreply@example.com',
      });

      expect(result.success).toBe(true);
      expect(kafkaProducer.publishMailSend).not.toHaveBeenCalled();
    });

    it('should return failure response on error', async () => {
      templateService.render.mockRejectedValue(new Error('Template not found'));

      const result = await service.sendEmail({
        tenantId: 'tenant-001',
        toEmail: 'user@example.com',
        template: EmailTemplate.EMAIL_TEMPLATE_WELCOME,
        locale: 'en',
        variables: {},
        sourceService: 'auth-service',
        fromEmail: 'noreply@example.com',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to queue email');
    });

    it('should use default locale en if not provided', async () => {
      prisma.emailLog.create.mockResolvedValue(mockEmailLog);

      await service.sendEmail({
        tenantId: 'tenant-001',
        toEmail: 'user@example.com',
        template: EmailTemplate.EMAIL_TEMPLATE_WELCOME,
        locale: '',
        variables: {},
        sourceService: 'auth-service',
        fromEmail: 'noreply@example.com',
      });

      expect(templateService.render).toHaveBeenCalledWith('welcome', 'en', {});
    });
  });

  describe('sendBulkEmail', () => {
    it('should process multiple emails in batch', async () => {
      prisma.emailLog.create.mockResolvedValue(mockEmailLog);

      const result = await service.sendBulkEmail({
        tenantId: 'tenant-001',
        emails: [
          {
            accountId: 'account-001',
            toEmail: 'user1@example.com',
            template: EmailTemplate.EMAIL_TEMPLATE_WELCOME,
            locale: 'en',
            variables: { name: 'User 1' },
          },
          {
            accountId: 'account-002',
            toEmail: 'user2@example.com',
            template: EmailTemplate.EMAIL_TEMPLATE_WELCOME,
            locale: 'ko',
            variables: { name: 'User 2' },
          },
        ],
        sourceService: 'auth-service',
        fromEmail: 'noreply@example.com',
      });

      expect(result.success).toBe(true);
      expect(result.totalCount).toBe(2);
      expect(result.queuedCount).toBe(2);
      expect(result.failedCount).toBe(0);
      expect(result.results).toHaveLength(2);
      expect(prisma.emailLog.create).toHaveBeenCalledTimes(2);
    });

    it('should track failed emails in results', async () => {
      prisma.emailLog.create
        .mockResolvedValueOnce(mockEmailLog)
        .mockRejectedValueOnce(new Error('DB error'));

      const result = await service.sendBulkEmail({
        tenantId: 'tenant-001',
        emails: [
          {
            toEmail: 'user1@example.com',
            template: EmailTemplate.EMAIL_TEMPLATE_WELCOME,
            locale: 'en',
            variables: {},
          },
          {
            toEmail: 'user2@example.com',
            template: EmailTemplate.EMAIL_TEMPLATE_WELCOME,
            locale: 'en',
            variables: {},
          },
        ],
        sourceService: 'auth-service',
        fromEmail: 'noreply@example.com',
      });

      expect(result.success).toBe(false);
      expect(result.queuedCount).toBe(1);
      expect(result.failedCount).toBe(1);
    });

    it('should handle empty emails array', async () => {
      const result = await service.sendBulkEmail({
        tenantId: 'tenant-001',
        emails: [],
        sourceService: 'auth-service',
        fromEmail: 'noreply@example.com',
      });

      expect(result.success).toBe(true);
      expect(result.totalCount).toBe(0);
      expect(result.queuedCount).toBe(0);
      expect(result.results).toHaveLength(0);
    });
  });

  describe('getEmailStatus', () => {
    it('should return email status when found', async () => {
      prisma.emailLog.findUnique.mockResolvedValue({
        ...mockEmailLog,
        status: 'SENT',
        sentAt: new Date('2024-01-01T00:00:00Z'),
      });

      const result = await service.getEmailStatus({ emailLogId: 'email-log-123' });

      expect(result.emailLogId).toBe('email-log-123');
      expect(result.status).toBe(EmailStatus.EMAIL_STATUS_SENT);
      expect(result.toEmail).toBe('user@example.com');
      expect(result.sentAt).toBeDefined();
    });

    it('should return unspecified status when not found', async () => {
      prisma.emailLog.findUnique.mockResolvedValue(null);

      const result = await service.getEmailStatus({ emailLogId: 'nonexistent' });

      expect(result.emailLogId).toBe('nonexistent');
      expect(result.status).toBe(EmailStatus.EMAIL_STATUS_UNSPECIFIED);
      expect(result.error).toBe('Email log not found');
    });

    it('should map DELIVERED status to SENT', async () => {
      prisma.emailLog.findUnique.mockResolvedValue({
        ...mockEmailLog,
        status: 'DELIVERED',
      });

      const result = await service.getEmailStatus({ emailLogId: 'email-log-123' });

      expect(result.status).toBe(EmailStatus.EMAIL_STATUS_SENT);
    });

    it('should map OPENED status correctly', async () => {
      prisma.emailLog.findUnique.mockResolvedValue({
        ...mockEmailLog,
        status: 'OPENED',
        openedAt: new Date(),
      });

      const result = await service.getEmailStatus({ emailLogId: 'email-log-123' });

      expect(result.status).toBe(EmailStatus.EMAIL_STATUS_OPENED);
      expect(result.openedAt).toBeDefined();
    });

    it('should map CLICKED status correctly', async () => {
      prisma.emailLog.findUnique.mockResolvedValue({
        ...mockEmailLog,
        status: 'CLICKED',
        clickedAt: new Date(),
      });

      const result = await service.getEmailStatus({ emailLogId: 'email-log-123' });

      expect(result.status).toBe(EmailStatus.EMAIL_STATUS_CLICKED);
      expect(result.clickedAt).toBeDefined();
    });
  });

  describe('getInbox', () => {
    it('should return paginated inbox items', async () => {
      prisma.inbox.findMany.mockResolvedValue([mockInbox]);
      prisma.inbox.count
        .mockResolvedValueOnce(10) // totalCount
        .mockResolvedValueOnce(5); // unreadCount

      const result = await service.getInbox({
        tenantId: 'tenant-001',
        accountId: 'account-001',
        page: 1,
        pageSize: 20,
        includeRead: true,
      });

      expect(result.items).toHaveLength(1);
      expect(result.totalCount).toBe(10);
      expect(result.unreadCount).toBe(5);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('should filter out read items when includeRead is false', async () => {
      prisma.inbox.findMany.mockResolvedValue([]);
      prisma.inbox.count.mockResolvedValue(0);

      await service.getInbox({
        tenantId: 'tenant-001',
        accountId: 'account-001',
        page: 1,
        pageSize: 20,
        includeRead: false,
      });

      expect(prisma.inbox.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            readAt: null,
          }),
        }),
      );
    });

    it('should calculate correct skip value for pagination', async () => {
      prisma.inbox.findMany.mockResolvedValue([]);
      prisma.inbox.count.mockResolvedValue(0);

      await service.getInbox({
        tenantId: 'tenant-001',
        accountId: 'account-001',
        page: 3,
        pageSize: 10,
        includeRead: true,
      });

      expect(prisma.inbox.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20, // (3 - 1) * 10
          take: 10,
        }),
      );
    });

    it('should use default values for page and pageSize', async () => {
      prisma.inbox.findMany.mockResolvedValue([]);
      prisma.inbox.count.mockResolvedValue(0);

      const result = await service.getInbox({
        tenantId: 'tenant-001',
        accountId: 'account-001',
        page: 0,
        pageSize: 0,
        includeRead: true,
      });

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('should map inbox items correctly', async () => {
      const inboxWithRead = {
        ...mockInbox,
        readAt: new Date('2024-01-01T00:00:00Z'),
      };
      prisma.inbox.findMany.mockResolvedValue([inboxWithRead]);
      prisma.inbox.count.mockResolvedValue(1);

      const result = await service.getInbox({
        tenantId: 'tenant-001',
        accountId: 'account-001',
        page: 1,
        pageSize: 20,
        includeRead: true,
      });

      expect(result.items[0].isRead).toBe(true);
      expect(result.items[0].readAt).toBeDefined();
      expect(result.items[0].subject).toBe('Welcome to Example!');
    });
  });

  describe('markAsRead', () => {
    it('should mark inbox items as read', async () => {
      prisma.inbox.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.markAsRead({
        tenantId: 'tenant-001',
        accountId: 'account-001',
        inboxIds: ['inbox-1', 'inbox-2', 'inbox-3'],
      });

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(3);
      expect(result.message).toContain('Marked 3 items as read');
    });

    it('should only update unread items', async () => {
      prisma.inbox.updateMany.mockResolvedValue({ count: 1 });

      await service.markAsRead({
        tenantId: 'tenant-001',
        accountId: 'account-001',
        inboxIds: ['inbox-1', 'inbox-2'],
      });

      expect(prisma.inbox.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['inbox-1', 'inbox-2'] },
          tenantId: 'tenant-001',
          accountId: 'account-001',
          readAt: null,
        },
        data: {
          readAt: expect.any(Date),
        },
      });
    });

    it('should return failure on database error', async () => {
      prisma.inbox.updateMany.mockRejectedValue(new Error('DB error'));

      const result = await service.markAsRead({
        tenantId: 'tenant-001',
        accountId: 'account-001',
        inboxIds: ['inbox-1'],
      });

      expect(result.success).toBe(false);
      expect(result.updatedCount).toBe(0);
      expect(result.message).toContain('Failed to mark as read');
    });

    it('should return zero count when no items match', async () => {
      prisma.inbox.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.markAsRead({
        tenantId: 'tenant-001',
        accountId: 'account-001',
        inboxIds: ['nonexistent'],
      });

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(0);
    });
  });

  describe('template mapping', () => {
    it('should map all template enums to strings correctly', async () => {
      const templates = [
        { enum: EmailTemplate.EMAIL_TEMPLATE_ADMIN_INVITE, string: 'ADMIN_INVITE' },
        { enum: EmailTemplate.EMAIL_TEMPLATE_PARTNER_INVITE, string: 'PARTNER_INVITE' },
        { enum: EmailTemplate.EMAIL_TEMPLATE_PASSWORD_RESET, string: 'PASSWORD_RESET' },
        { enum: EmailTemplate.EMAIL_TEMPLATE_WELCOME, string: 'WELCOME' },
        { enum: EmailTemplate.EMAIL_TEMPLATE_EMAIL_VERIFICATION, string: 'EMAIL_VERIFICATION' },
        { enum: EmailTemplate.EMAIL_TEMPLATE_MFA_CODE, string: 'MFA_CODE' },
        { enum: EmailTemplate.EMAIL_TEMPLATE_ACCOUNT_LOCKED, string: 'ACCOUNT_LOCKED' },
        { enum: EmailTemplate.EMAIL_TEMPLATE_ACCOUNT_UNLOCKED, string: 'ACCOUNT_UNLOCKED' },
      ];

      for (const { enum: templateEnum, string: expectedString } of templates) {
        prisma.emailLog.create.mockResolvedValue({
          ...mockEmailLog,
          template: expectedString,
        });

        await service.sendEmail({
          tenantId: 'tenant-001',
          toEmail: 'user@example.com',
          template: templateEnum,
          locale: 'en',
          variables: {},
          sourceService: 'auth-service',
          fromEmail: 'noreply@example.com',
        });

        expect(prisma.emailLog.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            template: expectedString,
          }),
        });

        vi.clearAllMocks();
      }
    });
  });
});

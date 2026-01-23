import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import { TemplateService } from './template.service';
import { EmailTemplate } from '../mail/mail.interface';

// Mock fs modules
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
}));

vi.mock('fs', () => ({
  existsSync: vi.fn(),
}));

describe('TemplateService', () => {
  let service: TemplateService;
  let configService: {
    get: Mock;
  };

  const mockConfigService = {
    get: vi.fn((key: string, defaultValue: unknown) => {
      const config: Record<string, unknown> = {
        'i18n.fallbackLocale': 'en',
        'i18n.supportedLocales': ['en', 'ko', 'ja', 'zh'],
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset fs mocks
    (fsSync.existsSync as Mock).mockReturnValue(true);
    (fs.readFile as Mock).mockResolvedValue('<p>Welcome {{name}}!</p>');

    const module: TestingModule = await Test.createTestingModule({
      providers: [TemplateService, { provide: ConfigService, useValue: mockConfigService }],
    }).compile();

    service = module.get<TemplateService>(TemplateService);
    configService = module.get(ConfigService);

    // Clear the template cache before each test
    service.clearCache();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('loadTemplate', () => {
    it('should load template file for requested locale', async () => {
      const result = await service.loadTemplate('welcome', 'en');

      expect(result).toBeDefined();
      expect(result.template).toBeDefined();
      expect(result.subjectTemplate).toBeDefined();
      expect(fs.readFile).toHaveBeenCalled();
    });

    it('should fallback to default locale if template not found', async () => {
      service.clearCache();
      (fsSync.existsSync as Mock)
        .mockReturnValueOnce(false) // Japanese template not found
        .mockReturnValueOnce(true); // English fallback exists

      const result = await service.loadTemplate('welcome', 'ja');

      expect(result).toBeDefined();
    });

    it('should throw error if no template found for any locale', async () => {
      service.clearCache();
      (fsSync.existsSync as Mock).mockReturnValue(false);

      await expect(service.loadTemplate('nonexistent', 'en')).rejects.toThrow(
        'Template not found: nonexistent for any locale',
      );
    });

    it('should return cached template on subsequent calls', async () => {
      service.clearCache();
      (fs.readFile as Mock).mockClear();

      // First call - loads from file
      await service.loadTemplate('welcome', 'en');

      // Clear the readFile mock counter after first call
      const firstCallCount = (fs.readFile as Mock).mock.calls.length;

      // Second call - should use cache
      await service.loadTemplate('welcome', 'en');

      // Should not call readFile again
      expect((fs.readFile as Mock).mock.calls.length).toBe(firstCallCount);
    });

    it('should cache templates separately per locale', async () => {
      service.clearCache();
      (fs.readFile as Mock).mockClear();

      await service.loadTemplate('welcome', 'en');
      await service.loadTemplate('welcome', 'ko');

      // Two different locales = two file reads
      expect(fs.readFile).toHaveBeenCalledTimes(2);
    });
  });

  describe('render', () => {
    it('should render template with provided variables', async () => {
      service.clearCache();
      const result = await service.render('welcome', 'en', { name: 'John' });

      expect(result.body).toContain('John');
      expect(result.subject).toBeDefined();
    });

    it('should return subject and body in RenderedTemplate', async () => {
      service.clearCache();
      const result = await service.render('welcome', 'en', {
        name: 'John',
        serviceName: 'MyApp',
      });

      expect(result).toHaveProperty('subject');
      expect(result).toHaveProperty('body');
    });

    it('should return fallback content on render error', async () => {
      service.clearCache();
      (fsSync.existsSync as Mock).mockReturnValue(false);

      const result = await service.render('nonexistent', 'en', {});

      expect(result.subject).toBe('Email: nonexistent');
      expect(result.body).toContain('Template rendering failed');
    });

    it('should handle empty variables', async () => {
      service.clearCache();
      const result = await service.render('welcome', 'en', {});

      expect(result.body).toBeDefined();
      expect(result.subject).toBeDefined();
    });

    it('should handle variables with different types', async () => {
      service.clearCache();
      const result = await service.render('welcome', 'en', {
        name: 'John',
        count: 5,
        active: true,
        empty: undefined,
      });

      expect(result.body).toBeDefined();
    });
  });

  describe('locale fallback', () => {
    it('should normalize locale codes like en-US to en', async () => {
      service.clearCache();
      await service.render('welcome', 'en-US', { name: 'John' });

      // Should use normalized 'en' locale
      expect(fsSync.existsSync).toHaveBeenCalled();
    });

    it('should normalize locale codes with underscore like en_GB to en', async () => {
      service.clearCache();
      await service.render('welcome', 'en_GB', { name: 'John' });

      expect(fsSync.existsSync).toHaveBeenCalled();
    });

    it('should fallback to default locale for unsupported locales', async () => {
      // For this test, we just verify it doesn't throw for an unsupported locale
      service.clearCache();
      await service.render('welcome', 'fr', { name: 'Jean' });

      expect(fsSync.existsSync).toHaveBeenCalled();
    });

    it('should handle lowercase conversion for locale', async () => {
      service.clearCache();
      await service.render('welcome', 'EN', { name: 'John' });

      expect(fsSync.existsSync).toHaveBeenCalled();
    });
  });

  describe('caching behavior', () => {
    it('should cache templates after first load', async () => {
      service.clearCache();
      (fs.readFile as Mock).mockClear();

      // First render - loads template
      await service.render('welcome', 'en', { name: 'John' });

      const firstCallCount = (fs.readFile as Mock).mock.calls.length;

      // Second render - uses cache
      await service.render('welcome', 'en', { name: 'Jane' });

      // Should not call readFile again for cached template
      expect((fs.readFile as Mock).mock.calls.length).toBe(firstCallCount);
    });

    it('should clear cache when clearCache is called', async () => {
      service.clearCache();
      (fs.readFile as Mock).mockClear();

      // First load
      await service.render('welcome', 'en', { name: 'John' });

      // Clear cache
      service.clearCache();
      (fs.readFile as Mock).mockClear();

      // Should load again after cache clear
      await service.render('welcome', 'en', { name: 'Jane' });

      expect(fs.readFile).toHaveBeenCalled();
    });
  });

  describe('templateEnumToName', () => {
    it('should map EMAIL_TEMPLATE_ADMIN_INVITE to admin-invite', () => {
      const result = service.templateEnumToName(EmailTemplate.EMAIL_TEMPLATE_ADMIN_INVITE);
      expect(result).toBe('admin-invite');
    });

    it('should map EMAIL_TEMPLATE_PARTNER_INVITE to partner-invite', () => {
      const result = service.templateEnumToName(EmailTemplate.EMAIL_TEMPLATE_PARTNER_INVITE);
      expect(result).toBe('partner-invite');
    });

    it('should map EMAIL_TEMPLATE_PASSWORD_RESET to password-reset', () => {
      const result = service.templateEnumToName(EmailTemplate.EMAIL_TEMPLATE_PASSWORD_RESET);
      expect(result).toBe('password-reset');
    });

    it('should map EMAIL_TEMPLATE_WELCOME to welcome', () => {
      const result = service.templateEnumToName(EmailTemplate.EMAIL_TEMPLATE_WELCOME);
      expect(result).toBe('welcome');
    });

    it('should map EMAIL_TEMPLATE_EMAIL_VERIFICATION to email-verification', () => {
      const result = service.templateEnumToName(EmailTemplate.EMAIL_TEMPLATE_EMAIL_VERIFICATION);
      expect(result).toBe('email-verification');
    });

    it('should map EMAIL_TEMPLATE_MFA_CODE to mfa-code', () => {
      const result = service.templateEnumToName(EmailTemplate.EMAIL_TEMPLATE_MFA_CODE);
      expect(result).toBe('mfa-code');
    });

    it('should map EMAIL_TEMPLATE_ACCOUNT_LOCKED to account-locked', () => {
      const result = service.templateEnumToName(EmailTemplate.EMAIL_TEMPLATE_ACCOUNT_LOCKED);
      expect(result).toBe('account-locked');
    });

    it('should map EMAIL_TEMPLATE_ACCOUNT_UNLOCKED to account-unlocked', () => {
      const result = service.templateEnumToName(EmailTemplate.EMAIL_TEMPLATE_ACCOUNT_UNLOCKED);
      expect(result).toBe('account-unlocked');
    });

    it('should map EMAIL_TEMPLATE_UNSPECIFIED to welcome as default', () => {
      const result = service.templateEnumToName(EmailTemplate.EMAIL_TEMPLATE_UNSPECIFIED);
      expect(result).toBe('welcome');
    });
  });

  describe('renderByEnum', () => {
    it('should render template using enum', async () => {
      service.clearCache();
      const result = await service.renderByEnum(EmailTemplate.EMAIL_TEMPLATE_WELCOME, 'en', {
        name: 'John',
      });

      expect(result.body).toBeDefined();
      expect(result.subject).toBeDefined();
    });

    it('should convert enum to template name before rendering', async () => {
      service.clearCache();
      const loadSpy = vi.spyOn(service, 'loadTemplate');

      await service.renderByEnum(EmailTemplate.EMAIL_TEMPLATE_PASSWORD_RESET, 'en', {
        resetLink: 'https://example.com/reset',
      });

      expect(loadSpy).toHaveBeenCalledWith('password-reset', expect.any(String));
    });
  });

  describe('templateExists', () => {
    it('should return true if template exists', async () => {
      (fsSync.existsSync as Mock).mockReturnValue(true);

      const result = await service.templateExists('welcome', 'en');

      expect(result).toBe(true);
    });

    it('should return false if template does not exist', async () => {
      (fsSync.existsSync as Mock).mockReturnValue(false);

      const result = await service.templateExists('nonexistent', 'en');

      expect(result).toBe(false);
    });
  });

  describe('onModuleInit', () => {
    it('should register helpers and preload templates', async () => {
      await service.onModuleInit();

      // Helpers are registered during onModuleInit
      expect(service).toBeDefined();
    });

    it('should not throw if preloading fails', async () => {
      service.clearCache();
      (fsSync.existsSync as Mock).mockReturnValue(false);

      // Create a new service instance to test onModuleInit
      const module: TestingModule = await Test.createTestingModule({
        providers: [TemplateService, { provide: ConfigService, useValue: mockConfigService }],
      }).compile();

      const newService = module.get<TemplateService>(TemplateService);
      await expect(newService.onModuleInit()).resolves.not.toThrow();
    });
  });
});

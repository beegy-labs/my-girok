import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Handlebars from 'handlebars';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { EmailTemplate } from '../mail/mail.interface';

/**
 * Template configuration with subject and body
 */
export interface RenderedTemplate {
  subject: string;
  body: string;
}

/**
 * Template cache entry
 */
interface TemplateCacheEntry {
  template: Handlebars.TemplateDelegate;
  subjectTemplate: Handlebars.TemplateDelegate;
}

/**
 * Subject templates for each email type
 */
const SUBJECT_TEMPLATES: Record<string, Record<string, string>> = {
  'admin-invite': {
    en: 'Admin Invitation from {{inviterName}}',
    ko: '{{inviterName}}님의 관리자 초대',
  },
  'partner-invite': {
    en: 'Partner Invitation from {{inviterName}}',
    ko: '{{inviterName}}님의 파트너 초대',
  },
  'password-reset': {
    en: 'Password Reset Request',
    ko: '비밀번호 재설정 요청',
  },
  welcome: {
    en: 'Welcome to {{serviceName}}!',
    ko: '{{serviceName}}에 오신 것을 환영합니다!',
  },
  'email-verification': {
    en: 'Verify Your Email Address',
    ko: '이메일 주소 인증',
  },
  'mfa-code': {
    en: 'Your Verification Code',
    ko: '인증 코드',
  },
  'account-locked': {
    en: 'Account Security Alert',
    ko: '계정 보안 알림',
  },
  'account-unlocked': {
    en: 'Your Account Has Been Unlocked',
    ko: '계정 잠금이 해제되었습니다',
  },
};

/**
 * Template Service
 * Handles loading and rendering of Handlebars email templates
 */
@Injectable()
export class TemplateService implements OnModuleInit {
  private readonly logger = new Logger(TemplateService.name);
  private readonly templateCache = new Map<string, TemplateCacheEntry>();
  private readonly fallbackLocale: string;
  private readonly supportedLocales: string[];
  private readonly templatesDir: string;

  constructor(private readonly configService: ConfigService) {
    this.fallbackLocale = this.configService.get<string>('i18n.fallbackLocale', 'en');
    this.supportedLocales = this.configService.get<string[]>('i18n.supportedLocales', [
      'en',
      'ko',
      'ja',
      'zh',
    ]);
    this.templatesDir = join(__dirname);
  }

  async onModuleInit(): Promise<void> {
    this.registerHelpers();
    await this.preloadTemplates();
  }

  /**
   * Register Handlebars helpers
   */
  private registerHelpers(): void {
    // Date formatting helper
    Handlebars.registerHelper('formatDate', (date: string | Date, format?: string) => {
      const d = typeof date === 'string' ? new Date(date) : date;
      if (format === 'short') {
        return d.toLocaleDateString();
      }
      return d.toLocaleString();
    });

    // URL encoding helper
    Handlebars.registerHelper('encodeUri', (str: string) => {
      return encodeURIComponent(str);
    });

    // Capitalize helper
    Handlebars.registerHelper('capitalize', (str: string) => {
      if (!str) return '';
      return str.charAt(0).toUpperCase() + str.slice(1);
    });

    this.logger.log('Handlebars helpers registered');
  }

  /**
   * Preload commonly used templates
   */
  private async preloadTemplates(): Promise<void> {
    const templates = [
      'admin-invite',
      'partner-invite',
      'password-reset',
      'welcome',
      'email-verification',
      'mfa-code',
      'account-locked',
      'account-unlocked',
    ];

    const locales = ['en', 'ko'];

    for (const template of templates) {
      for (const locale of locales) {
        try {
          await this.loadTemplate(template, locale);
        } catch {
          this.logger.warn(`Failed to preload template: ${template}/${locale}`);
        }
      }
    }

    this.logger.log(`Preloaded ${this.templateCache.size} templates`);
  }

  /**
   * Map EmailTemplate enum to template directory name
   */
  templateEnumToName(template: EmailTemplate): string {
    const templateMap: Record<EmailTemplate, string> = {
      [EmailTemplate.EMAIL_TEMPLATE_UNSPECIFIED]: 'welcome',
      [EmailTemplate.EMAIL_TEMPLATE_ADMIN_INVITE]: 'admin-invite',
      [EmailTemplate.EMAIL_TEMPLATE_PARTNER_INVITE]: 'partner-invite',
      [EmailTemplate.EMAIL_TEMPLATE_PASSWORD_RESET]: 'password-reset',
      [EmailTemplate.EMAIL_TEMPLATE_WELCOME]: 'welcome',
      [EmailTemplate.EMAIL_TEMPLATE_EMAIL_VERIFICATION]: 'email-verification',
      [EmailTemplate.EMAIL_TEMPLATE_MFA_CODE]: 'mfa-code',
      [EmailTemplate.EMAIL_TEMPLATE_ACCOUNT_LOCKED]: 'account-locked',
      [EmailTemplate.EMAIL_TEMPLATE_ACCOUNT_UNLOCKED]: 'account-unlocked',
    };
    return templateMap[template] || 'welcome';
  }

  /**
   * Load a template from file system
   */
  async loadTemplate(templateName: string, locale: string): Promise<TemplateCacheEntry> {
    const cacheKey = `${templateName}:${locale}`;

    // Return cached template if available
    if (this.templateCache.has(cacheKey)) {
      return this.templateCache.get(cacheKey)!;
    }

    // Try to load the template for the requested locale
    let templatePath = join(this.templatesDir, templateName, `${locale}.hbs`);

    // Fallback to default locale if template doesn't exist
    if (!existsSync(templatePath)) {
      this.logger.warn(
        `Template not found for locale ${locale}, falling back to ${this.fallbackLocale}`,
      );
      templatePath = join(this.templatesDir, templateName, `${this.fallbackLocale}.hbs`);
    }

    // Check if fallback also doesn't exist
    if (!existsSync(templatePath)) {
      throw new Error(`Template not found: ${templateName} for any locale`);
    }

    // Read and compile the template
    const templateContent = await readFile(templatePath, 'utf-8');
    const compiledTemplate = Handlebars.compile(templateContent);

    // Compile subject template
    const subjectTemplateStr =
      SUBJECT_TEMPLATES[templateName]?.[locale] ||
      SUBJECT_TEMPLATES[templateName]?.[this.fallbackLocale] ||
      templateName;
    const compiledSubject = Handlebars.compile(subjectTemplateStr);

    const entry: TemplateCacheEntry = {
      template: compiledTemplate,
      subjectTemplate: compiledSubject,
    };

    this.templateCache.set(cacheKey, entry);
    this.logger.debug(`Loaded template: ${templateName}/${locale}`);

    return entry;
  }

  /**
   * Render a template with variables
   */
  async render(
    templateName: string,
    locale: string,
    variables: Record<string, string | number | boolean | undefined>,
  ): Promise<RenderedTemplate> {
    // Normalize locale
    const normalizedLocale = this.normalizeLocale(locale);

    try {
      const entry = await this.loadTemplate(templateName, normalizedLocale);

      const body = entry.template(variables);
      const subject = entry.subjectTemplate(variables);

      return { subject, body };
    } catch (error) {
      this.logger.error(`Failed to render template ${templateName}/${normalizedLocale}`, error);

      // Return fallback content
      return {
        subject: `Email: ${templateName}`,
        body: `<p>Template rendering failed. Please contact support.</p>`,
      };
    }
  }

  /**
   * Render a template using EmailTemplate enum
   */
  async renderByEnum(
    template: EmailTemplate,
    locale: string,
    variables: Record<string, string | number | boolean | undefined>,
  ): Promise<RenderedTemplate> {
    const templateName = this.templateEnumToName(template);
    return this.render(templateName, locale, variables);
  }

  /**
   * Normalize locale code
   */
  private normalizeLocale(locale: string): string {
    // Handle language-country codes (e.g., 'en-US' -> 'en')
    const normalized = locale.toLowerCase().split('-')[0].split('_')[0];

    // Check if the locale is supported
    if (this.supportedLocales.includes(normalized)) {
      return normalized;
    }

    return this.fallbackLocale;
  }

  /**
   * Clear template cache
   */
  clearCache(): void {
    this.templateCache.clear();
    this.logger.log('Template cache cleared');
  }

  /**
   * Check if a template exists
   */
  async templateExists(templateName: string, locale: string): Promise<boolean> {
    const templatePath = join(this.templatesDir, templateName, `${locale}.hbs`);
    return existsSync(templatePath);
  }
}

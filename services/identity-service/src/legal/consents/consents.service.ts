import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { LegalPrismaService } from '../../database/legal-prisma.service';
import { ConsentType, ConsentScope, ConsentLogAction, Prisma } from '.prisma/identity-legal-client';
import { GrantConsentDto, GrantConsentItemDto } from './dto/grant-consent.dto';
import { WithdrawConsentDto } from './dto/withdraw-consent.dto';
import {
  ConsentEntity,
  ConsentSummaryEntity,
  ConsentListResponse,
  ConsentLogEntity,
  ConsentLogListResponse,
} from './entities/consent.entity';

/**
 * Query parameters for listing consents
 */
export interface ConsentQueryDto {
  accountId?: string;
  consentType?: ConsentType;
  scope?: ConsentScope;
  countryCode?: string;
  activeOnly?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Query parameters for listing consent logs
 */
export interface ConsentLogQueryDto {
  consentId?: string;
  accountId?: string;
  action?: ConsentLogAction;
  page?: number;
  limit?: number;
}

/**
 * Consents service for managing user consent operations
 *
 * Handles GDPR/CCPA/PIPA/APPI compliant consent management including:
 * - Consent granting with audit trail
 * - Consent withdrawal
 * - Consent status checking
 * - Audit log management
 */
@Injectable()
export class ConsentsService {
  private readonly logger = new Logger(ConsentsService.name);

  // Required consent types that cannot be withdrawn
  private readonly REQUIRED_CONSENT_TYPES: ConsentType[] = [
    ConsentType.TERMS_OF_SERVICE,
    ConsentType.PRIVACY_POLICY,
  ];

  constructor(private readonly prisma: LegalPrismaService) {}

  /**
   * Grant a new consent
   * Creates consent record with audit log entry
   */
  async grantConsent(dto: GrantConsentDto): Promise<ConsentEntity> {
    const now = new Date();

    // Check if consent already exists and is active
    const existingConsent = await this.prisma.consent.findFirst({
      where: {
        accountId: dto.accountId,
        consentType: dto.consentType,
        scope: dto.scope || ConsentScope.SERVICE,
        withdrawnAt: null,
      },
    });

    if (existingConsent) {
      throw new BadRequestException(`Active consent already exists for type: ${dto.consentType}`);
    }

    // Create consent with audit log in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const consent = await tx.consent.create({
        data: {
          accountId: dto.accountId,
          consentType: dto.consentType,
          scope: dto.scope || ConsentScope.SERVICE,
          serviceId: dto.serviceId,
          countryCode: dto.countryCode,
          documentId: dto.documentId,
          documentVersion: dto.documentVersion,
          agreed: true,
          agreedAt: now,
          ipAddress: dto.ipAddress,
          userAgent: dto.userAgent,
        },
      });

      // Create audit log entry
      await tx.consentLog.create({
        data: {
          consentId: consent.id,
          accountId: dto.accountId,
          action: ConsentLogAction.GRANTED,
          newState: {
            consentType: dto.consentType,
            agreed: true,
            documentVersion: dto.documentVersion,
          } as Prisma.InputJsonValue,
          ipAddress: dto.ipAddress,
          userAgent: dto.userAgent,
          metadata: dto.metadata as Prisma.InputJsonValue,
        },
      });

      return consent;
    });

    this.logger.log(`Consent granted: accountId=${dto.accountId}, type=${dto.consentType}`);

    return result as ConsentEntity;
  }

  /**
   * Grant multiple consents at once
   * Used during registration to record all required consents
   */
  async grantBulkConsents(
    accountId: string,
    countryCode: string,
    consents: GrantConsentItemDto[],
    ipAddress?: string,
    userAgent?: string,
  ): Promise<ConsentEntity[]> {
    const now = new Date();

    const results = await this.prisma.$transaction(async (tx) => {
      const createdConsents: ConsentEntity[] = [];

      for (const item of consents) {
        // Check for existing active consent
        const existing = await tx.consent.findFirst({
          where: {
            accountId,
            consentType: item.consentType,
            withdrawnAt: null,
          },
        });

        if (existing) {
          // Skip if already exists
          createdConsents.push(existing as ConsentEntity);
          continue;
        }

        const consent = await tx.consent.create({
          data: {
            accountId,
            consentType: item.consentType,
            scope: ConsentScope.SERVICE,
            countryCode,
            documentId: item.documentId,
            documentVersion: item.documentVersion,
            agreed: true,
            agreedAt: now,
            ipAddress,
            userAgent,
          },
        });

        // Create audit log
        await tx.consentLog.create({
          data: {
            consentId: consent.id,
            accountId,
            action: ConsentLogAction.GRANTED,
            newState: {
              consentType: item.consentType,
              agreed: true,
              documentVersion: item.documentVersion,
            } as Prisma.InputJsonValue,
            ipAddress,
            userAgent,
          },
        });

        createdConsents.push(consent as ConsentEntity);
      }

      return createdConsents;
    });

    this.logger.log(`Bulk consents granted: accountId=${accountId}, count=${results.length}`);

    return results;
  }

  /**
   * Withdraw a consent by ID
   * Creates audit log entry for the withdrawal
   */
  async withdrawConsent(consentId: string, dto: WithdrawConsentDto): Promise<void> {
    const consent = await this.prisma.consent.findUnique({
      where: { id: consentId },
    });

    if (!consent) {
      throw new NotFoundException(`Consent not found: ${consentId}`);
    }

    if (consent.withdrawnAt) {
      throw new BadRequestException('Consent has already been withdrawn');
    }

    // Check if consent type is required and cannot be withdrawn
    if (this.REQUIRED_CONSENT_TYPES.includes(consent.consentType)) {
      throw new BadRequestException(`Cannot withdraw required consent: ${consent.consentType}`);
    }

    const now = new Date();
    const previousState = {
      agreed: consent.agreed,
      agreedAt: consent.agreedAt,
      documentVersion: consent.documentVersion,
    };

    await this.prisma.$transaction(async (tx) => {
      // Update consent to withdrawn
      await tx.consent.update({
        where: { id: consentId },
        data: { withdrawnAt: now },
      });

      // Create audit log
      await tx.consentLog.create({
        data: {
          consentId,
          accountId: consent.accountId,
          action: ConsentLogAction.WITHDRAWN,
          previousState: previousState as Prisma.InputJsonValue,
          newState: {
            agreed: false,
            withdrawnAt: now,
            reason: dto.reason,
          } as Prisma.InputJsonValue,
          ipAddress: dto.ipAddress,
          userAgent: dto.userAgent,
          metadata: { reason: dto.reason } as Prisma.InputJsonValue,
        },
      });
    });

    this.logger.log(`Consent withdrawn: consentId=${consentId}, accountId=${consent.accountId}`);
  }

  /**
   * Withdraw consent by account ID and consent type
   */
  async withdrawConsentByType(
    accountId: string,
    consentType: ConsentType,
    dto: WithdrawConsentDto,
  ): Promise<void> {
    const consent = await this.prisma.consent.findFirst({
      where: {
        accountId,
        consentType,
        withdrawnAt: null,
      },
    });

    if (!consent) {
      throw new NotFoundException(`Active consent not found for type: ${consentType}`);
    }

    await this.withdrawConsent(consent.id, dto);
  }

  /**
   * Get consent by ID
   */
  async getConsent(consentId: string): Promise<ConsentEntity> {
    const consent = await this.prisma.consent.findUnique({
      where: { id: consentId },
    });

    if (!consent) {
      throw new NotFoundException(`Consent not found: ${consentId}`);
    }

    return consent as ConsentEntity;
  }

  /**
   * Get all active consents for an account
   */
  async getAccountConsents(accountId: string): Promise<ConsentSummaryEntity[]> {
    const consents = await this.prisma.consent.findMany({
      where: {
        accountId,
        withdrawnAt: null,
      },
      orderBy: { agreedAt: 'desc' },
    });

    return consents.map((c) => ({
      id: c.id,
      accountId: c.accountId,
      consentType: c.consentType,
      agreed: c.agreed,
      agreedAt: c.agreedAt,
      withdrawnAt: c.withdrawnAt,
      documentVersion: c.documentVersion,
    }));
  }

  /**
   * Check if account has a specific consent type
   */
  async hasConsent(accountId: string, consentType: ConsentType): Promise<boolean> {
    const consent = await this.prisma.consent.findFirst({
      where: {
        accountId,
        consentType,
        agreed: true,
        withdrawnAt: null,
      },
    });

    return consent !== null;
  }

  /**
   * Check if account has all required consents
   */
  async hasAllRequiredConsents(accountId: string): Promise<boolean> {
    const consents = await this.prisma.consent.findMany({
      where: {
        accountId,
        consentType: { in: this.REQUIRED_CONSENT_TYPES },
        agreed: true,
        withdrawnAt: null,
      },
    });

    return consents.length === this.REQUIRED_CONSENT_TYPES.length;
  }

  /**
   * Get missing required consent types for an account
   */
  async getMissingRequiredConsents(accountId: string): Promise<ConsentType[]> {
    const consents = await this.prisma.consent.findMany({
      where: {
        accountId,
        consentType: { in: this.REQUIRED_CONSENT_TYPES },
        agreed: true,
        withdrawnAt: null,
      },
      select: { consentType: true },
    });

    const grantedTypes = consents.map((c) => c.consentType);
    return this.REQUIRED_CONSENT_TYPES.filter((t) => !grantedTypes.includes(t));
  }

  /**
   * List consents with pagination and filters
   */
  async listConsents(query: ConsentQueryDto): Promise<ConsentListResponse> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ConsentWhereInput = {};

    if (query.accountId) {
      where.accountId = query.accountId;
    }
    if (query.consentType) {
      where.consentType = query.consentType;
    }
    if (query.scope) {
      where.scope = query.scope;
    }
    if (query.countryCode) {
      where.countryCode = query.countryCode;
    }
    if (query.activeOnly) {
      where.withdrawnAt = null;
    }

    const [consents, total] = await Promise.all([
      this.prisma.consent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { agreedAt: 'desc' },
      }),
      this.prisma.consent.count({ where }),
    ]);

    return {
      data: consents.map((c) => ({
        id: c.id,
        accountId: c.accountId,
        consentType: c.consentType,
        agreed: c.agreed,
        agreedAt: c.agreedAt,
        withdrawnAt: c.withdrawnAt,
        documentVersion: c.documentVersion,
      })),
      meta: { total, page, limit },
    };
  }

  /**
   * Get audit logs for a consent
   */
  async getConsentLogs(consentId: string): Promise<ConsentLogEntity[]> {
    const logs = await this.prisma.consentLog.findMany({
      where: { consentId },
      orderBy: { createdAt: 'desc' },
    });

    return logs as ConsentLogEntity[];
  }

  /**
   * List consent logs with pagination and filters
   */
  async listConsentLogs(query: ConsentLogQueryDto): Promise<ConsentLogListResponse> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ConsentLogWhereInput = {};

    if (query.consentId) {
      where.consentId = query.consentId;
    }
    if (query.accountId) {
      where.accountId = query.accountId;
    }
    if (query.action) {
      where.action = query.action;
    }

    const [logs, total] = await Promise.all([
      this.prisma.consentLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.consentLog.count({ where }),
    ]);

    return {
      data: logs as ConsentLogEntity[],
      meta: { total, page, limit },
    };
  }

  /**
   * Get consent history for an account (including withdrawn)
   */
  async getConsentHistory(accountId: string, consentType?: ConsentType): Promise<ConsentEntity[]> {
    const where: Prisma.ConsentWhereInput = { accountId };

    if (consentType) {
      where.consentType = consentType;
    }

    const consents = await this.prisma.consent.findMany({
      where,
      orderBy: { agreedAt: 'desc' },
    });

    return consents as ConsentEntity[];
  }
}

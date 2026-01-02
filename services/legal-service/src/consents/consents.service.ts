import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ID } from '@my-girok/nest-common';
import { PrismaService } from '../database/prisma.service';
import { CacheService } from '../common/cache';
import { OutboxService } from '../common/outbox';
import { GrantConsentDto, WithdrawConsentDto, ConsentResponseDto } from './dto';

@Injectable()
export class ConsentsService {
  private readonly logger = new Logger(ConsentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly outboxService: OutboxService,
  ) {}

  async grantConsent(dto: GrantConsentDto): Promise<ConsentResponseDto> {
    const id = ID.generate();

    const consent = await this.prisma.$transaction(async (tx) => {
      const createdConsent = await tx.consent.create({
        data: {
          id,
          accountId: dto.accountId,
          documentId: dto.documentId,
          lawRegistryId: dto.lawRegistryId,
          status: 'GRANTED',
          consentedAt: new Date(),
          expiresAt: dto.expiresAt,
          ipAddress: dto.ipAddress,
          userAgent: dto.userAgent,
          consentMethod: dto.consentMethod || 'explicit_button',
          metadata: dto.metadata as object | undefined,
        },
        include: {
          document: true,
          lawRegistry: true,
        },
      });

      // Add event to outbox
      await this.outboxService.addEvent(
        {
          aggregateType: 'Consent',
          aggregateId: id,
          eventType: 'CONSENT_GRANTED',
          payload: {
            consentId: id,
            accountId: dto.accountId,
            documentId: dto.documentId,
            documentType: createdConsent.document.type,
            consentMethod: dto.consentMethod || 'explicit_button',
            consentedAt: createdConsent.consentedAt.toISOString(),
            expiresAt: dto.expiresAt?.toISOString(),
          },
        },
        tx,
      );

      return createdConsent;
    });

    // Invalidate cache for this account
    await this.cacheService.invalidateConsent(id, dto.accountId, dto.documentId);

    this.logger.log(`Consent granted: ${id} for account ${dto.accountId}`);

    return this.toResponseDto(consent);
  }

  async getConsentsForAccount(accountId: string, status?: string): Promise<ConsentResponseDto[]> {
    // Use cache for all consents by account (no status filter)
    if (!status) {
      const cached = await this.cacheService.getConsentsByAccount<ConsentResponseDto[]>(accountId);
      if (cached) {
        return cached;
      }
    }

    const consents = await this.prisma.consent.findMany({
      where: {
        accountId,
        ...(status && { status: status as never }),
      },
      include: {
        document: true,
        lawRegistry: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = consents.map((c) => this.toResponseDto(c));

    // Cache if no status filter (full account consent list)
    if (!status) {
      await this.cacheService.setConsentsByAccount(accountId, result);
    }

    return result;
  }

  async getConsent(id: string): Promise<ConsentResponseDto> {
    // Check cache first
    const cached = await this.cacheService.getConsentById<ConsentResponseDto>(id);
    if (cached) {
      return cached;
    }

    const consent = await this.prisma.consent.findUnique({
      where: { id },
      include: {
        document: true,
        lawRegistry: true,
      },
    });

    if (!consent) {
      throw new NotFoundException(`Consent not found: ${id}`);
    }

    const result = this.toResponseDto(consent);
    await this.cacheService.setConsentById(id, result);

    return result;
  }

  async withdrawConsent(id: string, dto: WithdrawConsentDto): Promise<void> {
    const consent = await this.prisma.consent.findUnique({
      where: { id },
      include: { document: true },
    });

    if (!consent) {
      throw new NotFoundException(`Consent not found: ${id}`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.consent.update({
        where: { id },
        data: {
          status: 'WITHDRAWN',
          withdrawnAt: new Date(),
          metadata: {
            ...((consent.metadata as object) || {}),
            withdrawalReason: dto.reason,
            withdrawalIpAddress: dto.ipAddress,
          },
        },
      });

      // Add event to outbox
      await this.outboxService.addEvent(
        {
          aggregateType: 'Consent',
          aggregateId: id,
          eventType: 'CONSENT_WITHDRAWN',
          payload: {
            consentId: id,
            accountId: consent.accountId,
            documentId: consent.documentId,
            documentType: consent.document.type,
            withdrawnAt: new Date().toISOString(),
            reason: dto.reason,
          },
        },
        tx,
      );
    });

    // Invalidate cache
    await this.cacheService.invalidateConsent(id, consent.accountId, consent.documentId);

    this.logger.log(`Consent withdrawn: ${id}`);
  }

  async checkConsent(
    documentId: string,
    accountId: string,
  ): Promise<{ hasConsent: boolean; consent?: ConsentResponseDto }> {
    // Check cache for consent status
    const cachedStatus = await this.cacheService.getConsentStatus(accountId, documentId);
    if (cachedStatus !== undefined) {
      if (cachedStatus !== 'GRANTED') {
        return { hasConsent: false };
      }
      // Status is GRANTED, but we need full consent data
    }

    const consent = await this.prisma.consent.findFirst({
      where: {
        documentId,
        accountId,
        status: 'GRANTED',
      },
      include: {
        document: true,
        lawRegistry: true,
      },
    });

    if (!consent) {
      // Cache the negative result
      await this.cacheService.setConsentStatus(accountId, documentId, 'NONE');
      return { hasConsent: false };
    }

    // Cache the consent status
    await this.cacheService.setConsentStatus(accountId, documentId, 'GRANTED');

    return { hasConsent: true, consent: this.toResponseDto(consent) };
  }

  private toResponseDto(consent: unknown): ConsentResponseDto {
    const c = consent as Record<string, unknown>;
    return {
      id: c.id as string,
      accountId: c.accountId as string,
      documentId: c.documentId as string,
      status: c.status as string,
      consentedAt: c.consentedAt as Date,
      withdrawnAt: c.withdrawnAt as Date | null,
      consentMethod: c.consentMethod as string,
      createdAt: c.createdAt as Date,
    };
  }
}

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ID } from '@my-girok/nest-common';
import { PrismaService } from '../database/prisma.service';
import { GrantConsentDto, WithdrawConsentDto, ConsentResponseDto } from './dto';

@Injectable()
export class ConsentsService {
  private readonly logger = new Logger(ConsentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async grantConsent(dto: GrantConsentDto): Promise<ConsentResponseDto> {
    const id = ID.generate();

    const consent = await this.prisma.consent.create({
      data: {
        id,
        accountId: dto.accountId,
        documentId: dto.documentId,
        lawRegistryId: dto.lawRegistryId,
        status: 'GRANTED',
        consentedAt: new Date(),
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

    this.logger.log(`Consent granted: ${id} for account ${dto.accountId}`);

    return this.toResponseDto(consent);
  }

  async getConsentsForAccount(accountId: string, status?: string): Promise<ConsentResponseDto[]> {
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

    return consents.map((c) => this.toResponseDto(c));
  }

  async getConsent(id: string): Promise<ConsentResponseDto> {
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

    return this.toResponseDto(consent);
  }

  async withdrawConsent(id: string, dto: WithdrawConsentDto): Promise<void> {
    const consent = await this.prisma.consent.findUnique({ where: { id } });

    if (!consent) {
      throw new NotFoundException(`Consent not found: ${id}`);
    }

    await this.prisma.consent.update({
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

    this.logger.log(`Consent withdrawn: ${id}`);
  }

  async checkConsent(
    documentId: string,
    accountId: string,
  ): Promise<{ hasConsent: boolean; consent?: ConsentResponseDto }> {
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
      return { hasConsent: false };
    }

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

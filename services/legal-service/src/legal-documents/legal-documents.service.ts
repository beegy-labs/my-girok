import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import * as crypto from 'crypto';
import { ID } from '@my-girok/nest-common';
import { PrismaService } from '../database/prisma.service';
import { CreateLegalDocumentDto, UpdateLegalDocumentDto, LegalDocumentResponseDto } from './dto';

@Injectable()
export class LegalDocumentsService {
  private readonly logger = new Logger(LegalDocumentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateLegalDocumentDto): Promise<LegalDocumentResponseDto> {
    // Check if document with same type, version, country, locale exists
    const existing = await this.prisma.legalDocument.findFirst({
      where: {
        type: dto.type as never,
        version: dto.version,
        countryCode: dto.countryCode,
        locale: dto.locale,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Document already exists: ${dto.type} v${dto.version} (${dto.countryCode}/${dto.locale})`,
      );
    }

    const id = ID.generate();
    const contentHash = this.hashContent(dto.content);

    const document = await this.prisma.legalDocument.create({
      data: {
        id,
        type: dto.type as never,
        version: dto.version,
        title: dto.title,
        content: dto.content,
        contentHash,
        countryCode: dto.countryCode,
        locale: dto.locale,
        lawRegistryId: dto.lawRegistryId,
        status: 'DRAFT',
        effectiveFrom: dto.effectiveFrom,
        effectiveTo: dto.effectiveTo,
        metadata: dto.metadata as object | undefined,
      },
    });

    this.logger.log(`Legal document created: ${dto.type} v${dto.version} (${id})`);

    return this.toResponseDto(document);
  }

  async findAll(params: {
    type?: string;
    countryCode?: string;
    locale?: string;
    status?: string;
  }): Promise<LegalDocumentResponseDto[]> {
    const { type, countryCode, locale, status } = params;

    const documents = await this.prisma.legalDocument.findMany({
      where: {
        ...(type && { type: type as never }),
        ...(countryCode && { countryCode }),
        ...(locale && { locale }),
        ...(status && { status: status as never }),
      },
      orderBy: [{ type: 'asc' }, { version: 'desc' }],
    });

    return documents.map((d) => this.toResponseDto(d));
  }

  async getActiveDocuments(
    countryCode: string,
    locale?: string,
  ): Promise<LegalDocumentResponseDto[]> {
    const now = new Date();

    const documents = await this.prisma.legalDocument.findMany({
      where: {
        countryCode,
        ...(locale && { locale }),
        status: 'ACTIVE',
        effectiveFrom: { lte: now },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
      },
      orderBy: { type: 'asc' },
    });

    return documents.map((d) => this.toResponseDto(d));
  }

  async findOne(id: string): Promise<LegalDocumentResponseDto> {
    const document = await this.prisma.legalDocument.findUnique({ where: { id } });

    if (!document) {
      throw new NotFoundException(`Legal document not found: ${id}`);
    }

    return this.toResponseDto(document);
  }

  async update(id: string, dto: UpdateLegalDocumentDto): Promise<LegalDocumentResponseDto> {
    const existing = await this.prisma.legalDocument.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException(`Legal document not found: ${id}`);
    }

    const updateData: Record<string, unknown> = {};

    if (dto.title) updateData.title = dto.title;
    if (dto.content) {
      updateData.content = dto.content;
      updateData.contentHash = this.hashContent(dto.content);
    }
    if (dto.effectiveFrom) updateData.effectiveFrom = dto.effectiveFrom;
    if (dto.effectiveTo !== undefined) updateData.effectiveTo = dto.effectiveTo;
    if (dto.metadata) updateData.metadata = dto.metadata;

    const updated = await this.prisma.legalDocument.update({
      where: { id },
      data: updateData,
    });

    this.logger.log(`Legal document updated: ${id}`);

    return this.toResponseDto(updated);
  }

  async activate(id: string): Promise<LegalDocumentResponseDto> {
    const existing = await this.prisma.legalDocument.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException(`Legal document not found: ${id}`);
    }

    const updated = await this.prisma.legalDocument.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        effectiveFrom: existing.effectiveFrom || new Date(),
      },
    });

    this.logger.log(`Legal document activated: ${id}`);

    return this.toResponseDto(updated);
  }

  async archive(id: string): Promise<LegalDocumentResponseDto> {
    const existing = await this.prisma.legalDocument.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException(`Legal document not found: ${id}`);
    }

    const updated = await this.prisma.legalDocument.update({
      where: { id },
      data: {
        status: 'ARCHIVED',
        effectiveTo: new Date(),
      },
    });

    this.logger.log(`Legal document archived: ${id}`);

    return this.toResponseDto(updated);
  }

  private hashContent(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  private toResponseDto(doc: unknown): LegalDocumentResponseDto {
    const d = doc as Record<string, unknown>;
    return {
      id: d.id as string,
      type: d.type as string,
      version: d.version as string,
      title: d.title as string,
      contentHash: d.contentHash as string,
      countryCode: d.countryCode as string,
      locale: d.locale as string,
      status: d.status as string,
      effectiveFrom: d.effectiveFrom as Date | null,
      effectiveTo: d.effectiveTo as Date | null,
      createdAt: d.createdAt as Date,
      updatedAt: d.updatedAt as Date,
    };
  }
}

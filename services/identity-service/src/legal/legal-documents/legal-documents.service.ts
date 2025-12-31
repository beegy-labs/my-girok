import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { LegalPrismaService } from '../../database/legal-prisma.service';
import { LegalDocumentType, Prisma } from '.prisma/identity-legal-client';
import {
  CreateLegalDocumentDto,
  UpdateLegalDocumentDto,
  LegalDocumentQueryDto,
  LegalDocumentResponseDto,
  LegalDocumentSummaryDto,
  LegalDocumentListResponseDto,
} from './dto/legal-document.dto';

/**
 * Legal Documents Service
 *
 * Manages legal document lifecycle including:
 * - Document creation and versioning
 * - Document updates
 * - Document retrieval by type, locale, and version
 * - Document archival
 */
@Injectable()
export class LegalDocumentsService {
  private readonly logger = new Logger(LegalDocumentsService.name);

  constructor(private readonly prisma: LegalPrismaService) {}

  /**
   * Create a new legal document
   */
  async create(dto: CreateLegalDocumentDto, createdBy?: string): Promise<LegalDocumentResponseDto> {
    // Check if document with same type, version, locale, serviceId, countryCode exists
    const existing = await this.prisma.legalDocument.findFirst({
      where: {
        type: dto.type,
        version: dto.version,
        locale: dto.locale || 'en',
        serviceId: dto.serviceId || null,
        countryCode: dto.countryCode || null,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Document already exists: type=${dto.type}, version=${dto.version}, locale=${dto.locale}`,
      );
    }

    const document = await this.prisma.legalDocument.create({
      data: {
        type: dto.type,
        version: dto.version,
        locale: dto.locale || 'en',
        title: dto.title,
        content: dto.content,
        summary: dto.summary,
        effectiveDate: dto.effectiveDate,
        expiresAt: dto.expiresAt,
        serviceId: dto.serviceId,
        countryCode: dto.countryCode,
        isActive: true,
        createdBy,
      },
    });

    this.logger.log(
      `Legal document created: id=${document.id}, type=${dto.type}, version=${dto.version}`,
    );

    return document as LegalDocumentResponseDto;
  }

  /**
   * Get document by ID
   */
  async findById(id: string): Promise<LegalDocumentResponseDto> {
    const document = await this.prisma.legalDocument.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException(`Legal document not found: ${id}`);
    }

    return document as LegalDocumentResponseDto;
  }

  /**
   * Get latest active document by type and locale
   * Falls back to 'en' locale if requested locale not found
   */
  async findLatest(
    type: LegalDocumentType,
    locale: string = 'en',
    countryCode?: string,
    serviceId?: string,
  ): Promise<LegalDocumentResponseDto> {
    const where: Prisma.LegalDocumentWhereInput = {
      type,
      locale,
      isActive: true,
      effectiveDate: { lte: new Date() },
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    };

    if (countryCode) {
      where.countryCode = countryCode;
    }
    if (serviceId) {
      where.serviceId = serviceId;
    }

    let document = await this.prisma.legalDocument.findFirst({
      where,
      orderBy: { effectiveDate: 'desc' },
    });

    // Fallback to English if not found
    if (!document && locale !== 'en') {
      document = await this.prisma.legalDocument.findFirst({
        where: { ...where, locale: 'en' },
        orderBy: { effectiveDate: 'desc' },
      });
    }

    // Fallback to global document (no country/service)
    if (!document && (countryCode || serviceId)) {
      document = await this.prisma.legalDocument.findFirst({
        where: {
          type,
          locale: locale !== 'en' ? 'en' : locale,
          isActive: true,
          effectiveDate: { lte: new Date() },
          countryCode: null,
          serviceId: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        orderBy: { effectiveDate: 'desc' },
      });
    }

    if (!document) {
      throw new NotFoundException(`Legal document not found: type=${type}, locale=${locale}`);
    }

    return document as LegalDocumentResponseDto;
  }

  /**
   * Update a legal document
   */
  async update(
    id: string,
    dto: UpdateLegalDocumentDto,
    updatedBy?: string,
  ): Promise<LegalDocumentResponseDto> {
    const existing = await this.prisma.legalDocument.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Legal document not found: ${id}`);
    }

    const document = await this.prisma.legalDocument.update({
      where: { id },
      data: {
        title: dto.title,
        content: dto.content,
        summary: dto.summary,
        effectiveDate: dto.effectiveDate,
        expiresAt: dto.expiresAt,
        isActive: dto.isActive,
        updatedBy,
      },
    });

    this.logger.log(`Legal document updated: id=${id}`);

    return document as LegalDocumentResponseDto;
  }

  /**
   * Archive a legal document (set isActive to false)
   */
  async archive(id: string, updatedBy?: string): Promise<void> {
    const existing = await this.prisma.legalDocument.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Legal document not found: ${id}`);
    }

    await this.prisma.legalDocument.update({
      where: { id },
      data: {
        isActive: false,
        updatedBy,
      },
    });

    this.logger.log(`Legal document archived: id=${id}`);
  }

  /**
   * List documents with pagination and filters
   */
  async findAll(query: LegalDocumentQueryDto): Promise<LegalDocumentListResponseDto> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.LegalDocumentWhereInput = {};

    if (query.type) {
      where.type = query.type;
    }
    if (query.locale) {
      where.locale = query.locale;
    }
    if (query.countryCode) {
      where.countryCode = query.countryCode;
    }
    if (query.serviceId) {
      where.serviceId = query.serviceId;
    }
    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    const [documents, total] = await Promise.all([
      this.prisma.legalDocument.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ type: 'asc' }, { effectiveDate: 'desc' }],
        select: {
          id: true,
          type: true,
          version: true,
          locale: true,
          title: true,
          summary: true,
          effectiveDate: true,
          isActive: true,
        },
      }),
      this.prisma.legalDocument.count({ where }),
    ]);

    return {
      data: documents as LegalDocumentSummaryDto[],
      meta: { total, page, limit },
    };
  }

  /**
   * Get all versions of a document type for a locale
   */
  async getVersions(
    type: LegalDocumentType,
    locale: string = 'en',
  ): Promise<LegalDocumentSummaryDto[]> {
    const documents = await this.prisma.legalDocument.findMany({
      where: { type, locale },
      orderBy: { effectiveDate: 'desc' },
      select: {
        id: true,
        type: true,
        version: true,
        locale: true,
        title: true,
        summary: true,
        effectiveDate: true,
        isActive: true,
      },
    });

    return documents as LegalDocumentSummaryDto[];
  }

  /**
   * Get document by specific version
   */
  async findByVersion(
    type: LegalDocumentType,
    version: string,
    locale: string = 'en',
  ): Promise<LegalDocumentResponseDto> {
    const document = await this.prisma.legalDocument.findFirst({
      where: { type, version, locale },
    });

    if (!document) {
      throw new NotFoundException(
        `Legal document not found: type=${type}, version=${version}, locale=${locale}`,
      );
    }

    return document as LegalDocumentResponseDto;
  }

  /**
   * Create new version of an existing document
   */
  async createVersion(
    type: LegalDocumentType,
    locale: string,
    dto: CreateLegalDocumentDto,
    createdBy?: string,
  ): Promise<LegalDocumentResponseDto> {
    // Deactivate previous versions
    await this.prisma.legalDocument.updateMany({
      where: {
        type,
        locale,
        isActive: true,
      },
      data: {
        isActive: false,
        updatedBy: createdBy,
      },
    });

    // Create new version
    const document = await this.create(
      {
        ...dto,
        type,
        locale,
      },
      createdBy,
    );

    this.logger.log(`New document version created: type=${type}, version=${dto.version}`);

    return document;
  }
}

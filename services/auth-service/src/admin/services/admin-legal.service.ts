import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateLegalDocumentDto,
  UpdateLegalDocumentDto,
  DocumentListQuery,
  DocumentResponse,
  DocumentListResponse,
  ConsentListQuery,
  ConsentResponse,
  ConsentListResponse,
  ConsentStatsResponse,
} from '../dto/admin-legal.dto';
import { AdminPayload } from '../types/admin.types';

interface LegalDocumentRow {
  id: string;
  type: string;
  version: string;
  locale: string;
  title: string;
  content: string;
  summary: string | null;
  effectiveDate: Date;
  isActive: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ConsentRow {
  id: string;
  userId: string;
  consentType: string;
  documentId: string | null;
  documentVersion: string | null;
  agreed: boolean;
  agreedAt: Date;
  withdrawnAt: Date | null;
  ipAddress: string | null;
  createdAt: Date;
  userEmail: string;
  userName: string | null;
  userRegion: string | null;
}

@Injectable()
export class AdminLegalService {
  constructor(private prisma: PrismaService) {}

  // ============================================================
  // LEGAL DOCUMENTS
  // ============================================================

  /**
   * List documents with parameterized filters
   * Uses COALESCE pattern for optional filters (SQL-injection safe)
   */
  async listDocuments(query: DocumentListQuery): Promise<DocumentListResponse> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    // Use COALESCE pattern: (column = param OR param IS NULL)
    const typeFilter = query.type ?? null;
    const localeFilter = query.locale ?? null;
    const isActiveFilter = query.isActive ?? null;

    const countResult = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM legal_documents
      WHERE (type::TEXT = ${typeFilter} OR ${typeFilter}::TEXT IS NULL)
        AND (locale = ${localeFilter} OR ${localeFilter}::TEXT IS NULL)
        AND (is_active = ${isActiveFilter} OR ${isActiveFilter}::BOOLEAN IS NULL)
    `;
    const total = Number(countResult[0].count);

    const items = await this.prisma.$queryRaw<LegalDocumentRow[]>`
      SELECT
        id, type, version, locale, title, content, summary,
        effective_date as "effectiveDate", is_active as "isActive",
        created_by as "createdBy", updated_by as "updatedBy",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM legal_documents
      WHERE (type::TEXT = ${typeFilter} OR ${typeFilter}::TEXT IS NULL)
        AND (locale = ${localeFilter} OR ${localeFilter}::TEXT IS NULL)
        AND (is_active = ${isActiveFilter} OR ${isActiveFilter}::BOOLEAN IS NULL)
      ORDER BY type, locale, created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return {
      items: items as DocumentResponse[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getDocumentById(id: string): Promise<DocumentResponse> {
    const docs = await this.prisma.$queryRaw<LegalDocumentRow[]>`
      SELECT
        id, type, version, locale, title, content, summary,
        effective_date as "effectiveDate", is_active as "isActive",
        created_by as "createdBy", updated_by as "updatedBy",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM legal_documents
      WHERE id = ${id}
      LIMIT 1
    `;

    if (docs.length === 0) {
      throw new NotFoundException('Document not found');
    }

    return docs[0] as DocumentResponse;
  }

  async createDocument(
    dto: CreateLegalDocumentDto,
    admin: AdminPayload,
  ): Promise<DocumentResponse> {
    // Check for duplicate type+version+locale
    const existing = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM legal_documents
      WHERE type = ${dto.type}::"LegalDocumentType"
        AND version = ${dto.version}
        AND locale = ${dto.locale}
      LIMIT 1
    `;

    if (existing.length > 0) {
      throw new ConflictException(
        `Document ${dto.type} v${dto.version} (${dto.locale}) already exists`,
      );
    }

    const docs = await this.prisma.$queryRaw<LegalDocumentRow[]>`
      INSERT INTO legal_documents (
        id, type, version, locale, title, content, summary,
        effective_date, is_active, created_by
      )
      VALUES (
        gen_random_uuid()::TEXT,
        ${dto.type}::"LegalDocumentType",
        ${dto.version},
        ${dto.locale},
        ${dto.title},
        ${dto.content},
        ${dto.summary || null},
        ${new Date(dto.effectiveDate)},
        TRUE,
        ${admin.sub}
      )
      RETURNING
        id, type, version, locale, title, content, summary,
        effective_date as "effectiveDate", is_active as "isActive",
        created_by as "createdBy", updated_by as "updatedBy",
        created_at as "createdAt", updated_at as "updatedAt"
    `;

    // Log audit
    await this.logAudit(admin.sub, 'create', 'legal_document', docs[0].id, null, {
      type: dto.type,
      version: dto.version,
      locale: dto.locale,
    });

    return docs[0] as DocumentResponse;
  }

  /**
   * Update document with parameterized queries
   * Uses COALESCE pattern for conditional updates (SQL-injection safe)
   */
  async updateDocument(
    id: string,
    dto: UpdateLegalDocumentDto,
    admin: AdminPayload,
  ): Promise<DocumentResponse> {
    const existing = await this.getDocumentById(id);

    // Use COALESCE pattern for conditional updates
    const titleValue = dto.title ?? null;
    const contentValue = dto.content ?? null;
    const summaryValue = dto.summary ?? null;
    const effectiveDateValue = dto.effectiveDate ? new Date(dto.effectiveDate) : null;
    const isActiveValue = dto.isActive ?? null;

    const docs = await this.prisma.$queryRaw<LegalDocumentRow[]>`
      UPDATE legal_documents
      SET
        title = COALESCE(${titleValue}, title),
        content = COALESCE(${contentValue}, content),
        summary = COALESCE(${summaryValue}, summary),
        effective_date = COALESCE(${effectiveDateValue}, effective_date),
        is_active = COALESCE(${isActiveValue}, is_active),
        updated_by = ${admin.sub},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING
        id, type, version, locale, title, content, summary,
        effective_date as "effectiveDate", is_active as "isActive",
        created_by as "createdBy", updated_by as "updatedBy",
        created_at as "createdAt", updated_at as "updatedAt"
    `;

    // Log audit
    await this.logAudit(admin.sub, 'update', 'legal_document', id, existing, dto);

    return docs[0] as DocumentResponse;
  }

  async deleteDocument(id: string, admin: AdminPayload): Promise<void> {
    const existing = await this.getDocumentById(id);

    // Soft delete
    await this.prisma.$executeRaw`
      UPDATE legal_documents
      SET is_active = FALSE, updated_by = ${admin.sub}
      WHERE id = ${id}
    `;

    await this.logAudit(admin.sub, 'delete', 'legal_document', id, existing, null);
  }

  // ============================================================
  // CONSENTS
  // ============================================================

  /**
   * List consents with parameterized filters
   * Uses COALESCE pattern for optional filters (SQL-injection safe)
   */
  async listConsents(query: ConsentListQuery): Promise<ConsentListResponse> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    // Use COALESCE pattern: (column = param OR param IS NULL)
    const consentTypeFilter = query.consentType ?? null;
    const userIdFilter = query.userId ?? null;
    const agreedFilter = query.agreed ?? null;
    const dateFromFilter = query.dateFrom ? new Date(query.dateFrom) : null;
    const dateToFilter = query.dateTo ? new Date(query.dateTo) : null;

    const countResult = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM user_consents c
      WHERE (c.consent_type::TEXT = ${consentTypeFilter} OR ${consentTypeFilter}::TEXT IS NULL)
        AND (c.user_id = ${userIdFilter} OR ${userIdFilter}::TEXT IS NULL)
        AND (c.agreed = ${agreedFilter} OR ${agreedFilter}::BOOLEAN IS NULL)
        AND (c.agreed_at >= ${dateFromFilter} OR ${dateFromFilter}::TIMESTAMP IS NULL)
        AND (c.agreed_at <= ${dateToFilter} OR ${dateToFilter}::TIMESTAMP IS NULL)
    `;
    const total = Number(countResult[0].count);

    const items = await this.prisma.$queryRaw<ConsentRow[]>`
      SELECT
        c.id, c.user_id as "userId", c.consent_type as "consentType",
        c.document_id as "documentId", c.document_version as "documentVersion",
        c.agreed, c.agreed_at as "agreedAt", c.withdrawn_at as "withdrawnAt",
        c.ip_address as "ipAddress", c.created_at as "createdAt",
        u.email as "userEmail", u.name as "userName", u.region as "userRegion"
      FROM user_consents c
      JOIN users u ON c.user_id = u.id
      WHERE (c.consent_type::TEXT = ${consentTypeFilter} OR ${consentTypeFilter}::TEXT IS NULL)
        AND (c.user_id = ${userIdFilter} OR ${userIdFilter}::TEXT IS NULL)
        AND (c.agreed = ${agreedFilter} OR ${agreedFilter}::BOOLEAN IS NULL)
        AND (c.agreed_at >= ${dateFromFilter} OR ${dateFromFilter}::TIMESTAMP IS NULL)
        AND (c.agreed_at <= ${dateToFilter} OR ${dateToFilter}::TIMESTAMP IS NULL)
      ORDER BY c.agreed_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const mappedItems: ConsentResponse[] = items.map((c) => ({
      id: c.id,
      userId: c.userId,
      user: {
        id: c.userId,
        email: c.userEmail,
        name: c.userName,
        region: c.userRegion,
      },
      consentType: c.consentType as ConsentResponse['consentType'],
      documentId: c.documentId,
      documentVersion: c.documentVersion,
      agreed: c.agreed,
      agreedAt: c.agreedAt,
      withdrawnAt: c.withdrawnAt,
      ipAddress: c.ipAddress,
      createdAt: c.createdAt,
    }));

    return {
      items: mappedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getConsentStats(): Promise<ConsentStatsResponse> {
    // Stats by type
    const byType = await this.prisma.$queryRaw<
      { type: string; total: bigint; agreed: bigint; withdrawn: bigint }[]
    >`
      SELECT
        consent_type as type,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE agreed = TRUE AND withdrawn_at IS NULL) as agreed,
        COUNT(*) FILTER (WHERE withdrawn_at IS NOT NULL) as withdrawn
      FROM user_consents
      GROUP BY consent_type
      ORDER BY consent_type
    `;

    // Stats by region
    const byRegion = await this.prisma.$queryRaw<{ region: string; total: bigint }[]>`
      SELECT
        COALESCE(u.region, 'UNKNOWN') as region,
        COUNT(*) as total
      FROM user_consents c
      JOIN users u ON c.user_id = u.id
      GROUP BY u.region
      ORDER BY total DESC
    `;

    // Recent activity (last 30 days)
    const recentActivity = await this.prisma.$queryRaw<
      { date: Date; agreed: bigint; withdrawn: bigint }[]
    >`
      SELECT
        DATE(agreed_at) as date,
        COUNT(*) FILTER (WHERE agreed = TRUE) as agreed,
        COUNT(*) FILTER (WHERE withdrawn_at IS NOT NULL) as withdrawn
      FROM user_consents
      WHERE agreed_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(agreed_at)
      ORDER BY date DESC
    `;

    // Summary
    const summary = await this.prisma.$queryRaw<
      { totalConsents: bigint; totalUsers: bigint; agreedCount: bigint }[]
    >`
      SELECT
        COUNT(*) as "totalConsents",
        COUNT(DISTINCT user_id) as "totalUsers",
        COUNT(*) FILTER (WHERE agreed = TRUE AND withdrawn_at IS NULL) as "agreedCount"
      FROM user_consents
    `;

    const totalConsents = Number(summary[0].totalConsents);
    const agreedCount = Number(summary[0].agreedCount);

    return {
      byType: byType.map((t) => ({
        type: t.type as ConsentStatsResponse['byType'][0]['type'],
        total: Number(t.total),
        agreed: Number(t.agreed),
        withdrawn: Number(t.withdrawn),
        rate: Number(t.total) > 0 ? Number(t.agreed) / Number(t.total) : 0,
      })),
      byRegion: byRegion.map((r) => ({
        region: r.region,
        total: Number(r.total),
      })),
      recentActivity: recentActivity.map((a) => ({
        date: a.date.toISOString().split('T')[0],
        agreed: Number(a.agreed),
        withdrawn: Number(a.withdrawn),
      })),
      summary: {
        totalConsents,
        totalUsers: Number(summary[0].totalUsers),
        overallAgreementRate: totalConsents > 0 ? agreedCount / totalConsents : 0,
      },
    };
  }

  private async logAudit(
    adminId: string,
    action: string,
    resource: string,
    resourceId: string,
    before: unknown,
    after: unknown,
  ): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO audit_logs (id, admin_id, action, resource, resource_id, before_state, after_state)
      VALUES (
        gen_random_uuid()::TEXT,
        ${adminId},
        ${action},
        ${resource},
        ${resourceId},
        ${before ? JSON.stringify(before) : null}::JSONB,
        ${after ? JSON.stringify(after) : null}::JSONB
      )
    `;
  }
}

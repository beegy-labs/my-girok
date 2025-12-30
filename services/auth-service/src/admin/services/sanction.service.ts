import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '../../../node_modules/.prisma/auth-client';
import { ID, CacheKey, CacheTTL, Transactional } from '@my-girok/nest-common';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogService } from './audit-log.service';
import { AdminPayload } from '../types/admin.types';
import {
  CreateSanctionDto,
  UpdateSanctionDto,
  RevokeSanctionDto,
  ExtendSanctionDto,
  ReduceSanctionDto,
  ReviewAppealDto,
  ResendNotificationsDto,
  ListSanctionsQueryDto,
  SanctionResponseDto,
  SanctionNotificationResponseDto,
  SanctionListResponseDto,
  AppealResponseDto,
  SanctionSubjectType,
  SanctionType,
  SanctionStatus,
  SanctionScope,
  SanctionSeverity,
  AppealStatus,
  NotificationChannel,
} from '../dto/sanction.dto';

// Cache key helper
const SANCTION_CACHE_KEY = (serviceId: string, sanctionId: string) =>
  CacheKey.make('auth', 'sanction', serviceId, sanctionId);

interface SanctionRow {
  id: string;
  subjectId: string;
  subjectType: string;
  subjectEmail: string;
  subjectName: string | null;
  serviceId: string | null;
  scope: string;
  type: string;
  status: string;
  severity: string;
  restrictedFeatures: string[];
  reason: string;
  internalNote: string | null;
  evidenceUrls: string[];
  issuedBy: string;
  issuerEmail: string;
  issuerName: string;
  issuedByType: string;
  startAt: Date;
  endAt: Date | null;
  revokedAt: Date | null;
  revokedBy: string | null;
  revokeReason: string | null;
  appealStatus: string | null;
  appealedAt: Date | null;
  appealReason: string | null;
  appealReviewedBy: string | null;
  appealReviewedAt: Date | null;
  appealResponse: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface NotificationRow {
  id: string;
  sanctionId: string;
  channel: string;
  status: string;
  sentAt: Date | null;
  readAt: Date | null;
  createdAt: Date;
}

@Injectable()
export class SanctionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Invalidate sanction cache for a service
   */
  private async invalidateCache(serviceId: string, sanctionId?: string): Promise<void> {
    // Invalidate specific sanction cache if provided
    if (sanctionId) {
      await this.cache.del(SANCTION_CACHE_KEY(serviceId, sanctionId));
    }
    // Invalidate list cache (pattern-based - delete all list caches for service)
    // Note: Simple approach - in production, consider using cache tags
    this.eventEmitter.emit('sanction.updated', { serviceId, sanctionId });
  }

  // ============================================================
  // SANCTION CRUD
  // ============================================================

  async list(serviceId: string, query: ListSanctionsQueryDto): Promise<SanctionListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const statusFilter = query.status ?? null;
    const typeFilter = query.type ?? null;
    const severityFilter = query.severity ?? null;
    const subjectTypeFilter = query.subjectType ?? null;
    const appealStatusFilter = query.appealStatus ?? null;

    const countResult = await this.prisma.$queryRaw<{ count: bigint }[]>(
      Prisma.sql`
      SELECT COUNT(*) as count FROM sanctions
      WHERE (service_id = ${serviceId}::uuid OR service_id IS NULL)
        AND (${statusFilter}::TEXT IS NULL OR status = ${statusFilter}::sanction_status)
        AND (${typeFilter}::TEXT IS NULL OR type = ${typeFilter}::sanction_type)
        AND (${severityFilter}::TEXT IS NULL OR severity = ${severityFilter}::sanction_severity)
        AND (${subjectTypeFilter}::TEXT IS NULL OR subject_type = ${subjectTypeFilter}::sanction_subject_type)
        AND (${appealStatusFilter}::TEXT IS NULL OR appeal_status = ${appealStatusFilter}::appeal_status)
    `,
    );
    const total = Number(countResult[0]?.count ?? 0);

    const sanctions = await this.prisma.$queryRaw<SanctionRow[]>(
      Prisma.sql`
      SELECT
        s.id, s.subject_id as "subjectId", s.subject_type as "subjectType",
        COALESCE(u.email, a.email) as "subjectEmail",
        COALESCE(u.name, a.name) as "subjectName",
        s.service_id as "serviceId", s.scope, s.type, s.status, s.severity,
        s.restricted_features as "restrictedFeatures", s.reason,
        s.internal_note as "internalNote", s.evidence_urls as "evidenceUrls",
        s.issued_by as "issuedBy", ia.email as "issuerEmail", ia.name as "issuerName",
        s.issued_by_type as "issuedByType",
        s.start_at as "startAt", s.end_at as "endAt",
        s.revoked_at as "revokedAt", s.revoked_by as "revokedBy",
        s.revoke_reason as "revokeReason",
        s.appeal_status as "appealStatus", s.appealed_at as "appealedAt",
        s.appeal_reason as "appealReason", s.appeal_reviewed_by as "appealReviewedBy",
        s.appeal_reviewed_at as "appealReviewedAt", s.appeal_response as "appealResponse",
        s.created_at as "createdAt", s.updated_at as "updatedAt"
      FROM sanctions s
      LEFT JOIN users u ON u.id = s.subject_id AND s.subject_type = 'USER'
      LEFT JOIN admins a ON a.id = s.subject_id AND s.subject_type = 'ADMIN'
      LEFT JOIN admins ia ON ia.id = s.issued_by
      WHERE (s.service_id = ${serviceId}::uuid OR s.service_id IS NULL)
        AND (${statusFilter}::TEXT IS NULL OR s.status = ${statusFilter}::sanction_status)
        AND (${typeFilter}::TEXT IS NULL OR s.type = ${typeFilter}::sanction_type)
        AND (${severityFilter}::TEXT IS NULL OR s.severity = ${severityFilter}::sanction_severity)
        AND (${subjectTypeFilter}::TEXT IS NULL OR s.subject_type = ${subjectTypeFilter}::sanction_subject_type)
        AND (${appealStatusFilter}::TEXT IS NULL OR s.appeal_status = ${appealStatusFilter}::appeal_status)
      ORDER BY s.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `,
    );

    const data: SanctionResponseDto[] = sanctions.map((s) => this.mapSanctionRow(s));

    return {
      data,
      meta: { total, page, limit, serviceId },
    };
  }

  async findOne(
    serviceId: string,
    id: string,
    options?: { includeNotifications?: boolean; skipCache?: boolean },
  ): Promise<SanctionResponseDto> {
    // Check cache first (skip for includeNotifications as it's a composite query)
    const cacheKey = SANCTION_CACHE_KEY(serviceId, id);
    if (!options?.includeNotifications && !options?.skipCache) {
      const cached = await this.cache.get<SanctionResponseDto>(cacheKey);
      if (cached) return cached;
    }

    const sanctions = await this.prisma.$queryRaw<SanctionRow[]>(
      Prisma.sql`
      SELECT
        s.id, s.subject_id as "subjectId", s.subject_type as "subjectType",
        COALESCE(u.email, a.email) as "subjectEmail",
        COALESCE(u.name, a.name) as "subjectName",
        s.service_id as "serviceId", s.scope, s.type, s.status, s.severity,
        s.restricted_features as "restrictedFeatures", s.reason,
        s.internal_note as "internalNote", s.evidence_urls as "evidenceUrls",
        s.issued_by as "issuedBy", ia.email as "issuerEmail", ia.name as "issuerName",
        s.issued_by_type as "issuedByType",
        s.start_at as "startAt", s.end_at as "endAt",
        s.revoked_at as "revokedAt", s.revoked_by as "revokedBy",
        s.revoke_reason as "revokeReason",
        s.appeal_status as "appealStatus", s.appealed_at as "appealedAt",
        s.appeal_reason as "appealReason", s.appeal_reviewed_by as "appealReviewedBy",
        s.appeal_reviewed_at as "appealReviewedAt", s.appeal_response as "appealResponse",
        s.created_at as "createdAt", s.updated_at as "updatedAt"
      FROM sanctions s
      LEFT JOIN users u ON u.id = s.subject_id AND s.subject_type = 'USER'
      LEFT JOIN admins a ON a.id = s.subject_id AND s.subject_type = 'ADMIN'
      LEFT JOIN admins ia ON ia.id = s.issued_by
      WHERE s.id = ${id}::uuid
        AND (s.service_id = ${serviceId}::uuid OR s.service_id IS NULL)
      LIMIT 1
    `,
    );

    if (!sanctions.length) {
      throw new NotFoundException(`Sanction not found: ${id}`);
    }

    const result = this.mapSanctionRow(sanctions[0]);

    // Cache the base result (without notifications) for 5 minutes
    if (!options?.includeNotifications) {
      await this.cache.set(cacheKey, result, CacheTTL.USER_DATA);
    }

    if (options?.includeNotifications) {
      result.notifications = await this.getNotifications(serviceId, id);
    }

    return result;
  }

  @Transactional()
  async create(
    serviceId: string,
    dto: CreateSanctionDto,
    admin: AdminPayload,
  ): Promise<SanctionResponseDto> {
    // Validate feature codes if FEATURE_RESTRICTION
    if (dto.type === 'FEATURE_RESTRICTION') {
      if (!dto.restrictedFeatures?.length) {
        throw new BadRequestException('restrictedFeatures required for FEATURE_RESTRICTION');
      }
      await this.validateFeatureCodes(serviceId, dto.restrictedFeatures);
    }

    // Validate endAt for TEMPORARY_BAN
    if (dto.type === 'TEMPORARY_BAN' && !dto.endAt) {
      throw new BadRequestException('endAt required for TEMPORARY_BAN');
    }

    const sanctionId = ID.generate();
    const scope = dto.scope ?? SanctionScope.SERVICE;
    const severity = dto.severity ?? SanctionSeverity.MEDIUM;
    const channels = dto.notificationChannels ?? [
      NotificationChannel.EMAIL,
      NotificationChannel.IN_APP,
    ];

    await this.prisma.$executeRaw(
      Prisma.sql`
      INSERT INTO sanctions (
        id, subject_id, subject_type, service_id, scope, type, status, severity,
        restricted_features, reason, internal_note, evidence_urls,
        issued_by, issued_by_type, start_at, end_at
      )
      VALUES (
        ${sanctionId}::uuid,
        ${dto.subjectId}::uuid,
        ${dto.subjectType}::sanction_subject_type,
        ${serviceId}::uuid,
        ${scope}::sanction_scope,
        ${dto.type}::sanction_type,
        'ACTIVE'::sanction_status,
        ${severity}::sanction_severity,
        ${dto.restrictedFeatures ?? []}::TEXT[],
        ${dto.reason},
        ${dto.internalNote ?? null},
        ${dto.evidenceUrls ?? []}::TEXT[],
        ${admin.sub}::uuid,
        'ADMIN'::issuer_type,
        ${new Date(dto.startAt)}::timestamptz,
        ${dto.endAt ? new Date(dto.endAt) : null}::timestamptz
      )
    `,
    );

    // Create notifications
    for (const channel of channels) {
      const notifId = ID.generate();
      await this.prisma.$executeRaw(
        Prisma.sql`
        INSERT INTO sanction_notifications (id, sanction_id, channel, status)
        VALUES (${notifId}::uuid, ${sanctionId}::uuid, ${channel}::notification_channel, 'PENDING'::notification_status)
      `,
      );
    }

    const sanction = await this.findOne(serviceId, sanctionId, {
      includeNotifications: true,
      skipCache: true,
    });

    await this.auditLogService.log({
      resource: 'sanction',
      action: 'create',
      targetId: sanctionId,
      targetType: 'Sanction',
      targetIdentifier: `${dto.subjectType}:${dto.subjectId}`,
      afterState: sanction,
      reason: dto.reason,
      admin,
    });

    await this.invalidateCache(serviceId, sanctionId);

    return sanction;
  }

  @Transactional()
  async update(
    serviceId: string,
    id: string,
    dto: UpdateSanctionDto,
    admin: AdminPayload,
  ): Promise<SanctionResponseDto> {
    const beforeSanction = await this.findOne(serviceId, id);

    if (beforeSanction.status !== SanctionStatus.ACTIVE) {
      throw new BadRequestException('Can only update ACTIVE sanctions');
    }

    const { updateReason, ...updateData } = dto;

    await this.prisma.$executeRaw(
      Prisma.sql`
      UPDATE sanctions
      SET
        severity = COALESCE(${updateData.severity ?? null}::sanction_severity, severity),
        restricted_features = COALESCE(${updateData.restrictedFeatures ?? null}::TEXT[], restricted_features),
        reason = COALESCE(${updateData.reason ?? null}, reason),
        internal_note = COALESCE(${updateData.internalNote ?? null}, internal_note),
        evidence_urls = COALESCE(${updateData.evidenceUrls ?? null}::TEXT[], evidence_urls),
        end_at = COALESCE(${updateData.endAt ? new Date(updateData.endAt) : null}::timestamptz, end_at),
        updated_at = NOW()
      WHERE id = ${id}::uuid
    `,
    );

    await this.invalidateCache(serviceId, id);
    const afterSanction = await this.findOne(serviceId, id, { skipCache: true });

    await this.auditLogService.log({
      resource: 'sanction',
      action: 'update',
      targetId: id,
      targetType: 'Sanction',
      targetIdentifier: `${afterSanction.subjectType}:${afterSanction.subjectId}`,
      beforeState: beforeSanction,
      afterState: afterSanction,
      reason: updateReason,
      admin,
    });

    return afterSanction;
  }

  // ============================================================
  // SANCTION ACTIONS
  // ============================================================

  @Transactional()
  async revoke(
    serviceId: string,
    id: string,
    dto: RevokeSanctionDto,
    admin: AdminPayload,
  ): Promise<SanctionResponseDto> {
    const beforeSanction = await this.findOne(serviceId, id);

    if (beforeSanction.status !== SanctionStatus.ACTIVE) {
      throw new BadRequestException('Can only revoke ACTIVE sanctions');
    }

    await this.prisma.$executeRaw(
      Prisma.sql`
      UPDATE sanctions
      SET
        status = 'REVOKED'::sanction_status,
        revoked_at = NOW(),
        revoked_by = ${admin.sub}::uuid,
        revoke_reason = ${dto.reason},
        updated_at = NOW()
      WHERE id = ${id}::uuid
    `,
    );

    await this.invalidateCache(serviceId, id);
    const afterSanction = await this.findOne(serviceId, id, { skipCache: true });

    await this.auditLogService.log({
      resource: 'sanction',
      action: 'revoke',
      targetId: id,
      targetType: 'Sanction',
      targetIdentifier: `${afterSanction.subjectType}:${afterSanction.subjectId}`,
      beforeState: beforeSanction,
      afterState: afterSanction,
      reason: dto.reason,
      admin,
    });

    return afterSanction;
  }

  @Transactional()
  async extend(
    serviceId: string,
    id: string,
    dto: ExtendSanctionDto,
    admin: AdminPayload,
  ): Promise<SanctionResponseDto> {
    const beforeSanction = await this.findOne(serviceId, id);

    if (beforeSanction.status !== SanctionStatus.ACTIVE) {
      throw new BadRequestException('Can only extend ACTIVE sanctions');
    }

    const newEndAt = new Date(dto.newEndAt);
    if (beforeSanction.endAt && newEndAt <= beforeSanction.endAt) {
      throw new BadRequestException('New end date must be after current end date');
    }

    await this.prisma.$executeRaw(
      Prisma.sql`
      UPDATE sanctions
      SET end_at = ${newEndAt}::timestamptz, updated_at = NOW()
      WHERE id = ${id}::uuid
    `,
    );

    await this.invalidateCache(serviceId, id);
    const afterSanction = await this.findOne(serviceId, id, { skipCache: true });

    await this.auditLogService.log({
      resource: 'sanction',
      action: 'extend',
      targetId: id,
      targetType: 'Sanction',
      targetIdentifier: `${afterSanction.subjectType}:${afterSanction.subjectId}`,
      beforeState: { endAt: beforeSanction.endAt },
      afterState: { endAt: afterSanction.endAt },
      reason: dto.reason,
      admin,
    });

    return afterSanction;
  }

  @Transactional()
  async reduce(
    serviceId: string,
    id: string,
    dto: ReduceSanctionDto,
    admin: AdminPayload,
  ): Promise<SanctionResponseDto> {
    const beforeSanction = await this.findOne(serviceId, id);

    if (beforeSanction.status !== SanctionStatus.ACTIVE) {
      throw new BadRequestException('Can only reduce ACTIVE sanctions');
    }

    const newEndAt = new Date(dto.newEndAt);
    if (beforeSanction.endAt && newEndAt >= beforeSanction.endAt) {
      throw new BadRequestException('New end date must be before current end date');
    }

    await this.prisma.$executeRaw(
      Prisma.sql`
      UPDATE sanctions
      SET end_at = ${newEndAt}::timestamptz, updated_at = NOW()
      WHERE id = ${id}::uuid
    `,
    );

    await this.invalidateCache(serviceId, id);
    const afterSanction = await this.findOne(serviceId, id, { skipCache: true });

    await this.auditLogService.log({
      resource: 'sanction',
      action: 'reduce',
      targetId: id,
      targetType: 'Sanction',
      targetIdentifier: `${afterSanction.subjectType}:${afterSanction.subjectId}`,
      beforeState: { endAt: beforeSanction.endAt },
      afterState: { endAt: afterSanction.endAt },
      reason: dto.reason,
      admin,
    });

    return afterSanction;
  }

  // ============================================================
  // APPEAL MANAGEMENT
  // ============================================================

  async getAppeal(serviceId: string, id: string): Promise<AppealResponseDto> {
    const sanction = await this.findOne(serviceId, id);

    return {
      id: sanction.id,
      sanctionId: sanction.id,
      appealStatus: sanction.appealStatus,
      appealedAt: sanction.appealedAt,
      appealReason: sanction.appealReason,
      appealReviewedBy: sanction.appealReviewedBy,
      appealReviewedAt: sanction.appealReviewedAt,
      appealResponse: sanction.appealResponse,
    };
  }

  @Transactional({ isolationLevel: 'Serializable', timeout: 45000, maxRetries: 5 })
  async reviewAppeal(
    serviceId: string,
    id: string,
    dto: ReviewAppealDto,
    admin: AdminPayload,
  ): Promise<SanctionResponseDto> {
    const beforeSanction = await this.findOne(serviceId, id);

    if (!beforeSanction.appealStatus) {
      throw new BadRequestException('No appeal to review');
    }

    if (beforeSanction.appealStatus === 'APPROVED' || beforeSanction.appealStatus === 'REJECTED') {
      throw new BadRequestException('Appeal already reviewed');
    }

    // If approved, also revoke the sanction
    if (dto.status === 'APPROVED') {
      await this.prisma.$executeRaw(
        Prisma.sql`
        UPDATE sanctions
        SET
          appeal_status = ${dto.status}::appeal_status,
          appeal_reviewed_by = ${admin.sub}::uuid,
          appeal_reviewed_at = NOW(),
          appeal_response = ${dto.response},
          status = 'REVOKED'::sanction_status,
          revoked_at = NOW(),
          revoked_by = ${admin.sub}::uuid,
          revoke_reason = ${'Appeal approved: ' + dto.response},
          updated_at = NOW()
        WHERE id = ${id}::uuid
      `,
      );
    } else {
      await this.prisma.$executeRaw(
        Prisma.sql`
        UPDATE sanctions
        SET
          appeal_status = ${dto.status}::appeal_status,
          appeal_reviewed_by = ${admin.sub}::uuid,
          appeal_reviewed_at = NOW(),
          appeal_response = ${dto.response},
          updated_at = NOW()
        WHERE id = ${id}::uuid
      `,
      );
    }

    await this.invalidateCache(serviceId, id);
    const afterSanction = await this.findOne(serviceId, id, { skipCache: true });

    await this.auditLogService.log({
      resource: 'sanction_appeal',
      action: dto.status.toLowerCase(),
      targetId: id,
      targetType: 'Sanction',
      targetIdentifier: `appeal:${beforeSanction.subjectId}`,
      beforeState: { appealStatus: beforeSanction.appealStatus },
      afterState: { appealStatus: dto.status, appealResponse: dto.response },
      reason: dto.response,
      admin,
    });

    return afterSanction;
  }

  // ============================================================
  // NOTIFICATIONS
  // ============================================================

  async getNotifications(
    serviceId: string,
    sanctionId: string,
  ): Promise<SanctionNotificationResponseDto[]> {
    // Verify sanction exists
    await this.findOne(serviceId, sanctionId);

    const notifications = await this.prisma.$queryRaw<NotificationRow[]>(
      Prisma.sql`
      SELECT
        id, sanction_id as "sanctionId", channel, status,
        sent_at as "sentAt", read_at as "readAt", created_at as "createdAt"
      FROM sanction_notifications
      WHERE sanction_id = ${sanctionId}::uuid
      ORDER BY created_at DESC
    `,
    );

    return notifications as SanctionNotificationResponseDto[];
  }

  @Transactional()
  async resendNotifications(
    serviceId: string,
    sanctionId: string,
    dto: ResendNotificationsDto,
    admin: AdminPayload,
  ): Promise<SanctionNotificationResponseDto[]> {
    // Verify sanction exists
    await this.findOne(serviceId, sanctionId);

    // Create new notification entries
    for (const channel of dto.channels) {
      const notifId = ID.generate();
      await this.prisma.$executeRaw(
        Prisma.sql`
        INSERT INTO sanction_notifications (id, sanction_id, channel, status)
        VALUES (${notifId}::uuid, ${sanctionId}::uuid, ${channel}::notification_channel, 'PENDING'::notification_status)
      `,
      );
    }

    await this.auditLogService.log({
      resource: 'sanction_notification',
      action: 'resend',
      targetId: sanctionId,
      targetType: 'Sanction',
      targetIdentifier: `notifications:${dto.channels.join(',')}`,
      afterState: { channels: dto.channels },
      admin,
    });

    return this.getNotifications(serviceId, sanctionId);
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private mapSanctionRow(row: SanctionRow): SanctionResponseDto {
    return {
      id: row.id,
      subjectId: row.subjectId,
      subjectType: row.subjectType as SanctionSubjectType,
      subject: {
        id: row.subjectId,
        email: row.subjectEmail,
        name: row.subjectName,
      },
      serviceId: row.serviceId,
      scope: row.scope as SanctionScope,
      type: row.type as SanctionType,
      status: row.status as SanctionStatus,
      severity: row.severity as SanctionSeverity,
      restrictedFeatures: row.restrictedFeatures || [],
      reason: row.reason,
      internalNote: row.internalNote,
      evidenceUrls: row.evidenceUrls || [],
      issuedBy: row.issuedBy,
      issuer: {
        id: row.issuedBy,
        email: row.issuerEmail,
        name: row.issuerName,
      },
      issuedByType: row.issuedByType,
      startAt: row.startAt,
      endAt: row.endAt,
      revokedAt: row.revokedAt,
      revokedBy: row.revokedBy,
      revokeReason: row.revokeReason,
      appealStatus: row.appealStatus as AppealStatus | null,
      appealedAt: row.appealedAt,
      appealReason: row.appealReason,
      appealReviewedBy: row.appealReviewedBy,
      appealReviewedAt: row.appealReviewedAt,
      appealResponse: row.appealResponse,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private async validateFeatureCodes(serviceId: string, codes: string[]): Promise<void> {
    const features = await this.prisma.$queryRaw<{ code: string }[]>(
      Prisma.sql`
      SELECT code FROM service_features
      WHERE service_id = ${serviceId}::uuid AND code = ANY(${codes}::TEXT[])
    `,
    );

    const foundCodes = features.map((f) => f.code);
    const invalidCodes = codes.filter((c) => !foundCodes.includes(c));

    if (invalidCodes.length > 0) {
      throw new BadRequestException(`Invalid feature codes: ${invalidCodes.join(', ')}`);
    }
  }
}

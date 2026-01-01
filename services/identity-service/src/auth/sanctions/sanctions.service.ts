import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { AuthPrismaService } from '../../database/auth-prisma.service';
import { OutboxService } from '../../common/outbox/outbox.service';
import {
  CreateSanctionDto,
  SanctionSubjectType,
  SanctionType,
  SanctionSeverity,
  SanctionScope,
  IssuerType,
} from './dto/create-sanction.dto';
import {
  UpdateSanctionDto,
  RevokeSanctionDto,
  ExtendSanctionDto,
  ReduceSanctionDto,
  SubmitAppealDto,
  ReviewAppealDto,
  QuerySanctionDto,
  SanctionStatus,
  AppealStatus,
} from './dto/update-sanction.dto';
import {
  SanctionEntity,
  SanctionSummary,
  SanctionListResponse,
  ActiveSanctionsResult,
} from './entities/sanction.entity';

/**
 * Sanctions Service
 *
 * Manages account and operator sanctions including:
 * - Creating and revoking sanctions
 * - Appeal workflow
 * - Active sanction checks
 */
@Injectable()
export class SanctionsService {
  private readonly logger = new Logger(SanctionsService.name);

  constructor(
    private readonly prisma: AuthPrismaService,
    private readonly outbox: OutboxService,
  ) {}

  /**
   * Create a new sanction
   */
  async create(dto: CreateSanctionDto, issuedBy: string): Promise<SanctionEntity> {
    const result = await this.prisma.$transaction(async (tx) => {
      const sanction = await tx.sanction.create({
        data: {
          subjectId: dto.subjectId,
          subjectType: dto.subjectType,
          serviceId: dto.serviceId || null,
          scope: dto.scope || SanctionScope.SERVICE,
          type: dto.type,
          status: SanctionStatus.ACTIVE,
          severity: dto.severity || SanctionSeverity.MEDIUM,
          restrictedFeatures: dto.restrictedFeatures || [],
          reason: dto.reason,
          internalNote: dto.internalNote || null,
          evidenceUrls: dto.evidenceUrls || [],
          relatedSanctionId: dto.relatedSanctionId || null,
          issuedBy,
          issuedByType: dto.issuedByType || IssuerType.ADMIN,
          startAt: new Date(dto.startAt),
          endAt: dto.endAt ? new Date(dto.endAt) : null,
        },
      });

      // Create notifications
      if (dto.notificationChannels?.length) {
        await tx.sanctionNotification.createMany({
          data: dto.notificationChannels.map((channel) => ({
            sanctionId: sanction.id,
            channel,
            status: 'PENDING',
          })),
        });
      }

      // Publish event atomically within the transaction
      await this.outbox.publishInAuthTransaction(tx, {
        aggregateType: 'Sanction',
        aggregateId: sanction.id,
        eventType: 'SANCTION_APPLIED',
        payload: {
          sanctionId: sanction.id,
          subjectId: dto.subjectId,
          subjectType: dto.subjectType,
          type: dto.type,
          severity: dto.severity,
          reason: dto.reason,
        },
      });

      return sanction;
    });

    this.logger.log(
      `Sanction created: id=${result.id}, subject=${dto.subjectId}, type=${dto.type}`,
    );

    return SanctionEntity.fromPrisma(result);
  }

  /**
   * Get sanction by ID
   */
  async findById(id: string): Promise<SanctionEntity> {
    const sanction = await this.prisma.sanction.findUnique({
      where: { id },
      include: { notifications: true },
    });

    if (!sanction) {
      throw new NotFoundException(`Sanction not found: ${id}`);
    }

    return SanctionEntity.fromPrisma(sanction);
  }

  /**
   * Update a sanction
   */
  async update(id: string, dto: UpdateSanctionDto, operatorId: string): Promise<SanctionEntity> {
    const sanction = await this.findById(id);

    if (sanction.status !== SanctionStatus.ACTIVE) {
      throw new BadRequestException(`Cannot update sanction with status: ${sanction.status}`);
    }

    const result = await this.prisma.sanction.update({
      where: { id },
      data: {
        severity: dto.severity,
        restrictedFeatures: dto.restrictedFeatures,
        reason: dto.reason,
        internalNote: dto.internalNote,
        evidenceUrls: dto.evidenceUrls,
        endAt: dto.endAt ? new Date(dto.endAt) : undefined,
      },
    });

    this.logger.log(`Sanction updated: id=${id} by ${operatorId}`);

    return SanctionEntity.fromPrisma(result);
  }

  /**
   * Revoke a sanction
   */
  async revoke(id: string, dto: RevokeSanctionDto, revokedBy: string): Promise<SanctionEntity> {
    const sanction = await this.findById(id);

    if (sanction.status !== SanctionStatus.ACTIVE) {
      throw new BadRequestException(`Cannot revoke sanction with status: ${sanction.status}`);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.sanction.update({
        where: { id },
        data: {
          status: SanctionStatus.REVOKED,
          revokedAt: new Date(),
          revokedBy,
          revokeReason: dto.reason,
        },
      });

      // Publish event atomically within the transaction
      await this.outbox.publishInAuthTransaction(tx, {
        aggregateType: 'Sanction',
        aggregateId: id,
        eventType: 'SANCTION_REVOKED',
        payload: {
          sanctionId: id,
          subjectId: sanction.subjectId,
          revokedBy,
          reason: dto.reason,
        },
      });

      return updated;
    });

    this.logger.log(`Sanction revoked: id=${id} by ${revokedBy}`);

    return SanctionEntity.fromPrisma(result);
  }

  /**
   * Extend a sanction
   */
  async extend(id: string, dto: ExtendSanctionDto, operatorId: string): Promise<SanctionEntity> {
    const sanction = await this.findById(id);

    if (sanction.status !== SanctionStatus.ACTIVE) {
      throw new BadRequestException(`Cannot extend sanction with status: ${sanction.status}`);
    }

    const newEndAt = new Date(dto.newEndAt);
    if (sanction.endAt && newEndAt <= sanction.endAt) {
      throw new BadRequestException('New end date must be after current end date');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.sanction.update({
        where: { id },
        data: {
          endAt: newEndAt,
          internalNote:
            `${sanction.internalNote || ''}\n[Extension by ${operatorId}: ${dto.reason}]`.trim(),
        },
      });

      // Publish event atomically within the transaction
      await this.outbox.publishInAuthTransaction(tx, {
        aggregateType: 'Sanction',
        aggregateId: id,
        eventType: 'SANCTION_EXTENDED',
        payload: {
          sanctionId: id,
          subjectId: sanction.subjectId,
          previousEndAt: sanction.endAt,
          newEndAt,
          reason: dto.reason,
          extendedBy: operatorId,
        },
      });

      return updated;
    });

    this.logger.log(`Sanction extended: id=${id} to ${dto.newEndAt} by ${operatorId}`);

    return SanctionEntity.fromPrisma(result);
  }

  /**
   * Reduce a sanction
   */
  async reduce(id: string, dto: ReduceSanctionDto, operatorId: string): Promise<SanctionEntity> {
    const sanction = await this.findById(id);

    if (sanction.status !== SanctionStatus.ACTIVE) {
      throw new BadRequestException(`Cannot reduce sanction with status: ${sanction.status}`);
    }

    const newEndAt = new Date(dto.newEndAt);

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.sanction.update({
        where: { id },
        data: {
          endAt: newEndAt,
          internalNote:
            `${sanction.internalNote || ''}\n[Reduction by ${operatorId}: ${dto.reason}]`.trim(),
        },
      });

      // Publish event atomically within the transaction
      await this.outbox.publishInAuthTransaction(tx, {
        aggregateType: 'Sanction',
        aggregateId: id,
        eventType: 'SANCTION_REDUCED',
        payload: {
          sanctionId: id,
          subjectId: sanction.subjectId,
          previousEndAt: sanction.endAt,
          newEndAt,
          reason: dto.reason,
          reducedBy: operatorId,
        },
      });

      return updated;
    });

    this.logger.log(`Sanction reduced: id=${id} to ${dto.newEndAt} by ${operatorId}`);

    return SanctionEntity.fromPrisma(result);
  }

  /**
   * Submit an appeal
   */
  async submitAppeal(id: string, dto: SubmitAppealDto, subjectId: string): Promise<SanctionEntity> {
    const sanction = await this.findById(id);

    if (sanction.subjectId !== subjectId) {
      throw new BadRequestException('Cannot appeal sanctions of other subjects');
    }

    if (sanction.status !== SanctionStatus.ACTIVE) {
      throw new BadRequestException(`Cannot appeal sanction with status: ${sanction.status}`);
    }

    if (sanction.appealStatus) {
      throw new BadRequestException('Appeal already submitted');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.sanction.update({
        where: { id },
        data: {
          appealStatus: AppealStatus.PENDING,
          appealedAt: new Date(),
          appealReason: dto.reason,
          evidenceUrls: [...sanction.evidenceUrls, ...(dto.evidenceUrls || [])],
        },
      });

      // Publish event atomically within the transaction
      await this.outbox.publishInAuthTransaction(tx, {
        aggregateType: 'Sanction',
        aggregateId: id,
        eventType: 'SANCTION_APPEAL_SUBMITTED',
        payload: {
          sanctionId: id,
          subjectId: sanction.subjectId,
          appealReason: dto.reason,
        },
      });

      return updated;
    });

    this.logger.log(`Appeal submitted: sanctionId=${id}`);

    return SanctionEntity.fromPrisma(result);
  }

  /**
   * Review an appeal
   */
  async reviewAppeal(
    id: string,
    dto: ReviewAppealDto,
    reviewerId: string,
  ): Promise<SanctionEntity> {
    const sanction = await this.findById(id);

    if (!sanction.appealStatus) {
      throw new BadRequestException('No appeal to review');
    }

    if (
      sanction.appealStatus !== AppealStatus.PENDING &&
      sanction.appealStatus !== AppealStatus.UNDER_REVIEW
    ) {
      throw new BadRequestException(`Cannot review appeal with status: ${sanction.appealStatus}`);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updateData: Record<string, unknown> = {
        appealStatus: dto.status,
        appealReviewedBy: reviewerId,
        appealReviewedAt: new Date(),
        appealResponse: dto.response,
      };

      // If approved, revoke the sanction
      if (dto.status === 'APPROVED') {
        updateData.status = SanctionStatus.REVOKED;
        updateData.revokedAt = new Date();
        updateData.revokedBy = reviewerId;
        updateData.revokeReason = `Appeal approved: ${dto.response}`;
      }

      const updated = await tx.sanction.update({
        where: { id },
        data: updateData,
      });

      // Publish event atomically within the transaction
      await this.outbox.publishInAuthTransaction(tx, {
        aggregateType: 'Sanction',
        aggregateId: id,
        eventType: 'SANCTION_APPEAL_REVIEWED',
        payload: {
          sanctionId: id,
          subjectId: sanction.subjectId,
          reviewedBy: reviewerId,
          decision: dto.status,
          response: dto.response,
        },
      });

      return updated;
    });

    this.logger.log(`Appeal reviewed: sanctionId=${id}, decision=${dto.status}`);

    return SanctionEntity.fromPrisma(result);
  }

  /**
   * List sanctions with filters
   */
  async findAll(query: QuerySanctionDto): Promise<SanctionListResponse> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (query.subjectId) where.subjectId = query.subjectId;
    if (query.subjectType) where.subjectType = query.subjectType;
    if (query.serviceId) where.serviceId = query.serviceId;
    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;
    if (query.severity) where.severity = query.severity;
    if (query.scope) where.scope = query.scope;
    if (query.appealStatus) where.appealStatus = query.appealStatus;

    const orderBy: Record<string, 'asc' | 'desc'> = {};
    if (query.sort) {
      orderBy[query.sort] = query.order || 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [sanctions, total] = await Promise.all([
      this.prisma.sanction.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.sanction.count({ where }),
    ]);

    return {
      data: sanctions.map((s) => SanctionSummary.fromPrisma(s)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get active sanctions for a subject
   */
  async getActiveSanctions(
    subjectId: string,
    subjectType: SanctionSubjectType,
    serviceId?: string,
  ): Promise<ActiveSanctionsResult> {
    const now = new Date();

    const where: Record<string, unknown> = {
      subjectId,
      subjectType,
      status: SanctionStatus.ACTIVE,
      startAt: { lte: now },
      OR: [{ endAt: null }, { endAt: { gt: now } }],
    };

    if (serviceId) {
      where.OR = [{ scope: SanctionScope.PLATFORM }, { serviceId, scope: SanctionScope.SERVICE }];
    }

    const sanctions = await this.prisma.sanction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const restrictedFeatures = new Set<string>();
    let isPermanentlyBanned = false;

    for (const s of sanctions) {
      if (s.type === SanctionType.PERMANENT_BAN) {
        isPermanentlyBanned = true;
      }
      if (s.restrictedFeatures) {
        for (const f of s.restrictedFeatures) {
          restrictedFeatures.add(f);
        }
      }
    }

    return {
      isSanctioned: sanctions.length > 0,
      activeSanctions: sanctions.map((s) => SanctionSummary.fromPrisma(s)),
      restrictedFeatures: Array.from(restrictedFeatures),
      isPermanentlyBanned,
    };
  }

  /**
   * Check if a subject is currently sanctioned
   */
  async isSanctioned(
    subjectId: string,
    subjectType: SanctionSubjectType,
    serviceId?: string,
  ): Promise<boolean> {
    const result = await this.getActiveSanctions(subjectId, subjectType, serviceId);
    return result.isSanctioned;
  }

  /**
   * Expire sanctions that have passed their end date
   */
  async expireSanctions(): Promise<number> {
    const now = new Date();

    const result = await this.prisma.sanction.updateMany({
      where: {
        status: SanctionStatus.ACTIVE,
        endAt: { lte: now },
      },
      data: {
        status: SanctionStatus.EXPIRED,
      },
    });

    if (result.count > 0) {
      this.logger.log(`Expired ${result.count} sanctions`);
    }

    return result.count;
  }
}

import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { LegalPrismaService } from '../../database/legal-prisma.service';
import { DsrStatus, DsrPriority, DsrResponseType, Prisma } from '.prisma/identity-legal-client';
import {
  CreateDsrRequestDto,
  VerifyDsrRequestDto,
  ProcessDsrRequestDto,
  ExtendDsrDeadlineDto,
  DsrRequestQueryDto,
  DsrRequestResponseDto,
  DsrRequestSummaryDto,
  DsrRequestListResponseDto,
  DsrRequestLogDto,
  DsrStatisticsDto,
} from './dto/dsr-request.dto';

/**
 * Default deadline days based on regulation
 */
const DEFAULT_DEADLINE_DAYS: Record<string, number> = {
  GDPR: 30,
  CCPA: 45,
  PIPA: 10,
  APPI: 14,
  DEFAULT: 30,
};

/**
 * DSR Requests Service
 *
 * Manages Data Subject Requests (GDPR/CCPA) including:
 * - Request submission and tracking
 * - Verification workflow
 * - Processing and completion
 * - Audit logging
 */
@Injectable()
export class DsrRequestsService {
  private readonly logger = new Logger(DsrRequestsService.name);

  constructor(private readonly prisma: LegalPrismaService) {}

  /**
   * Calculate deadline based on legal basis
   */
  private calculateDeadline(legalBasis?: string): Date {
    const days = DEFAULT_DEADLINE_DAYS[legalBasis || 'DEFAULT'] || 30;
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + days);
    return deadline;
  }

  /**
   * Submit a new DSR request
   */
  async submit(dto: CreateDsrRequestDto): Promise<DsrRequestResponseDto> {
    const deadline = this.calculateDeadline(dto.legalBasis);

    const result = await this.prisma.$transaction(async (tx) => {
      const request = await tx.dsrRequest.create({
        data: {
          accountId: dto.accountId,
          requestType: dto.requestType,
          status: DsrStatus.PENDING,
          priority: dto.priority || DsrPriority.NORMAL,
          description: dto.description,
          scope: dto.scope as Prisma.InputJsonValue,
          legalBasis: dto.legalBasis,
          deadline,
          ipAddress: dto.ipAddress,
          userAgent: dto.userAgent,
          metadata: dto.metadata as Prisma.InputJsonValue,
        },
      });

      // Create audit log
      await tx.dsrRequestLog.create({
        data: {
          dsrRequestId: request.id,
          action: 'SUBMITTED',
          performedBy: dto.accountId,
          details: {
            requestType: dto.requestType,
            legalBasis: dto.legalBasis,
          } as Prisma.InputJsonValue,
          ipAddress: dto.ipAddress,
        },
      });

      return request;
    });

    this.logger.log(
      `DSR request submitted: id=${result.id}, type=${dto.requestType}, accountId=${dto.accountId}`,
    );

    return result as unknown as DsrRequestResponseDto;
  }

  /**
   * Get DSR request by ID
   */
  async findById(id: string): Promise<DsrRequestResponseDto> {
    const request = await this.prisma.dsrRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException(`DSR request not found: ${id}`);
    }

    return request as unknown as DsrRequestResponseDto;
  }

  /**
   * Verify a DSR request
   */
  async verify(
    id: string,
    dto: VerifyDsrRequestDto,
    operatorId: string,
  ): Promise<DsrRequestResponseDto> {
    const request = await this.findById(id);

    if (request.status !== DsrStatus.PENDING) {
      throw new BadRequestException(`Cannot verify request with status: ${request.status}`);
    }

    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.dsrRequest.update({
        where: { id },
        data: {
          status: DsrStatus.VERIFIED,
          verifiedAt: now,
          verificationMethod: dto.verificationMethod,
        },
      });

      await tx.dsrRequestLog.create({
        data: {
          dsrRequestId: id,
          action: 'VERIFIED',
          performedBy: operatorId,
          details: {
            verificationMethod: dto.verificationMethod,
            ...dto.details,
          } as Prisma.InputJsonValue,
        },
      });

      return updated;
    });

    this.logger.log(`DSR request verified: id=${id}`);

    return result as unknown as DsrRequestResponseDto;
  }

  /**
   * Process a DSR request (start processing, complete, or reject)
   */
  async process(
    id: string,
    dto: ProcessDsrRequestDto,
    operatorId: string,
  ): Promise<DsrRequestResponseDto> {
    const request = await this.findById(id);

    // Validate state transitions
    const validTransitions: Record<DsrStatus, DsrStatus[]> = {
      [DsrStatus.PENDING]: [DsrStatus.VERIFIED, DsrStatus.REJECTED, DsrStatus.CANCELLED],
      [DsrStatus.VERIFIED]: [DsrStatus.IN_PROGRESS, DsrStatus.REJECTED],
      [DsrStatus.IN_PROGRESS]: [DsrStatus.AWAITING_INFO, DsrStatus.COMPLETED, DsrStatus.REJECTED],
      [DsrStatus.AWAITING_INFO]: [DsrStatus.IN_PROGRESS, DsrStatus.CANCELLED],
      [DsrStatus.COMPLETED]: [],
      [DsrStatus.REJECTED]: [],
      [DsrStatus.CANCELLED]: [],
    };

    if (!validTransitions[request.status]?.includes(dto.status)) {
      throw new BadRequestException(
        `Invalid status transition: ${request.status} -> ${dto.status}`,
      );
    }

    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const updateData: Prisma.DsrRequestUpdateInput = {
        status: dto.status,
      };

      if (dto.status === DsrStatus.IN_PROGRESS && !request.processedAt) {
        updateData.processedAt = now;
        updateData.processedBy = dto.processedBy || operatorId;
      }

      if (dto.status === DsrStatus.COMPLETED) {
        updateData.completedAt = now;
        updateData.responseType = dto.responseType;
        updateData.responseData = dto.responseData as Prisma.InputJsonValue;
        updateData.responseNote = dto.responseNote;
      }

      if (dto.status === DsrStatus.REJECTED) {
        updateData.responseNote = dto.responseNote;
        updateData.responseType = DsrResponseType.DENIED;
      }

      const updated = await tx.dsrRequest.update({
        where: { id },
        data: updateData,
      });

      await tx.dsrRequestLog.create({
        data: {
          dsrRequestId: id,
          action: dto.status,
          performedBy: operatorId,
          details: {
            previousStatus: request.status,
            responseType: dto.responseType,
            responseNote: dto.responseNote,
          } as Prisma.InputJsonValue,
        },
      });

      return updated;
    });

    this.logger.log(`DSR request processed: id=${id}, status=${dto.status}`);

    return result as unknown as DsrRequestResponseDto;
  }

  /**
   * Cancel a DSR request
   */
  async cancel(id: string, reason: string, operatorId: string): Promise<void> {
    const request = await this.findById(id);

    if (request.status === DsrStatus.COMPLETED || request.status === DsrStatus.CANCELLED) {
      throw new BadRequestException(`Cannot cancel request with status: ${request.status}`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.dsrRequest.update({
        where: { id },
        data: {
          status: DsrStatus.CANCELLED,
          responseNote: reason,
        },
      });

      await tx.dsrRequestLog.create({
        data: {
          dsrRequestId: id,
          action: 'CANCELLED',
          performedBy: operatorId,
          details: { reason } as Prisma.InputJsonValue,
        },
      });
    });

    this.logger.log(`DSR request cancelled: id=${id}`);
  }

  /**
   * Extend deadline for a DSR request
   */
  async extendDeadline(
    id: string,
    dto: ExtendDsrDeadlineDto,
    operatorId: string,
  ): Promise<DsrRequestResponseDto> {
    const request = await this.findById(id);

    if (
      request.status === DsrStatus.COMPLETED ||
      request.status === DsrStatus.CANCELLED ||
      request.status === DsrStatus.REJECTED
    ) {
      throw new BadRequestException(
        `Cannot extend deadline for request with status: ${request.status}`,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.dsrRequest.update({
        where: { id },
        data: {
          extendedTo: dto.extendedTo,
          extensionReason: dto.extensionReason,
          responseType: DsrResponseType.EXTENDED,
        },
      });

      await tx.dsrRequestLog.create({
        data: {
          dsrRequestId: id,
          action: 'DEADLINE_EXTENDED',
          performedBy: operatorId,
          details: {
            extendedTo: dto.extendedTo,
            extensionReason: dto.extensionReason,
          } as Prisma.InputJsonValue,
        },
      });

      return updated;
    });

    this.logger.log(`DSR request deadline extended: id=${id}`);

    return result as unknown as DsrRequestResponseDto;
  }

  /**
   * Assign request to operator
   */
  async assign(id: string, assignedTo: string, operatorId: string): Promise<DsrRequestResponseDto> {
    const request = await this.findById(id);

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.dsrRequest.update({
        where: { id },
        data: { assignedTo },
      });

      await tx.dsrRequestLog.create({
        data: {
          dsrRequestId: id,
          action: 'ASSIGNED',
          performedBy: operatorId,
          details: {
            assignedTo,
            previousAssignee: request.assignedTo,
          } as Prisma.InputJsonValue,
        },
      });

      return updated;
    });

    this.logger.log(`DSR request assigned: id=${id}, assignedTo=${assignedTo}`);

    return result as unknown as DsrRequestResponseDto;
  }

  /**
   * List DSR requests with pagination and filters
   */
  async findAll(query: DsrRequestQueryDto): Promise<DsrRequestListResponseDto> {
    const now = new Date();

    const where: Prisma.DsrRequestWhereInput = {};

    if (query.accountId) {
      where.accountId = query.accountId;
    }
    if (query.requestType) {
      where.requestType = query.requestType;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.priority) {
      where.priority = query.priority;
    }
    if (query.assignedTo) {
      where.assignedTo = query.assignedTo;
    }
    if (query.overdueOnly) {
      where.status = { in: [DsrStatus.PENDING, DsrStatus.VERIFIED, DsrStatus.IN_PROGRESS] };
      where.OR = [
        {
          extendedTo: null,
          deadline: { lt: now },
        },
        {
          extendedTo: { lt: now },
        },
      ];
    }

    // Use PaginationDto methods for standardized pagination
    const orderBy = query.getDsrOrderBy();

    const [requests, total] = await Promise.all([
      this.prisma.dsrRequest.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy,
      }),
      this.prisma.dsrRequest.count({ where }),
    ]);

    const data = requests.map((r) => {
      const effectiveDeadline = r.extendedTo || r.deadline;
      return {
        id: r.id,
        accountId: r.accountId,
        requestType: r.requestType,
        status: r.status,
        priority: r.priority,
        deadline: r.deadline,
        extendedTo: r.extendedTo,
        isOverdue:
          effectiveDeadline < now &&
          !([DsrStatus.COMPLETED, DsrStatus.CANCELLED, DsrStatus.REJECTED] as DsrStatus[]).includes(
            r.status,
          ),
        createdAt: r.createdAt,
      };
    });

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 0 },
    };
  }

  /**
   * Get DSR requests for an account
   */
  async findByAccount(accountId: string): Promise<DsrRequestSummaryDto[]> {
    const now = new Date();
    const requests = await this.prisma.dsrRequest.findMany({
      where: { accountId },
      orderBy: { createdAt: 'desc' },
    });

    return requests.map((r) => {
      const effectiveDeadline = r.extendedTo || r.deadline;
      return {
        id: r.id,
        accountId: r.accountId,
        requestType: r.requestType,
        status: r.status,
        priority: r.priority,
        deadline: r.deadline,
        extendedTo: r.extendedTo,
        isOverdue:
          effectiveDeadline < now &&
          !([DsrStatus.COMPLETED, DsrStatus.CANCELLED, DsrStatus.REJECTED] as DsrStatus[]).includes(
            r.status,
          ),
        createdAt: r.createdAt,
      };
    });
  }

  /**
   * Get audit logs for a DSR request
   */
  async getLogs(id: string): Promise<DsrRequestLogDto[]> {
    const logs = await this.prisma.dsrRequestLog.findMany({
      where: { dsrRequestId: id },
      orderBy: { createdAt: 'desc' },
    });

    return logs as DsrRequestLogDto[];
  }

  /**
   * Get DSR statistics
   */
  async getStatistics(): Promise<DsrStatisticsDto> {
    const now = new Date();

    const [total, pending, inProgress, completed, overdueRequests, avgProcessingResult] =
      await Promise.all([
        this.prisma.dsrRequest.count(),
        this.prisma.dsrRequest.count({
          where: { status: DsrStatus.PENDING },
        }),
        this.prisma.dsrRequest.count({
          where: { status: DsrStatus.IN_PROGRESS },
        }),
        this.prisma.dsrRequest.count({
          where: { status: DsrStatus.COMPLETED },
        }),
        this.prisma.dsrRequest.count({
          where: {
            status: { in: [DsrStatus.PENDING, DsrStatus.VERIFIED, DsrStatus.IN_PROGRESS] },
            OR: [{ extendedTo: null, deadline: { lt: now } }, { extendedTo: { lt: now } }],
          },
        }),
        this.prisma.$queryRaw<{ avg: number }[]>`
        SELECT AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 86400) as avg
        FROM dsr_requests
        WHERE completed_at IS NOT NULL
      `,
      ]);

    return {
      total,
      pending,
      inProgress,
      completed,
      overdue: overdueRequests,
      avgProcessingDays: Math.round((avgProcessingResult[0]?.avg || 0) * 10) / 10,
    };
  }

  /**
   * Get overdue requests
   */
  async getOverdueRequests(): Promise<DsrRequestSummaryDto[]> {
    const now = new Date();

    const requests = await this.prisma.dsrRequest.findMany({
      where: {
        status: { in: [DsrStatus.PENDING, DsrStatus.VERIFIED, DsrStatus.IN_PROGRESS] },
        OR: [{ extendedTo: null, deadline: { lt: now } }, { extendedTo: { lt: now } }],
      },
      orderBy: { deadline: 'asc' },
    });

    return requests.map((r) => ({
      id: r.id,
      accountId: r.accountId,
      requestType: r.requestType,
      status: r.status,
      priority: r.priority,
      deadline: r.deadline,
      extendedTo: r.extendedTo,
      isOverdue: true,
      createdAt: r.createdAt,
    }));
  }

  /**
   * Get pending requests count
   */
  async getPendingCount(): Promise<number> {
    return this.prisma.dsrRequest.count({
      where: {
        status: { in: [DsrStatus.PENDING, DsrStatus.VERIFIED] },
      },
    });
  }
}

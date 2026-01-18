import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { delegation_status } from '../../../node_modules/.prisma/auth-client';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateDelegationDto,
  UpdateDelegationDto,
  ApproveDelegationDto,
  RevokeDelegationDto,
  DelegationQueryDto,
  DelegationResponseDto,
  DelegationLogResponseDto,
} from '../dto/delegation.dto';
import { Transactional } from '@my-girok/nest-common';

@Injectable()
export class DelegationService {
  constructor(private prisma: PrismaService) {}

  @Transactional()
  async create(dto: CreateDelegationDto): Promise<DelegationResponseDto> {
    // Validate delegator and delegate exist
    const [delegator, delegate] = await Promise.all([
      this.prisma.admins.findUnique({ where: { id: dto.delegatorId } }),
      this.prisma.admins.findUnique({ where: { id: dto.delegateId } }),
    ]);

    if (!delegator) {
      throw new NotFoundException(`Delegator ${dto.delegatorId} not found`);
    }

    if (!delegate) {
      throw new NotFoundException(`Delegate ${dto.delegateId} not found`);
    }

    if (dto.delegatorId === dto.delegateId) {
      throw new BadRequestException('Cannot delegate to yourself');
    }

    // Validate dates
    if (dto.endDate <= dto.startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    if (dto.startDate < new Date()) {
      throw new BadRequestException('Start date cannot be in the past');
    }

    // Check for overlapping active delegations
    const overlapping = await this.prisma.adminDelegation.findFirst({
      where: {
        delegatorId: dto.delegatorId,
        delegateId: dto.delegateId,
        status: delegation_status.ACTIVE,
        OR: [
          {
            AND: [{ startDate: { lte: dto.startDate } }, { endDate: { gte: dto.startDate } }],
          },
          {
            AND: [{ startDate: { lte: dto.endDate } }, { endDate: { gte: dto.endDate } }],
          },
        ],
      },
    });

    if (overlapping) {
      throw new ConflictException(`Overlapping delegation already exists for this period`);
    }

    const delegation = await this.prisma.adminDelegation.create({
      data: {
        delegatorId: dto.delegatorId,
        delegateId: dto.delegateId,
        delegationType: dto.delegationType,
        delegationScope: dto.delegationScope,
        delegationReason: dto.delegationReason,
        specificPermissions: dto.specificPermissions,
        specificRoleIds: dto.specificRoleIds || [],
        resourceIds: dto.resourceIds || [],
        startDate: dto.startDate,
        endDate: dto.endDate,
        requiresApproval: dto.requiresApproval ?? true,
        maxActions: dto.maxActions,
        allowedHours: dto.allowedHours || [],
        allowedIps: dto.allowedIps || [],
        notifyOnUse: dto.notifyOnUse ?? true,
        notifyOnExpiry: dto.notifyOnExpiry ?? true,
        expiryReminderDays: dto.expiryReminderDays || [7, 1],
        notes: dto.notes,
        status: dto.requiresApproval ? delegation_status.PENDING : delegation_status.ACTIVE,
      },
    });

    return this.mapToResponse(delegation);
  }

  async findById(id: string): Promise<DelegationResponseDto> {
    const delegation = await this.prisma.adminDelegation.findUnique({
      where: { id },
    });

    if (!delegation) {
      throw new NotFoundException(`Delegation ${id} not found`);
    }

    return this.mapToResponse(delegation);
  }

  async findAll(
    query: DelegationQueryDto,
  ): Promise<{ data: DelegationResponseDto[]; total: number }> {
    const where: any = {};

    if (query.delegatorId) {
      where.delegatorId = query.delegatorId;
    }

    if (query.delegateId) {
      where.delegateId = query.delegateId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.delegationType) {
      where.delegationType = query.delegationType;
    }

    if (query.startDate || query.endDate) {
      where.AND = [];
      if (query.startDate) {
        where.AND.push({ startDate: { gte: query.startDate } });
      }
      if (query.endDate) {
        where.AND.push({ endDate: { lte: query.endDate } });
      }
    }

    const skip = (query.page - 1) * query.limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.adminDelegation.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.adminDelegation.count({ where }),
    ]);

    return {
      data: data.map((d) => this.mapToResponse(d)),
      total,
    };
  }

  @Transactional()
  async update(id: string, dto: UpdateDelegationDto): Promise<DelegationResponseDto> {
    const delegation = await this.prisma.adminDelegation.findUnique({
      where: { id },
    });

    if (!delegation) {
      throw new NotFoundException(`Delegation ${id} not found`);
    }

    if (
      delegation.status === delegation_status.REVOKED ||
      delegation.status === delegation_status.COMPLETED
    ) {
      throw new BadRequestException(`Cannot update delegation with status ${delegation.status}`);
    }

    const updateData: any = {};

    if (dto.endDate) {
      if (dto.endDate <= delegation.startDate) {
        throw new BadRequestException('End date must be after start date');
      }
      updateData.endDate = dto.endDate;
    }

    if (dto.specificPermissions) {
      updateData.specificPermissions = dto.specificPermissions;
    }

    if (dto.maxActions !== undefined) {
      updateData.maxActions = dto.maxActions;
    }

    if (dto.allowedHours) {
      updateData.allowedHours = dto.allowedHours;
    }

    if (dto.allowedIps) {
      updateData.allowedIps = dto.allowedIps;
    }

    if (dto.notes) {
      updateData.notes = delegation.notes ? `${delegation.notes}\n${dto.notes}` : dto.notes;
    }

    const updated = await this.prisma.adminDelegation.update({
      where: { id },
      data: updateData,
    });

    return this.mapToResponse(updated);
  }

  @Transactional()
  async approve(
    id: string,
    approverId: string,
    dto: ApproveDelegationDto,
  ): Promise<DelegationResponseDto> {
    const delegation = await this.prisma.adminDelegation.findUnique({
      where: { id },
    });

    if (!delegation) {
      throw new NotFoundException(`Delegation ${id} not found`);
    }

    if (delegation.status !== delegation_status.PENDING) {
      throw new BadRequestException(
        `Delegation is not pending approval (current status: ${delegation.status})`,
      );
    }

    if (!delegation.requiresApproval) {
      throw new BadRequestException('This delegation does not require approval');
    }

    const updateData: any = {
      approvedBy: approverId,
      approvedAt: new Date(),
    };

    if (dto.approved) {
      updateData.status = delegation_status.ACTIVE;
    } else {
      updateData.status = delegation_status.REVOKED;
      updateData.rejectionReason = dto.rejectionReason;
    }

    const updated = await this.prisma.adminDelegation.update({
      where: { id },
      data: updateData,
    });

    return this.mapToResponse(updated);
  }

  @Transactional()
  async revoke(
    id: string,
    revokerId: string,
    dto: RevokeDelegationDto,
  ): Promise<DelegationResponseDto> {
    const delegation = await this.prisma.adminDelegation.findUnique({
      where: { id },
    });

    if (!delegation) {
      throw new NotFoundException(`Delegation ${id} not found`);
    }

    if (delegation.status === delegation_status.REVOKED) {
      throw new BadRequestException('Delegation is already revoked');
    }

    if (delegation.status === delegation_status.COMPLETED) {
      throw new BadRequestException('Cannot revoke completed delegation');
    }

    const updated = await this.prisma.adminDelegation.update({
      where: { id },
      data: {
        status: delegation_status.REVOKED,
        revokedAt: new Date(),
        revokedBy: revokerId,
        revocationReason: dto.revocationReason,
      },
    });

    return this.mapToResponse(updated);
  }

  @Transactional()
  async delete(id: string, adminId: string): Promise<void> {
    const delegation = await this.prisma.adminDelegation.findUnique({
      where: { id },
    });

    if (!delegation) {
      throw new NotFoundException(`Delegation ${id} not found`);
    }

    if (delegation.delegatorId !== adminId) {
      throw new ForbiddenException('Only the delegator can delete this delegation');
    }

    if (delegation.status === delegation_status.ACTIVE) {
      throw new BadRequestException('Cannot delete active delegation. Revoke it first.');
    }

    await this.prisma.adminDelegation.delete({ where: { id } });
  }

  async getLogs(
    delegationId: string,
  ): Promise<{ data: DelegationLogResponseDto[]; total: number }> {
    const delegation = await this.prisma.adminDelegation.findUnique({
      where: { id: delegationId },
    });

    if (!delegation) {
      throw new NotFoundException(`Delegation ${delegationId} not found`);
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.adminDelegationLog.findMany({
        where: { delegationId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.adminDelegationLog.count({ where: { delegationId } }),
    ]);

    return {
      data: data.map((log) => this.mapLogToResponse(log)),
      total,
    };
  }

  @Transactional()
  async createLog(
    delegationId: string,
    delegateId: string,
    action: string,
    resourceType?: string,
    resourceId?: string,
    ipAddress?: string,
    userAgent?: string,
    success: boolean = true,
    errorMessage?: string,
  ): Promise<DelegationLogResponseDto> {
    const log = await this.prisma.adminDelegationLog.create({
      data: {
        delegationId,
        delegateId,
        action,
        resourceType,
        resourceId,
        ipAddress,
        userAgent,
        success,
        errorMessage,
      },
    });

    return this.mapLogToResponse(log);
  }

  async updateExpiredDelegations(): Promise<number> {
    const result = await this.prisma.adminDelegation.updateMany({
      where: {
        status: delegation_status.ACTIVE,
        endDate: { lt: new Date() },
      },
      data: {
        status: delegation_status.EXPIRED,
      },
    });

    return result.count;
  }

  private mapToResponse(delegation: any): DelegationResponseDto {
    return {
      id: delegation.id,
      delegatorId: delegation.delegatorId,
      delegateId: delegation.delegateId,
      delegationType: delegation.delegationType,
      delegationScope: delegation.delegationScope,
      delegationReason: delegation.delegationReason,
      specificPermissions: delegation.specificPermissions,
      specificRoleIds: delegation.specificRoleIds,
      resourceIds: delegation.resourceIds,
      startDate: delegation.startDate,
      endDate: delegation.endDate,
      status: delegation.status,
      requiresApproval: delegation.requiresApproval,
      approvedBy: delegation.approvedBy,
      approvedAt: delegation.approvedAt,
      rejectionReason: delegation.rejectionReason,
      maxActions: delegation.maxActions,
      allowedHours: delegation.allowedHours,
      allowedIps: delegation.allowedIps,
      notifyOnUse: delegation.notifyOnUse,
      notifyOnExpiry: delegation.notifyOnExpiry,
      expiryReminderDays: delegation.expiryReminderDays,
      revokedAt: delegation.revokedAt,
      revokedBy: delegation.revokedBy,
      revocationReason: delegation.revocationReason,
      notes: delegation.notes,
      createdAt: delegation.createdAt,
      updatedAt: delegation.updatedAt,
    };
  }

  private mapLogToResponse(log: any): DelegationLogResponseDto {
    return {
      id: log.id,
      delegationId: log.delegationId,
      delegateId: log.delegateId,
      action: log.action,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      success: log.success,
      errorMessage: log.errorMessage,
      createdAt: log.createdAt,
    };
  }
}

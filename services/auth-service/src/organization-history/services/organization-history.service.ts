import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateOrganizationHistoryDto,
  ApproveOrganizationHistoryDto,
  OrganizationHistoryQueryDto,
  OrganizationHistoryResponseDto,
} from '../dto/organization-history.dto';
import { Transactional } from '@my-girok/nest-common';

@Injectable()
export class OrganizationHistoryService {
  constructor(private prisma: PrismaService) {}

  @Transactional()
  async create(dto: CreateOrganizationHistoryDto): Promise<OrganizationHistoryResponseDto> {
    const admin = await this.prisma.admins.findUnique({
      where: { id: dto.adminId },
    });

    if (!admin) {
      throw new NotFoundException(`Admin ${dto.adminId} not found`);
    }

    if (dto.requestedBy) {
      const requester = await this.prisma.admins.findUnique({
        where: { id: dto.requestedBy },
      });

      if (!requester) {
        throw new NotFoundException(`Requester admin ${dto.requestedBy} not found`);
      }
    }

    if (dto.newManagerId) {
      const manager = await this.prisma.admins.findUnique({
        where: { id: dto.newManagerId },
      });

      if (!manager) {
        throw new NotFoundException(`Manager ${dto.newManagerId} not found`);
      }
    }

    const history = await this.prisma.adminOrganizationHistory.create({
      data: {
        adminId: dto.adminId,
        changeType: dto.changeType,
        previousJobGradeId: dto.previousJobGradeId,
        previousJobTitle: dto.previousJobTitle,
        previousOrgUnitId: dto.previousOrgUnitId,
        previousManagerId: dto.previousManagerId,
        previousLegalEntityId: dto.previousLegalEntityId,
        previousOfficeId: dto.previousOfficeId,
        previousCostCenter: dto.previousCostCenter,
        newJobGradeId: dto.newJobGradeId,
        newJobTitle: dto.newJobTitle,
        newOrgUnitId: dto.newOrgUnitId,
        newManagerId: dto.newManagerId,
        newLegalEntityId: dto.newLegalEntityId,
        newOfficeId: dto.newOfficeId,
        newCostCenter: dto.newCostCenter,
        effectiveDate: dto.effectiveDate,
        reason: dto.reason,
        notes: dto.notes,
        requestedBy: dto.requestedBy,
      },
    });

    return this.mapToResponse(history);
  }

  async findById(id: string): Promise<OrganizationHistoryResponseDto> {
    const history = await this.prisma.adminOrganizationHistory.findUnique({
      where: { id },
    });

    if (!history) {
      throw new NotFoundException(`Organization history ${id} not found`);
    }

    return this.mapToResponse(history);
  }

  async findAll(
    query: OrganizationHistoryQueryDto,
  ): Promise<{ data: OrganizationHistoryResponseDto[]; total: number }> {
    const where: any = {};

    if (query.adminId) {
      where.adminId = query.adminId;
    }

    if (query.changeType) {
      where.changeType = query.changeType;
    }

    if (query.effectiveDateFrom || query.effectiveDateTo) {
      where.effectiveDate = {};
      if (query.effectiveDateFrom) {
        where.effectiveDate.gte = query.effectiveDateFrom;
      }
      if (query.effectiveDateTo) {
        where.effectiveDate.lte = query.effectiveDateTo;
      }
    }

    const skip = (query.page - 1) * query.limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.adminOrganizationHistory.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { effectiveDate: 'desc' },
      }),
      this.prisma.adminOrganizationHistory.count({ where }),
    ]);

    return {
      data: data.map((h) => this.mapToResponse(h)),
      total,
    };
  }

  @Transactional()
  async approve(
    id: string,
    dto: ApproveOrganizationHistoryDto,
  ): Promise<OrganizationHistoryResponseDto> {
    const history = await this.prisma.adminOrganizationHistory.findUnique({
      where: { id },
    });

    if (!history) {
      throw new NotFoundException(`Organization history ${id} not found`);
    }

    if (history.approvedBy) {
      throw new BadRequestException('Organization history already approved');
    }

    const approver = await this.prisma.admins.findUnique({
      where: { id: dto.approvedBy },
    });

    if (!approver) {
      throw new NotFoundException(`Approver admin ${dto.approvedBy} not found`);
    }

    const updated = await this.prisma.adminOrganizationHistory.update({
      where: { id },
      data: {
        approvedBy: dto.approvedBy,
        approvedAt: new Date(),
      },
    });

    return this.mapToResponse(updated);
  }

  @Transactional()
  async delete(id: string): Promise<void> {
    const history = await this.prisma.adminOrganizationHistory.findUnique({
      where: { id },
    });

    if (!history) {
      throw new NotFoundException(`Organization history ${id} not found`);
    }

    if (history.approvedBy) {
      throw new BadRequestException('Cannot delete approved organization history');
    }

    await this.prisma.adminOrganizationHistory.delete({ where: { id } });
  }

  async getAdminHistory(adminId: string): Promise<OrganizationHistoryResponseDto[]> {
    const admin = await this.prisma.admins.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      throw new NotFoundException(`Admin ${adminId} not found`);
    }

    const history = await this.prisma.adminOrganizationHistory.findMany({
      where: { adminId },
      orderBy: { effectiveDate: 'desc' },
    });

    return history.map((h) => this.mapToResponse(h));
  }

  private mapToResponse(history: any): OrganizationHistoryResponseDto {
    return {
      id: history.id,
      adminId: history.adminId,
      changeType: history.changeType,
      previousJobGradeId: history.previousJobGradeId,
      previousJobTitle: history.previousJobTitle,
      previousOrgUnitId: history.previousOrgUnitId,
      previousManagerId: history.previousManagerId,
      previousLegalEntityId: history.previousLegalEntityId,
      previousOfficeId: history.previousOfficeId,
      previousCostCenter: history.previousCostCenter,
      newJobGradeId: history.newJobGradeId,
      newJobTitle: history.newJobTitle,
      newOrgUnitId: history.newOrgUnitId,
      newManagerId: history.newManagerId,
      newLegalEntityId: history.newLegalEntityId,
      newOfficeId: history.newOfficeId,
      newCostCenter: history.newCostCenter,
      effectiveDate: history.effectiveDate,
      reason: history.reason,
      notes: history.notes,
      requestedBy: history.requestedBy,
      approvedBy: history.approvedBy,
      approvedAt: history.approvedAt,
      createdAt: history.createdAt,
    };
  }
}

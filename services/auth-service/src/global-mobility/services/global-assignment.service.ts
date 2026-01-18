import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateGlobalAssignmentDto,
  UpdateGlobalAssignmentDto,
  ApproveGlobalAssignmentDto,
  GlobalAssignmentQueryDto,
  GlobalAssignmentResponseDto,
} from '../dto/global-assignment.dto';
import { Transactional } from '@my-girok/nest-common';

@Injectable()
export class GlobalAssignmentService {
  constructor(private prisma: PrismaService) {}

  @Transactional()
  async create(dto: CreateGlobalAssignmentDto): Promise<GlobalAssignmentResponseDto> {
    const admin = await this.prisma.admins.findUnique({
      where: { id: dto.adminId },
    });

    if (!admin) {
      throw new NotFoundException(`Admin ${dto.adminId} not found`);
    }

    if (dto.expectedEndDate <= dto.startDate) {
      throw new BadRequestException('Expected end date must be after start date');
    }

    const assignment = await this.prisma.globalAssignment.create({
      data: {
        adminId: dto.adminId,
        assignmentType: dto.assignmentType,
        homeCountryCode: dto.homeCountryCode,
        homeLegalEntityId: dto.homeLegalEntityId,
        homeOfficeId: dto.homeOfficeId,
        hostCountryCode: dto.hostCountryCode,
        hostLegalEntityId: dto.hostLegalEntityId,
        hostOfficeId: dto.hostOfficeId,
        startDate: dto.startDate,
        expectedEndDate: dto.expectedEndDate,
        status: 'PLANNED',
        businessReason: dto.businessReason,
        projectName: dto.projectName,
        homeSalary: dto.homeSalary,
        homeCurrency: dto.homeCurrency,
        hostAllowance: dto.hostAllowance,
        hostCurrency: dto.hostCurrency,
        costOfLivingAdjustment: dto.costOfLivingAdjustment,
        hardshipAllowance: dto.hardshipAllowance,
        taxEqualization: dto.taxEqualization || false,
        taxProvider: dto.taxProvider,
        relocationSupport: dto.relocationSupport || false,
        housingProvided: dto.housingProvided || false,
        schoolingSupport: dto.schoolingSupport || false,
        spouseWorkSupport: dto.spouseWorkSupport || false,
        notes: dto.notes,
      },
    });

    return this.mapToResponse(assignment);
  }

  async findById(id: string): Promise<GlobalAssignmentResponseDto> {
    const assignment = await this.prisma.globalAssignment.findUnique({
      where: { id },
    });

    if (!assignment) {
      throw new NotFoundException(`Global assignment ${id} not found`);
    }

    return this.mapToResponse(assignment);
  }

  async findAll(
    query: GlobalAssignmentQueryDto,
  ): Promise<{ data: GlobalAssignmentResponseDto[]; total: number }> {
    const where: any = {};

    if (query.adminId) {
      where.adminId = query.adminId;
    }

    if (query.assignmentType) {
      where.assignmentType = query.assignmentType;
    }

    if (query.homeCountryCode) {
      where.homeCountryCode = query.homeCountryCode;
    }

    if (query.hostCountryCode) {
      where.hostCountryCode = query.hostCountryCode;
    }

    if (query.status) {
      where.status = query.status;
    }

    const skip = (query.page - 1) * query.limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.globalAssignment.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.globalAssignment.count({ where }),
    ]);

    return {
      data: data.map((a) => this.mapToResponse(a)),
      total,
    };
  }

  @Transactional()
  async update(id: string, dto: UpdateGlobalAssignmentDto): Promise<GlobalAssignmentResponseDto> {
    const assignment = await this.prisma.globalAssignment.findUnique({
      where: { id },
    });

    if (!assignment) {
      throw new NotFoundException(`Global assignment ${id} not found`);
    }

    if (assignment.status === 'COMPLETED') {
      throw new BadRequestException('Cannot update completed assignment');
    }

    const updated = await this.prisma.globalAssignment.update({
      where: { id },
      data: {
        expectedEndDate: dto.expectedEndDate,
        actualEndDate: dto.actualEndDate,
        status: dto.status,
        businessReason: dto.businessReason,
        projectName: dto.projectName,
        hostAllowance: dto.hostAllowance,
        notes: dto.notes,
      },
    });

    return this.mapToResponse(updated);
  }

  @Transactional()
  async approve(id: string, dto: ApproveGlobalAssignmentDto): Promise<GlobalAssignmentResponseDto> {
    const assignment = await this.prisma.globalAssignment.findUnique({
      where: { id },
    });

    if (!assignment) {
      throw new NotFoundException(`Global assignment ${id} not found`);
    }

    if (assignment.status !== 'PLANNED') {
      throw new BadRequestException(
        `Assignment is not in PLANNED status (current status: ${assignment.status})`,
      );
    }

    const approver = await this.prisma.admins.findUnique({
      where: { id: dto.approvedBy },
    });

    if (!approver) {
      throw new NotFoundException(`Approver admin ${dto.approvedBy} not found`);
    }

    const updated = await this.prisma.globalAssignment.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy: dto.approvedBy,
        approvedAt: new Date(),
      },
    });

    return this.mapToResponse(updated);
  }

  @Transactional()
  async delete(id: string): Promise<void> {
    const assignment = await this.prisma.globalAssignment.findUnique({
      where: { id },
    });

    if (!assignment) {
      throw new NotFoundException(`Global assignment ${id} not found`);
    }

    if (assignment.status === 'ACTIVE') {
      throw new BadRequestException(
        'Cannot delete active assignment. Complete or cancel it first.',
      );
    }

    await this.prisma.globalAssignment.delete({ where: { id } });
  }

  private mapToResponse(assignment: any): GlobalAssignmentResponseDto {
    return {
      id: assignment.id,
      adminId: assignment.adminId,
      assignmentType: assignment.assignmentType,
      homeCountryCode: assignment.homeCountryCode,
      homeLegalEntityId: assignment.homeLegalEntityId,
      homeOfficeId: assignment.homeOfficeId,
      hostCountryCode: assignment.hostCountryCode,
      hostLegalEntityId: assignment.hostLegalEntityId,
      hostOfficeId: assignment.hostOfficeId,
      startDate: assignment.startDate,
      expectedEndDate: assignment.expectedEndDate,
      actualEndDate: assignment.actualEndDate,
      status: assignment.status,
      businessReason: assignment.businessReason,
      projectName: assignment.projectName,
      homeSalary: assignment.homeSalary ? Number(assignment.homeSalary) : undefined,
      homeCurrency: assignment.homeCurrency,
      hostAllowance: assignment.hostAllowance ? Number(assignment.hostAllowance) : undefined,
      hostCurrency: assignment.hostCurrency,
      costOfLivingAdjustment: assignment.costOfLivingAdjustment
        ? Number(assignment.costOfLivingAdjustment)
        : undefined,
      hardshipAllowance: assignment.hardshipAllowance
        ? Number(assignment.hardshipAllowance)
        : undefined,
      taxEqualization: assignment.taxEqualization,
      taxProvider: assignment.taxProvider,
      relocationSupport: assignment.relocationSupport,
      housingProvided: assignment.housingProvided,
      schoolingSupport: assignment.schoolingSupport,
      spouseWorkSupport: assignment.spouseWorkSupport,
      approvedBy: assignment.approvedBy,
      approvedAt: assignment.approvedAt,
      notes: assignment.notes,
      createdAt: assignment.createdAt,
      updatedAt: assignment.updatedAt,
    };
  }
}

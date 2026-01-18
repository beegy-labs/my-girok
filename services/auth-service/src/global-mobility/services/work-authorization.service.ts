import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { visa_status } from '../../../node_modules/.prisma/auth-client';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateWorkAuthorizationDto,
  UpdateWorkAuthorizationDto,
  WorkAuthorizationQueryDto,
  WorkAuthorizationResponseDto,
} from '../dto/work-authorization.dto';
import { Transactional } from '@my-girok/nest-common';

@Injectable()
export class WorkAuthorizationService {
  constructor(private prisma: PrismaService) {}

  @Transactional()
  async create(dto: CreateWorkAuthorizationDto): Promise<WorkAuthorizationResponseDto> {
    const admin = await this.prisma.admins.findUnique({
      where: { id: dto.adminId },
    });

    if (!admin) {
      throw new NotFoundException(`Admin ${dto.adminId} not found`);
    }

    if (dto.globalAssignmentId) {
      const assignment = await this.prisma.globalAssignment.findUnique({
        where: { id: dto.globalAssignmentId },
      });

      if (!assignment) {
        throw new NotFoundException(`Global assignment ${dto.globalAssignmentId} not found`);
      }
    }

    if (dto.expiryDate && dto.startDate && dto.expiryDate <= dto.startDate) {
      throw new BadRequestException('Expiry date must be after start date');
    }

    const workAuth = await this.prisma.workAuthorization.create({
      data: {
        adminId: dto.adminId,
        globalAssignmentId: dto.globalAssignmentId,
        countryCode: dto.countryCode,
        authorizationType: dto.authorizationType,
        visaType: dto.visaType,
        status: visa_status.PENDING,
        applicationDate: dto.applicationDate,
        approvalDate: dto.approvalDate,
        startDate: dto.startDate,
        expiryDate: dto.expiryDate,
        documentNumber: dto.documentNumber,
        documentUrl: dto.documentUrl,
        sponsorType: dto.sponsorType,
        sponsoringEntityId: dto.sponsoringEntityId,
        employerRestricted: dto.employerRestricted ?? true,
        locationRestricted: dto.locationRestricted ?? false,
        allowedActivities: dto.allowedActivities || [],
        renewable: dto.renewable ?? true,
        maxRenewals: dto.maxRenewals,
        renewalLeadDays: dto.renewalLeadDays || 90,
        notes: dto.notes,
      },
    });

    return this.mapToResponse(workAuth);
  }

  async findById(id: string): Promise<WorkAuthorizationResponseDto> {
    const workAuth = await this.prisma.workAuthorization.findUnique({
      where: { id },
    });

    if (!workAuth) {
      throw new NotFoundException(`Work authorization ${id} not found`);
    }

    return this.mapToResponse(workAuth);
  }

  async findAll(
    query: WorkAuthorizationQueryDto,
  ): Promise<{ data: WorkAuthorizationResponseDto[]; total: number }> {
    const where: any = {};

    if (query.adminId) {
      where.adminId = query.adminId;
    }

    if (query.countryCode) {
      where.countryCode = query.countryCode;
    }

    if (query.authorizationType) {
      where.authorizationType = query.authorizationType;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.expiringSoon) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 90);
      where.expiryDate = {
        gte: new Date(),
        lte: futureDate,
      };
      where.status = visa_status.ACTIVE;
    }

    const skip = (query.page - 1) * query.limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.workAuthorization.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.workAuthorization.count({ where }),
    ]);

    return {
      data: data.map((w) => this.mapToResponse(w)),
      total,
    };
  }

  @Transactional()
  async update(id: string, dto: UpdateWorkAuthorizationDto): Promise<WorkAuthorizationResponseDto> {
    const workAuth = await this.prisma.workAuthorization.findUnique({
      where: { id },
    });

    if (!workAuth) {
      throw new NotFoundException(`Work authorization ${id} not found`);
    }

    const updated = await this.prisma.workAuthorization.update({
      where: { id },
      data: {
        status: dto.status,
        approvalDate: dto.approvalDate,
        startDate: dto.startDate,
        expiryDate: dto.expiryDate,
        documentNumber: dto.documentNumber,
        documentUrl: dto.documentUrl,
        notes: dto.notes,
      },
    });

    return this.mapToResponse(updated);
  }

  @Transactional()
  async delete(id: string): Promise<void> {
    const workAuth = await this.prisma.workAuthorization.findUnique({
      where: { id },
    });

    if (!workAuth) {
      throw new NotFoundException(`Work authorization ${id} not found`);
    }

    if (workAuth.status === visa_status.ACTIVE) {
      throw new BadRequestException(
        'Cannot delete active work authorization. Revoke or expire it first.',
      );
    }

    await this.prisma.workAuthorization.delete({ where: { id } });
  }

  async updateExpiredAuthorizations(): Promise<number> {
    const result = await this.prisma.workAuthorization.updateMany({
      where: {
        status: visa_status.ACTIVE,
        expiryDate: { lt: new Date() },
      },
      data: {
        status: visa_status.EXPIRED,
      },
    });

    return result.count;
  }

  async markExpiringSoon(daysBeforeExpiry: number = 90): Promise<number> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysBeforeExpiry);

    const result = await this.prisma.workAuthorization.updateMany({
      where: {
        status: visa_status.ACTIVE,
        expiryDate: {
          gte: new Date(),
          lte: futureDate,
        },
        expiryReminderSent: false,
      },
      data: {
        status: visa_status.EXPIRING_SOON,
        expiryReminderSent: true,
      },
    });

    return result.count;
  }

  private mapToResponse(workAuth: any): WorkAuthorizationResponseDto {
    return {
      id: workAuth.id,
      adminId: workAuth.adminId,
      globalAssignmentId: workAuth.globalAssignmentId,
      countryCode: workAuth.countryCode,
      authorizationType: workAuth.authorizationType,
      visaType: workAuth.visaType,
      status: workAuth.status,
      applicationDate: workAuth.applicationDate,
      approvalDate: workAuth.approvalDate,
      startDate: workAuth.startDate,
      expiryDate: workAuth.expiryDate,
      documentNumber: workAuth.documentNumber,
      documentUrl: workAuth.documentUrl,
      sponsorType: workAuth.sponsorType,
      sponsoringEntityId: workAuth.sponsoringEntityId,
      employerRestricted: workAuth.employerRestricted,
      locationRestricted: workAuth.locationRestricted,
      allowedActivities: workAuth.allowedActivities,
      renewable: workAuth.renewable,
      maxRenewals: workAuth.maxRenewals,
      renewalLeadDays: workAuth.renewalLeadDays,
      expiryReminderSent: workAuth.expiryReminderSent,
      notes: workAuth.notes,
      createdAt: workAuth.createdAt,
      updatedAt: workAuth.updatedAt,
    };
  }
}

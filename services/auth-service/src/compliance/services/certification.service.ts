import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { certification_status } from '../../../node_modules/.prisma/auth-client';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateCertificationDto,
  UpdateCertificationDto,
  VerifyCertificationDto,
  CertificationQueryDto,
  CertificationResponseDto,
} from '../dto/certification.dto';
import { Transactional } from '@my-girok/nest-common';

@Injectable()
export class CertificationService {
  constructor(private prisma: PrismaService) {}

  @Transactional()
  async create(dto: CreateCertificationDto): Promise<CertificationResponseDto> {
    const admin = await this.prisma.admins.findUnique({
      where: { id: dto.adminId },
    });

    if (!admin) {
      throw new NotFoundException(`Admin ${dto.adminId} not found`);
    }

    if (dto.expiryDate && dto.expiryDate <= dto.issueDate) {
      throw new BadRequestException('Expiry date must be after issue date');
    }

    const certification = await this.prisma.adminCertification.create({
      data: {
        adminId: dto.adminId,
        name: dto.name,
        issuingOrganization: dto.issuingOrganization,
        credentialId: dto.credentialId,
        credentialUrl: dto.credentialUrl,
        issueDate: dto.issueDate,
        expiryDate: dto.expiryDate,
        status: certification_status.ACTIVE,
        metadata: dto.metadata ? JSON.parse(dto.metadata) : {},
      },
    });

    return this.mapToResponse(certification);
  }

  async findById(id: string): Promise<CertificationResponseDto> {
    const certification = await this.prisma.adminCertification.findUnique({
      where: { id },
    });

    if (!certification) {
      throw new NotFoundException(`Certification ${id} not found`);
    }

    return this.mapToResponse(certification);
  }

  async findAll(
    query: CertificationQueryDto,
  ): Promise<{ data: CertificationResponseDto[]; total: number }> {
    const where: any = {};

    if (query.adminId) {
      where.adminId = query.adminId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.issuingOrganization) {
      where.issuingOrganization = {
        contains: query.issuingOrganization,
        mode: 'insensitive',
      };
    }

    if (query.isVerified !== undefined) {
      where.isVerified = query.isVerified;
    }

    const skip = (query.page - 1) * query.limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.adminCertification.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.adminCertification.count({ where }),
    ]);

    return {
      data: data.map((c) => this.mapToResponse(c)),
      total,
    };
  }

  @Transactional()
  async update(id: string, dto: UpdateCertificationDto): Promise<CertificationResponseDto> {
    const certification = await this.prisma.adminCertification.findUnique({
      where: { id },
    });

    if (!certification) {
      throw new NotFoundException(`Certification ${id} not found`);
    }

    const updated = await this.prisma.adminCertification.update({
      where: { id },
      data: {
        name: dto.name,
        issuingOrganization: dto.issuingOrganization,
        credentialUrl: dto.credentialUrl,
        status: dto.status,
        expiryDate: dto.expiryDate,
      },
    });

    return this.mapToResponse(updated);
  }

  @Transactional()
  async verify(id: string, dto: VerifyCertificationDto): Promise<CertificationResponseDto> {
    const certification = await this.prisma.adminCertification.findUnique({
      where: { id },
    });

    if (!certification) {
      throw new NotFoundException(`Certification ${id} not found`);
    }

    if (certification.isVerified) {
      throw new BadRequestException('Certification already verified');
    }

    const verifier = await this.prisma.admins.findUnique({
      where: { id: dto.verifiedBy },
    });

    if (!verifier) {
      throw new NotFoundException(`Verifier admin ${dto.verifiedBy} not found`);
    }

    const updated = await this.prisma.adminCertification.update({
      where: { id },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
        verifiedBy: dto.verifiedBy,
        verificationUrl: dto.verificationUrl,
      },
    });

    return this.mapToResponse(updated);
  }

  @Transactional()
  async delete(id: string): Promise<void> {
    const certification = await this.prisma.adminCertification.findUnique({
      where: { id },
    });

    if (!certification) {
      throw new NotFoundException(`Certification ${id} not found`);
    }

    await this.prisma.adminCertification.delete({ where: { id } });
  }

  async updateExpiredCertifications(): Promise<number> {
    const result = await this.prisma.adminCertification.updateMany({
      where: {
        status: certification_status.ACTIVE,
        expiryDate: { lt: new Date() },
      },
      data: {
        status: certification_status.EXPIRED,
      },
    });

    return result.count;
  }

  async markPendingRenewal(daysBeforeExpiry: number = 30): Promise<number> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysBeforeExpiry);

    const result = await this.prisma.adminCertification.updateMany({
      where: {
        status: certification_status.ACTIVE,
        expiryDate: {
          gte: new Date(),
          lte: futureDate,
        },
      },
      data: {
        status: certification_status.PENDING_RENEWAL,
      },
    });

    return result.count;
  }

  private mapToResponse(certification: any): CertificationResponseDto {
    return {
      id: certification.id,
      adminId: certification.adminId,
      name: certification.name,
      issuingOrganization: certification.issuingOrganization,
      credentialId: certification.credentialId,
      credentialUrl: certification.credentialUrl,
      issueDate: certification.issueDate,
      expiryDate: certification.expiryDate,
      status: certification.status,
      isVerified: certification.isVerified,
      verifiedAt: certification.verifiedAt,
      verifiedBy: certification.verifiedBy,
      verificationUrl: certification.verificationUrl,
      metadata: certification.metadata,
      createdAt: certification.createdAt,
      updatedAt: certification.updatedAt,
    };
  }
}

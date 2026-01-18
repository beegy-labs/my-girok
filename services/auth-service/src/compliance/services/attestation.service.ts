import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { attestation_status } from '@prisma/auth-client';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateAttestationDto,
  UpdateAttestationDto,
  CompleteAttestationDto,
  WaiveAttestationDto,
  AttestationQueryDto,
  AttestationResponseDto,
} from '../dto/attestation.dto';
import { Transactional } from '@my-girok/nest-common';

@Injectable()
export class AttestationService {
  constructor(private prisma: PrismaService) {}

  @Transactional()
  async create(dto: CreateAttestationDto): Promise<AttestationResponseDto> {
    const admin = await this.prisma.admins.findUnique({
      where: { id: dto.adminId },
    });

    if (!admin) {
      throw new NotFoundException(`Admin ${dto.adminId} not found`);
    }

    const attestation = await this.prisma.adminAttestation.create({
      data: {
        adminId: dto.adminId,
        attestationType: dto.attestationType,
        documentVersion: dto.documentVersion,
        documentUrl: dto.documentUrl,
        documentHash: dto.documentHash,
        status: attestation_status.PENDING,
        dueDate: dto.dueDate,
        recurrenceMonths: dto.recurrenceMonths || 12,
        metadata: dto.metadata || {},
      },
    });

    return this.mapToResponse(attestation);
  }

  async findById(id: string): Promise<AttestationResponseDto> {
    const attestation = await this.prisma.adminAttestation.findUnique({
      where: { id },
    });

    if (!attestation) {
      throw new NotFoundException(`Attestation ${id} not found`);
    }

    return this.mapToResponse(attestation);
  }

  async findAll(
    query: AttestationQueryDto,
  ): Promise<{ data: AttestationResponseDto[]; total: number }> {
    const where: any = {};

    if (query.adminId) {
      where.adminId = query.adminId;
    }

    if (query.attestationType) {
      where.attestationType = query.attestationType;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.isWaived !== undefined) {
      where.isWaived = query.isWaived;
    }

    const skip = (query.page - 1) * query.limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.adminAttestation.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.adminAttestation.count({ where }),
    ]);

    return {
      data: data.map((a) => this.mapToResponse(a)),
      total,
    };
  }

  @Transactional()
  async update(id: string, dto: UpdateAttestationDto): Promise<AttestationResponseDto> {
    const attestation = await this.prisma.adminAttestation.findUnique({
      where: { id },
    });

    if (!attestation) {
      throw new NotFoundException(`Attestation ${id} not found`);
    }

    if (attestation.status === attestation_status.COMPLETED) {
      throw new BadRequestException('Cannot update completed attestation');
    }

    const updated = await this.prisma.adminAttestation.update({
      where: { id },
      data: {
        status: dto.status,
        dueDate: dto.dueDate,
        documentUrl: dto.documentUrl,
        documentHash: dto.documentHash,
      },
    });

    return this.mapToResponse(updated);
  }

  @Transactional()
  async complete(id: string, dto: CompleteAttestationDto): Promise<AttestationResponseDto> {
    const attestation = await this.prisma.adminAttestation.findUnique({
      where: { id },
    });

    if (!attestation) {
      throw new NotFoundException(`Attestation ${id} not found`);
    }

    if (attestation.status === attestation_status.COMPLETED) {
      throw new BadRequestException('Attestation already completed');
    }

    if (attestation.isWaived) {
      throw new BadRequestException('Cannot complete waived attestation');
    }

    const completedAt = new Date();
    const nextDueDate = attestation.recurrenceMonths
      ? new Date(completedAt.getTime() + attestation.recurrenceMonths * 30 * 24 * 60 * 60 * 1000)
      : null;

    const updated = await this.prisma.adminAttestation.update({
      where: { id },
      data: {
        status: attestation_status.COMPLETED,
        completedAt,
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
        signatureData: dto.signatureData,
        nextDueDate,
      },
    });

    return this.mapToResponse(updated);
  }

  @Transactional()
  async waive(id: string, dto: WaiveAttestationDto): Promise<AttestationResponseDto> {
    const attestation = await this.prisma.adminAttestation.findUnique({
      where: { id },
    });

    if (!attestation) {
      throw new NotFoundException(`Attestation ${id} not found`);
    }

    if (attestation.status === attestation_status.COMPLETED) {
      throw new BadRequestException('Cannot waive completed attestation');
    }

    const waiver = await this.prisma.admins.findUnique({
      where: { id: dto.waivedBy },
    });

    if (!waiver) {
      throw new NotFoundException(`Waiver admin ${dto.waivedBy} not found`);
    }

    const updated = await this.prisma.adminAttestation.update({
      where: { id },
      data: {
        status: attestation_status.WAIVED,
        isWaived: true,
        waivedBy: dto.waivedBy,
        waiverReason: dto.waiverReason,
        waiverExpiry: dto.waiverExpiry,
      },
    });

    return this.mapToResponse(updated);
  }

  @Transactional()
  async delete(id: string): Promise<void> {
    const attestation = await this.prisma.adminAttestation.findUnique({
      where: { id },
    });

    if (!attestation) {
      throw new NotFoundException(`Attestation ${id} not found`);
    }

    if (attestation.status === attestation_status.COMPLETED) {
      throw new BadRequestException('Cannot delete completed attestation');
    }

    await this.prisma.adminAttestation.delete({ where: { id } });
  }

  async updateExpiredAttestations(): Promise<number> {
    const result = await this.prisma.adminAttestation.updateMany({
      where: {
        status: attestation_status.PENDING,
        dueDate: { lt: new Date() },
      },
      data: {
        status: attestation_status.EXPIRED,
      },
    });

    return result.count;
  }

  private mapToResponse(attestation: any): AttestationResponseDto {
    return {
      id: attestation.id,
      adminId: attestation.adminId,
      attestationType: attestation.attestationType,
      documentVersion: attestation.documentVersion,
      documentUrl: attestation.documentUrl,
      documentHash: attestation.documentHash,
      status: attestation.status,
      dueDate: attestation.dueDate,
      completedAt: attestation.completedAt,
      ipAddress: attestation.ipAddress,
      userAgent: attestation.userAgent,
      signatureData: attestation.signatureData,
      isWaived: attestation.isWaived,
      waivedBy: attestation.waivedBy,
      waiverReason: attestation.waiverReason,
      waiverExpiry: attestation.waiverExpiry,
      recurrenceMonths: attestation.recurrenceMonths,
      nextDueDate: attestation.nextDueDate,
      metadata: attestation.metadata,
      createdAt: attestation.createdAt,
      updatedAt: attestation.updatedAt,
    };
  }
}

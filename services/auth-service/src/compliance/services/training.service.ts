import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { training_status } from '../../../node_modules/.prisma/auth-client';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateTrainingDto,
  UpdateTrainingDto,
  CompleteTrainingDto,
  WaiveTrainingDto,
  TrainingQueryDto,
  TrainingResponseDto,
} from '../dto/training.dto';
import { Transactional } from '@my-girok/nest-common';

@Injectable()
export class TrainingService {
  constructor(private prisma: PrismaService) {}

  @Transactional()
  async create(dto: CreateTrainingDto): Promise<TrainingResponseDto> {
    const admin = await this.prisma.admins.findUnique({
      where: { id: dto.adminId },
    });

    if (!admin) {
      throw new NotFoundException(`Admin ${dto.adminId} not found`);
    }

    const training = await this.prisma.adminTrainingRecord.create({
      data: {
        adminId: dto.adminId,
        trainingType: dto.trainingType,
        name: dto.name,
        description: dto.description,
        provider: dto.provider,
        status: training_status.NOT_STARTED,
        assignedAt: new Date(),
        dueDate: dto.dueDate,
        passingScore: dto.passingScore,
        isMandatory: dto.isMandatory || false,
        recurrenceMonths: dto.recurrenceMonths,
        metadata: dto.metadata ? JSON.parse(dto.metadata) : {},
      },
    });

    return this.mapToResponse(training);
  }

  async findById(id: string): Promise<TrainingResponseDto> {
    const training = await this.prisma.adminTrainingRecord.findUnique({
      where: { id },
    });

    if (!training) {
      throw new NotFoundException(`Training ${id} not found`);
    }

    return this.mapToResponse(training);
  }

  async findAll(query: TrainingQueryDto): Promise<{ data: TrainingResponseDto[]; total: number }> {
    const where: any = {};

    if (query.adminId) {
      where.adminId = query.adminId;
    }

    if (query.trainingType) {
      where.trainingType = query.trainingType;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.isMandatory !== undefined) {
      where.isMandatory = query.isMandatory;
    }

    if (query.isWaived !== undefined) {
      where.isWaived = query.isWaived;
    }

    const skip = (query.page - 1) * query.limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.adminTrainingRecord.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.adminTrainingRecord.count({ where }),
    ]);

    return {
      data: data.map((t) => this.mapToResponse(t)),
      total,
    };
  }

  @Transactional()
  async update(id: string, dto: UpdateTrainingDto): Promise<TrainingResponseDto> {
    const training = await this.prisma.adminTrainingRecord.findUnique({
      where: { id },
    });

    if (!training) {
      throw new NotFoundException(`Training ${id} not found`);
    }

    if (training.status === training_status.COMPLETED) {
      throw new BadRequestException('Cannot update completed training');
    }

    const updated = await this.prisma.adminTrainingRecord.update({
      where: { id },
      data: {
        status: dto.status,
        name: dto.name,
        description: dto.description,
        dueDate: dto.dueDate,
        passingScore: dto.passingScore,
      },
    });

    return this.mapToResponse(updated);
  }

  @Transactional()
  async start(id: string): Promise<TrainingResponseDto> {
    const training = await this.prisma.adminTrainingRecord.findUnique({
      where: { id },
    });

    if (!training) {
      throw new NotFoundException(`Training ${id} not found`);
    }

    if (training.status !== training_status.NOT_STARTED) {
      throw new BadRequestException(
        `Training already started (current status: ${training.status})`,
      );
    }

    const updated = await this.prisma.adminTrainingRecord.update({
      where: { id },
      data: {
        status: training_status.IN_PROGRESS,
        startedAt: new Date(),
      },
    });

    return this.mapToResponse(updated);
  }

  @Transactional()
  async complete(id: string, dto: CompleteTrainingDto): Promise<TrainingResponseDto> {
    const training = await this.prisma.adminTrainingRecord.findUnique({
      where: { id },
    });

    if (!training) {
      throw new NotFoundException(`Training ${id} not found`);
    }

    if (training.status === training_status.COMPLETED) {
      throw new BadRequestException('Training already completed');
    }

    if (training.isWaived) {
      throw new BadRequestException('Cannot complete waived training');
    }

    let status: training_status = training_status.COMPLETED;
    if (
      dto.score !== undefined &&
      training.passingScore &&
      dto.score < Number(training.passingScore)
    ) {
      status = training_status.FAILED;
    }

    const completedAt = new Date();
    const nextDueDate = training.recurrenceMonths
      ? new Date(completedAt.getTime() + training.recurrenceMonths * 30 * 24 * 60 * 60 * 1000)
      : null;

    const updated = await this.prisma.adminTrainingRecord.update({
      where: { id },
      data: {
        status,
        completedAt,
        score: dto.score,
        certificateUrl: dto.certificateUrl,
        nextDueDate,
      },
    });

    return this.mapToResponse(updated);
  }

  @Transactional()
  async waive(id: string, dto: WaiveTrainingDto): Promise<TrainingResponseDto> {
    const training = await this.prisma.adminTrainingRecord.findUnique({
      where: { id },
    });

    if (!training) {
      throw new NotFoundException(`Training ${id} not found`);
    }

    if (training.status === training_status.COMPLETED) {
      throw new BadRequestException('Cannot waive completed training');
    }

    const waiver = await this.prisma.admins.findUnique({
      where: { id: dto.waivedBy },
    });

    if (!waiver) {
      throw new NotFoundException(`Waiver admin ${dto.waivedBy} not found`);
    }

    const updated = await this.prisma.adminTrainingRecord.update({
      where: { id },
      data: {
        status: training_status.WAIVED,
        isWaived: true,
        waivedBy: dto.waivedBy,
        waiverReason: dto.waiverReason,
      },
    });

    return this.mapToResponse(updated);
  }

  @Transactional()
  async delete(id: string): Promise<void> {
    const training = await this.prisma.adminTrainingRecord.findUnique({
      where: { id },
    });

    if (!training) {
      throw new NotFoundException(`Training ${id} not found`);
    }

    if (training.status === training_status.COMPLETED) {
      throw new BadRequestException('Cannot delete completed training');
    }

    await this.prisma.adminTrainingRecord.delete({ where: { id } });
  }

  private mapToResponse(training: any): TrainingResponseDto {
    return {
      id: training.id,
      adminId: training.adminId,
      trainingType: training.trainingType,
      name: training.name,
      description: training.description,
      provider: training.provider,
      status: training.status,
      assignedAt: training.assignedAt,
      startedAt: training.startedAt,
      completedAt: training.completedAt,
      dueDate: training.dueDate,
      score: training.score ? Number(training.score) : undefined,
      passingScore: training.passingScore ? Number(training.passingScore) : undefined,
      isMandatory: training.isMandatory,
      recurrenceMonths: training.recurrenceMonths,
      nextDueDate: training.nextDueDate,
      isWaived: training.isWaived,
      waivedBy: training.waivedBy,
      waiverReason: training.waiverReason,
      certificateUrl: training.certificateUrl,
      metadata: training.metadata,
      createdAt: training.createdAt,
      updatedAt: training.updatedAt,
    };
  }
}

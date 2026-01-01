import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ID } from '@my-girok/nest-common';
import { PrismaService } from '../database/prisma.service';
import { CreateDsrRequestDto, UpdateDsrRequestDto, DsrRequestResponseDto } from './dto';

@Injectable()
export class DsrRequestsService {
  private readonly logger = new Logger(DsrRequestsService.name);
  private readonly defaultDueDays: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.defaultDueDays = this.config.get<number>('DSR_DEFAULT_DUE_DAYS', 30);
  }

  async create(dto: CreateDsrRequestDto): Promise<DsrRequestResponseDto> {
    const id = ID.generate();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + this.defaultDueDays);

    const dsrRequest = await this.prisma.dsrRequest.create({
      data: {
        id,
        accountId: dto.accountId,
        requestType: dto.requestType as never,
        status: 'PENDING',
        description: dto.description,
        dueDate,
        ipAddress: dto.ipAddress,
        metadata: dto.metadata as object | undefined,
      },
    });

    this.logger.log(`DSR request created: ${id} (${dto.requestType}) for account ${dto.accountId}`);

    return this.toResponseDto(dsrRequest);
  }

  async findAll(params: {
    status?: string;
    type?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: DsrRequestResponseDto[]; total: number }> {
    const { status, type, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where = {
      ...(status && { status: status as never }),
      ...(type && { requestType: type as never }),
    };

    const [data, total] = await Promise.all([
      this.prisma.dsrRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.dsrRequest.count({ where }),
    ]);

    return {
      data: data.map((d) => this.toResponseDto(d)),
      total,
    };
  }

  async findByAccount(accountId: string): Promise<DsrRequestResponseDto[]> {
    const requests = await this.prisma.dsrRequest.findMany({
      where: { accountId },
      orderBy: { createdAt: 'desc' },
    });

    return requests.map((r) => this.toResponseDto(r));
  }

  async findOne(id: string): Promise<DsrRequestResponseDto> {
    const dsrRequest = await this.prisma.dsrRequest.findUnique({ where: { id } });

    if (!dsrRequest) {
      throw new NotFoundException(`DSR request not found: ${id}`);
    }

    return this.toResponseDto(dsrRequest);
  }

  async update(id: string, dto: UpdateDsrRequestDto): Promise<DsrRequestResponseDto> {
    const existing = await this.prisma.dsrRequest.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException(`DSR request not found: ${id}`);
    }

    const updateData: Record<string, unknown> = {};

    if (dto.status) {
      updateData.status = dto.status;

      if (dto.status === 'IN_PROGRESS' && !existing.acknowledgedAt) {
        updateData.acknowledgedAt = new Date();
      }

      if (dto.status === 'COMPLETED' || dto.status === 'REJECTED') {
        updateData.completedAt = new Date();
      }
    }

    if (dto.assignedTo) updateData.assignedTo = dto.assignedTo;
    if (dto.resolution) updateData.resolution = dto.resolution;
    if (dto.rejectionReason) updateData.rejectionReason = dto.rejectionReason;

    const updated = await this.prisma.dsrRequest.update({
      where: { id },
      data: updateData,
    });

    this.logger.log(`DSR request updated: ${id} -> ${dto.status || 'no status change'}`);

    return this.toResponseDto(updated);
  }

  private toResponseDto(dsrRequest: unknown): DsrRequestResponseDto {
    const r = dsrRequest as Record<string, unknown>;
    return {
      id: r.id as string,
      accountId: r.accountId as string,
      requestType: r.requestType as string,
      status: r.status as string,
      description: r.description as string | null,
      requestedAt: r.requestedAt as Date,
      acknowledgedAt: r.acknowledgedAt as Date | null,
      completedAt: r.completedAt as Date | null,
      dueDate: r.dueDate as Date,
      assignedTo: r.assignedTo as string | null,
      resolution: r.resolution as string | null,
      createdAt: r.createdAt as Date,
    };
  }
}

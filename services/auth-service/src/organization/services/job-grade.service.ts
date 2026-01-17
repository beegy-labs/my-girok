import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { Prisma, job_family } from '../../../node_modules/.prisma/auth-client';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateJobGradeDto,
  UpdateJobGradeDto,
  JobGradeResponseDto,
  JobGradeListQueryDto,
} from '../dto/job-grade.dto';

@Injectable()
export class JobGradeService {
  private readonly logger = new Logger(JobGradeService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateJobGradeDto): Promise<JobGradeResponseDto> {
    this.logger.log(`Creating job grade: ${dto.code}`);

    // Check if code already exists
    const existing = await this.prisma.job_grades.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException(`Job grade with code ${dto.code} already exists`);
    }

    const jobGrade = await this.prisma.job_grades.create({
      data: {
        code: dto.code,
        name: dto.name,
        name_en: dto.name, // TODO: Add nameEn field to DTO
        job_family: dto.jobFamily as job_family,
        level: dto.level,
      },
    });

    return this.mapToResponse(jobGrade);
  }

  async findAll(query?: JobGradeListQueryDto): Promise<JobGradeResponseDto[]> {
    this.logger.log('Fetching all job grades');

    const where: Prisma.job_gradesWhereInput = {};

    if (query?.jobFamily) {
      where.job_family = query.jobFamily as job_family;
    }

    if (query?.track) {
      where.track = query.track;
    }

    if (query?.isActive !== undefined) {
      where.is_active = query.isActive;
    }

    const jobGrades = await this.prisma.job_grades.findMany({
      where,
      orderBy: [{ level: 'asc' }, { track: 'asc' }],
    });

    return jobGrades.map((jg) => this.mapToResponse(jg));
  }

  async findOne(id: string): Promise<JobGradeResponseDto> {
    this.logger.log(`Fetching job grade: ${id}`);

    const jobGrade = await this.prisma.job_grades.findUnique({
      where: { id },
    });

    if (!jobGrade) {
      throw new NotFoundException(`Job grade with ID ${id} not found`);
    }

    return this.mapToResponse(jobGrade);
  }

  async findByCode(code: string): Promise<JobGradeResponseDto> {
    this.logger.log(`Fetching job grade by code: ${code}`);

    const jobGrade = await this.prisma.job_grades.findUnique({
      where: { code },
    });

    if (!jobGrade) {
      throw new NotFoundException(`Job grade with code ${code} not found`);
    }

    return this.mapToResponse(jobGrade);
  }

  async update(id: string, dto: UpdateJobGradeDto): Promise<JobGradeResponseDto> {
    this.logger.log(`Updating job grade: ${id}`);

    // Check if exists
    await this.findOne(id);

    const jobGrade = await this.prisma.job_grades.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        is_active: dto.isActive,
      },
    });

    return this.mapToResponse(jobGrade);
  }

  async remove(id: string): Promise<void> {
    this.logger.log(`Deleting job grade: ${id}`);

    // Check if exists
    await this.findOne(id);

    await this.prisma.job_grades.delete({
      where: { id },
    });

    this.logger.log(`Job grade ${id} deleted successfully`);
  }

  private mapToResponse(jobGrade: any): JobGradeResponseDto {
    return {
      id: jobGrade.id,
      code: jobGrade.code,
      name: jobGrade.name,
      jobFamily: jobGrade.job_family,
      level: jobGrade.level,
      track: jobGrade.track,
      description: jobGrade.description,
      isActive: jobGrade.is_active,
      createdAt: jobGrade.created_at,
      updatedAt: jobGrade.updated_at,
    };
  }
}

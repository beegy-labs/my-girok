import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateWorkScheduleDto,
  UpdateWorkScheduleDto,
  WorkScheduleResponseDto,
} from '../dto/work-schedule.dto';

@Injectable()
export class WorkScheduleService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateWorkScheduleDto): Promise<WorkScheduleResponseDto> {
    // Deactivate previous schedules for this admin
    await this.prisma.adminWorkSchedule.updateMany({
      where: {
        admin_id: dto.adminId,
        is_active: true,
      },
      data: {
        is_active: false,
        end_date: new Date(dto.effectiveDate),
      },
    });

    const schedule = await this.prisma.adminWorkSchedule.create({
      data: {
        admin_id: dto.adminId,
        schedule_type: dto.scheduleType,
        effective_date: dto.effectiveDate,
        end_date: dto.endDate,
        monday_start: dto.mondayStart,
        monday_end: dto.mondayEnd,
        tuesday_start: dto.tuesdayStart,
        tuesday_end: dto.tuesdayEnd,
        wednesday_start: dto.wednesdayStart,
        wednesday_end: dto.wednesdayEnd,
        thursday_start: dto.thursdayStart,
        thursday_end: dto.thursdayEnd,
        friday_start: dto.fridayStart,
        friday_end: dto.fridayEnd,
        saturday_start: dto.saturdayStart,
        saturday_end: dto.saturdayEnd,
        sunday_start: dto.sundayStart,
        sunday_end: dto.sundayEnd,
        weekly_hours: dto.weeklyHours,
        core_hours_start: dto.coreHoursStart,
        core_hours_end: dto.coreHoursEnd,
        timezone: dto.timezone,
        is_active: true,
      },
    });

    return this.mapToResponse(schedule);
  }

  async findByAdmin(adminId: string): Promise<WorkScheduleResponseDto[]> {
    const schedules = await this.prisma.adminWorkSchedule.findMany({
      where: { admin_id: adminId },
      orderBy: { effective_date: 'desc' },
    });

    return schedules.map((s) => this.mapToResponse(s));
  }

  async findActiveByAdmin(adminId: string): Promise<WorkScheduleResponseDto | null> {
    const schedule = await this.prisma.adminWorkSchedule.findFirst({
      where: {
        admin_id: adminId,
        is_active: true,
      },
      orderBy: { effective_date: 'desc' },
    });

    return schedule ? this.mapToResponse(schedule) : null;
  }

  async findOne(id: string): Promise<WorkScheduleResponseDto> {
    const schedule = await this.prisma.adminWorkSchedule.findUnique({
      where: { id },
    });

    if (!schedule) {
      throw new NotFoundException(`Work schedule ${id} not found`);
    }

    return this.mapToResponse(schedule);
  }

  async update(id: string, dto: UpdateWorkScheduleDto): Promise<WorkScheduleResponseDto> {
    const schedule = await this.prisma.adminWorkSchedule.update({
      where: { id },
      data: {
        schedule_type: dto.scheduleType,
        end_date: dto.endDate,
        monday_start: dto.mondayStart,
        monday_end: dto.mondayEnd,
        tuesday_start: dto.tuesdayStart,
        tuesday_end: dto.tuesdayEnd,
        wednesday_start: dto.wednesdayStart,
        wednesday_end: dto.wednesdayEnd,
        thursday_start: dto.thursdayStart,
        thursday_end: dto.thursdayEnd,
        friday_start: dto.fridayStart,
        friday_end: dto.fridayEnd,
        saturday_start: dto.saturdayStart,
        saturday_end: dto.saturdayEnd,
        sunday_start: dto.sundayStart,
        sunday_end: dto.sundayEnd,
        weekly_hours: dto.weeklyHours,
        core_hours_start: dto.coreHoursStart,
        core_hours_end: dto.coreHoursEnd,
        is_active: dto.isActive,
      },
    });

    return this.mapToResponse(schedule);
  }

  async remove(id: string): Promise<void> {
    await this.prisma.adminWorkSchedule.delete({
      where: { id },
    });
  }

  private mapToResponse(schedule: any): WorkScheduleResponseDto {
    return {
      id: schedule.id,
      adminId: schedule.admin_id,
      scheduleType: schedule.schedule_type,
      effectiveDate: schedule.effective_date,
      endDate: schedule.end_date,
      mondayStart: schedule.monday_start,
      mondayEnd: schedule.monday_end,
      tuesdayStart: schedule.tuesday_start,
      tuesdayEnd: schedule.tuesday_end,
      wednesdayStart: schedule.wednesday_start,
      wednesdayEnd: schedule.wednesday_end,
      thursdayStart: schedule.thursday_start,
      thursdayEnd: schedule.thursday_end,
      fridayStart: schedule.friday_start,
      fridayEnd: schedule.friday_end,
      saturdayStart: schedule.saturday_start,
      saturdayEnd: schedule.saturday_end,
      sundayStart: schedule.sunday_start,
      sundayEnd: schedule.sunday_end,
      weeklyHours: parseFloat(schedule.weekly_hours || '40'),
      coreHoursStart: schedule.core_hours_start,
      coreHoursEnd: schedule.core_hours_end,
      timezone: schedule.timezone,
      isActive: schedule.is_active,
      createdAt: schedule.created_at,
      updatedAt: schedule.updated_at,
    };
  }
}

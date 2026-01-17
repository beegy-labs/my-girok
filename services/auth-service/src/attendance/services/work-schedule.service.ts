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
        adminId: dto.adminId,
        isActive: true,
      },
      data: {
        isActive: false,
        endDate: new Date(dto.effectiveDate),
      },
    });

    const schedule = await this.prisma.adminWorkSchedule.create({
      data: {
        adminId: dto.adminId,
        scheduleType: dto.scheduleType,
        effectiveDate: dto.effectiveDate,
        endDate: dto.endDate,
        mondayStart: dto.mondayStart,
        mondayEnd: dto.mondayEnd,
        tuesdayStart: dto.tuesdayStart,
        tuesdayEnd: dto.tuesdayEnd,
        wednesdayStart: dto.wednesdayStart,
        wednesdayEnd: dto.wednesdayEnd,
        thursdayStart: dto.thursdayStart,
        thursdayEnd: dto.thursdayEnd,
        fridayStart: dto.fridayStart,
        fridayEnd: dto.fridayEnd,
        saturdayStart: dto.saturdayStart,
        saturdayEnd: dto.saturdayEnd,
        sundayStart: dto.sundayStart,
        sundayEnd: dto.sundayEnd,
        weeklyHours: dto.weeklyHours,
        coreHoursStart: dto.coreHoursStart,
        coreHoursEnd: dto.coreHoursEnd,
        timezone: dto.timezone,
        isActive: true,
      },
    });

    return this.mapToResponse(schedule);
  }

  async findByAdmin(adminId: string): Promise<WorkScheduleResponseDto[]> {
    const schedules = await this.prisma.adminWorkSchedule.findMany({
      where: { adminId: adminId },
      orderBy: { effectiveDate: 'desc' },
    });

    return schedules.map((s) => this.mapToResponse(s));
  }

  async findActiveByAdmin(adminId: string): Promise<WorkScheduleResponseDto | null> {
    const schedule = await this.prisma.adminWorkSchedule.findFirst({
      where: {
        adminId: adminId,
        isActive: true,
      },
      orderBy: { effectiveDate: 'desc' },
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
        scheduleType: dto.scheduleType,
        endDate: dto.endDate,
        mondayStart: dto.mondayStart,
        mondayEnd: dto.mondayEnd,
        tuesdayStart: dto.tuesdayStart,
        tuesdayEnd: dto.tuesdayEnd,
        wednesdayStart: dto.wednesdayStart,
        wednesdayEnd: dto.wednesdayEnd,
        thursdayStart: dto.thursdayStart,
        thursdayEnd: dto.thursdayEnd,
        fridayStart: dto.fridayStart,
        fridayEnd: dto.fridayEnd,
        saturdayStart: dto.saturdayStart,
        saturdayEnd: dto.saturdayEnd,
        sundayStart: dto.sundayStart,
        sundayEnd: dto.sundayEnd,
        weeklyHours: dto.weeklyHours,
        coreHoursStart: dto.coreHoursStart,
        coreHoursEnd: dto.coreHoursEnd,
        isActive: dto.isActive,
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
      adminId: schedule.adminId,
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

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  ClockInDto,
  ClockOutDto,
  ApproveOvertimeDto,
  AdminAttendanceQueryDto,
  AttendanceResponseDto,
  AttendanceStatsDto,
  AttendanceStatus,
  WorkType,
} from '../dto/attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  async clockIn(
    adminId: string,
    dto: ClockInDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AttendanceResponseDto> {
    const dateStr = this.formatDate(dto.date);

    // Check if already clocked in
    const existing = await this.prisma.adminAttendance.findUnique({
      where: {
        admin_id_date: {
          admin_id: adminId,
          date: new Date(dateStr),
        },
      },
    });

    if (existing && existing.clock_in) {
      throw new ConflictException(`Already clocked in for ${dateStr}. Clock out first.`);
    }

    const attendance = await this.prisma.adminAttendance.upsert({
      where: {
        admin_id_date: {
          admin_id: adminId,
          date: new Date(dateStr),
        },
      },
      create: {
        admin_id: adminId,
        date: new Date(dateStr),
        clock_in: new Date(),
        work_type: dto.workType || WorkType.OFFICE,
        office_id: dto.officeId,
        remote_location: dto.remoteLocation,
        clock_in_method: 'APP',
        clock_in_ip: ipAddress,
        clock_in_location: dto.location as Prisma.JsonValue,
        notes: dto.notes,
        status: AttendanceStatus.PRESENT,
      },
      update: {
        clock_in: new Date(),
        work_type: dto.workType || WorkType.OFFICE,
        office_id: dto.officeId,
        remote_location: dto.remoteLocation,
        clock_in_method: 'APP',
        clock_in_ip: ipAddress,
        clock_in_location: dto.location as Prisma.JsonValue,
        notes: dto.notes,
        status: AttendanceStatus.PRESENT,
      },
    });

    return this.mapToResponse(attendance);
  }

  async clockOut(
    adminId: string,
    dto: ClockOutDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AttendanceResponseDto> {
    const dateStr = this.formatDate(dto.date);

    const existing = await this.prisma.adminAttendance.findUnique({
      where: {
        admin_id_date: {
          admin_id: adminId,
          date: new Date(dateStr),
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(`No clock-in record found for ${dateStr}`);
    }

    if (!existing.clock_in) {
      throw new BadRequestException(`Must clock in before clocking out for ${dateStr}`);
    }

    if (existing.clock_out) {
      throw new ConflictException(`Already clocked out for ${dateStr}`);
    }

    const clockOutTime = new Date();
    const workMinutes = this.calculateWorkMinutes(
      existing.clock_in,
      clockOutTime,
      existing.break_minutes || 60,
    );

    const updateData: any = {
      clock_out: clockOutTime,
      clock_out_method: 'APP',
      clock_out_ip: ipAddress,
      clock_out_location: dto.location as Prisma.JsonValue,
      actual_minutes: workMinutes,
    };

    if (dto.overtimeMinutes && dto.overtimeMinutes > 0) {
      updateData.overtime_minutes = dto.overtimeMinutes;
      updateData.overtime_requested = true;
      updateData.overtime_reason = dto.overtimeReason;
    }

    if (dto.notes) {
      updateData.notes = existing.notes ? `${existing.notes}\n${dto.notes}` : dto.notes;
    }

    const attendance = await this.prisma.adminAttendance.update({
      where: {
        admin_id_date: {
          admin_id: adminId,
          date: new Date(dateStr),
        },
      },
      data: updateData,
    });

    return this.mapToResponse(attendance);
  }

  async approveOvertime(
    attendanceId: string,
    approverId: string,
    dto: ApproveOvertimeDto,
  ): Promise<AttendanceResponseDto> {
    const attendance = await this.prisma.adminAttendance.findUnique({
      where: { id: attendanceId },
    });

    if (!attendance) {
      throw new NotFoundException(`Attendance record ${attendanceId} not found`);
    }

    if (!attendance.overtime_requested) {
      throw new BadRequestException('No overtime request exists for this attendance');
    }

    const updated = await this.prisma.adminAttendance.update({
      where: { id: attendanceId },
      data: {
        overtime_approved: dto.approved,
        overtime_approved_by: approverId,
        overtime_approved_at: new Date(),
        manager_notes: dto.managerNotes,
      },
    });

    return this.mapToResponse(updated);
  }

  async getAttendanceByDate(adminId: string, date: Date): Promise<AttendanceResponseDto | null> {
    const dateStr = this.formatDate(date);

    const attendance = await this.prisma.adminAttendance.findUnique({
      where: {
        admin_id_date: {
          admin_id: adminId,
          date: new Date(dateStr),
        },
      },
    });

    return attendance ? this.mapToResponse(attendance) : null;
  }

  async listAttendances(
    query: AdminAttendanceQueryDto,
  ): Promise<{ data: AttendanceResponseDto[]; total: number }> {
    const where: any = {};

    if (query.adminId) {
      where.admin_id = query.adminId;
    }

    if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) {
        where.date.gte = new Date(this.formatDate(query.startDate));
      }
      if (query.endDate) {
        where.date.lte = new Date(this.formatDate(query.endDate));
      }
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.workType) {
      where.work_type = query.workType;
    }

    const skip = (query.page - 1) * query.limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.adminAttendance.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { date: 'desc' },
      }),
      this.prisma.adminAttendance.count({ where }),
    ]);

    return {
      data: data.map((a) => this.mapToResponse(a)),
      total,
    };
  }

  async getStats(adminId: string, startDate: Date, endDate: Date): Promise<AttendanceStatsDto> {
    const attendances = await this.prisma.adminAttendance.findMany({
      where: {
        admin_id: adminId,
        date: {
          gte: new Date(this.formatDate(startDate)),
          lte: new Date(this.formatDate(endDate)),
        },
      },
    });

    const totalDays = attendances.length;
    const presentDays = attendances.filter((a) => a.status === AttendanceStatus.PRESENT).length;
    const absentDays = attendances.filter((a) => a.status === AttendanceStatus.ABSENT).length;
    const lateDays = attendances.filter(
      (a) => a.status === AttendanceStatus.LATE || a.late_minutes > 0,
    ).length;
    const remoteDays = attendances.filter((a) => a.work_type === WorkType.REMOTE).length;

    const totalOvertimeMinutes = attendances.reduce((sum, a) => sum + (a.overtime_minutes || 0), 0);

    const totalWorkMinutes = attendances.reduce((sum, a) => sum + (a.actual_minutes || 0), 0);
    const averageWorkMinutes = presentDays > 0 ? Math.round(totalWorkMinutes / presentDays) : 0;

    return {
      totalDays,
      presentDays,
      absentDays,
      lateDays,
      remoteDays,
      totalOvertimeMinutes,
      averageWorkMinutes,
    };
  }

  private calculateWorkMinutes(clockIn: Date, clockOut: Date, breakMinutes: number): number {
    const diffMs = clockOut.getTime() - clockIn.getTime();
    const totalMinutes = Math.floor(diffMs / 60000);
    return Math.max(0, totalMinutes - breakMinutes);
  }

  private formatDate(date: Date): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private mapToResponse(attendance: any): AttendanceResponseDto {
    return {
      id: attendance.id,
      adminId: attendance.admin_id,
      date: attendance.date,
      scheduledStart: attendance.scheduled_start,
      scheduledEnd: attendance.scheduled_end,
      clockIn: attendance.clock_in,
      clockOut: attendance.clock_out,
      scheduledMinutes: attendance.scheduled_minutes,
      actualMinutes: attendance.actual_minutes,
      overtimeMinutes: attendance.overtime_minutes,
      breakMinutes: attendance.break_minutes,
      status: attendance.status as AttendanceStatus,
      lateMinutes: attendance.late_minutes,
      earlyLeaveMinutes: attendance.early_leave_minutes,
      workType: attendance.work_type as WorkType,
      officeId: attendance.office_id,
      remoteLocation: attendance.remote_location,
      overtimeRequested: attendance.overtime_requested,
      overtimeApproved: attendance.overtime_approved,
      overtimeApprovedBy: attendance.overtime_approved_by,
      overtimeApprovedAt: attendance.overtime_approved_at,
      overtimeReason: attendance.overtime_reason,
      clockInMethod: attendance.clock_in_method,
      clockOutMethod: attendance.clock_out_method,
      notes: attendance.notes,
      managerNotes: attendance.manager_notes,
      isHoliday: attendance.is_holiday,
      createdAt: attendance.created_at,
      updatedAt: attendance.updated_at,
    };
  }
}

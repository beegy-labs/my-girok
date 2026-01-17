import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma, work_type } from '../../../node_modules/.prisma/auth-client';
import { PrismaService } from '../../database/prisma.service';
import {
  ClockInDto,
  ClockOutDto,
  ApproveOvertimeDto,
  AdminAttendanceQueryDto,
  AttendanceResponseDto,
  AttendanceStatsDto,
} from '../dto/attendance.dto';
import { AttendanceStatus, WorkType } from '@my-girok/types';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  async clockIn(
    adminId: string,
    dto: ClockInDto,
    ipAddress?: string,
  ): Promise<AttendanceResponseDto> {
    const dateStr = this.formatDate(dto.date);

    // Check if already clocked in
    const existing = await this.prisma.adminAttendance.findUnique({
      where: {
        adminId_date: {
          adminId: adminId,
          date: new Date(dateStr),
        },
      },
    });

    if (existing && existing.clockIn) {
      throw new ConflictException(`Already clocked in for ${dateStr}. Clock out first.`);
    }

    const attendance = await this.prisma.adminAttendance.upsert({
      where: {
        adminId_date: {
          adminId: adminId,
          date: new Date(dateStr),
        },
      },
      create: {
        adminId: adminId,
        date: new Date(dateStr),
        clockIn: new Date(),
        workType: (dto.workType as work_type) || ('OFFICE' as work_type),
        officeId: dto.officeId,
        remoteLocation: dto.remoteLocation,
        clockInMethod: 'APP',
        clockInIp: ipAddress,
        clockInLocation: dto.location as Prisma.JsonValue,
        notes: dto.notes,
        status: AttendanceStatus.PRESENT,
      },
      update: {
        clockIn: new Date(),
        workType: (dto.workType as work_type) || ('OFFICE' as work_type),
        officeId: dto.officeId,
        remoteLocation: dto.remoteLocation,
        clockInMethod: 'APP',
        clockInIp: ipAddress,
        clockInLocation: dto.location as Prisma.JsonValue,
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
  ): Promise<AttendanceResponseDto> {
    const dateStr = this.formatDate(dto.date);

    const existing = await this.prisma.adminAttendance.findUnique({
      where: {
        adminId_date: {
          adminId: adminId,
          date: new Date(dateStr),
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(`No clock-in record found for ${dateStr}`);
    }

    if (!existing.clockIn) {
      throw new BadRequestException(`Must clock in before clocking out for ${dateStr}`);
    }

    if (existing.clockOut) {
      throw new ConflictException(`Already clocked out for ${dateStr}`);
    }

    const clockOutTime = new Date();
    const workMinutes = this.calculateWorkMinutes(
      existing.clockIn,
      clockOutTime,
      existing.breakMinutes || 60,
    );

    const updateData: any = {
      clockOut: clockOutTime,
      clockOutMethod: 'APP',
      clockOutIp: ipAddress,
      clockOutLocation: dto.location as Prisma.JsonValue,
      actualMinutes: workMinutes,
    };

    if (dto.overtimeMinutes && dto.overtimeMinutes > 0) {
      updateData.overtimeMinutes = dto.overtimeMinutes;
      updateData.overtimeRequested = true;
      updateData.overtime_reason = dto.overtimeReason;
    }

    if (dto.notes) {
      updateData.notes = existing.notes ? `${existing.notes}\n${dto.notes}` : dto.notes;
    }

    const attendance = await this.prisma.adminAttendance.update({
      where: {
        adminId_date: {
          adminId: adminId,
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

    if (!attendance.overtimeRequested) {
      throw new BadRequestException('No overtime request exists for this attendance');
    }

    const updated = await this.prisma.adminAttendance.update({
      where: { id: attendanceId },
      data: {
        overtimeApproved: dto.approved,
        overtimeApprovedBy: approverId,
        overtimeApprovedAt: new Date(),
        managerNotes: dto.managerNotes,
      },
    });

    return this.mapToResponse(updated);
  }

  async getAttendanceByDate(adminId: string, date: Date): Promise<AttendanceResponseDto | null> {
    const dateStr = this.formatDate(date);

    const attendance = await this.prisma.adminAttendance.findUnique({
      where: {
        adminId_date: {
          adminId: adminId,
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
      where.adminId = query.adminId;
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
      where.workType = query.workType;
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
        adminId: adminId,
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
      (a) => a.status === AttendanceStatus.LATE || a.lateMinutes > 0,
    ).length;
    const remoteDays = attendances.filter((a) => a.workType === ('REMOTE' as work_type)).length;

    const totalOvertimeMinutes = attendances.reduce((sum, a) => sum + (a.overtimeMinutes || 0), 0);

    const totalWorkMinutes = attendances.reduce((sum, a) => sum + (a.actualMinutes || 0), 0);
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
    return date.toISOString().split('T')[0];
  }

  private mapToResponse(attendance: any): AttendanceResponseDto {
    return {
      id: attendance.id,
      adminId: attendance.adminId,
      date: attendance.date,
      scheduledStart: attendance.scheduled_start,
      scheduledEnd: attendance.scheduled_end,
      clockIn: attendance.clockIn,
      clockOut: attendance.clockOut,
      scheduledMinutes: attendance.scheduled_minutes,
      actualMinutes: attendance.actualMinutes,
      overtimeMinutes: attendance.overtimeMinutes,
      breakMinutes: attendance.breakMinutes,
      status: attendance.status as AttendanceStatus,
      lateMinutes: attendance.lateMinutes,
      earlyLeaveMinutes: attendance.early_leave_minutes,
      workType: attendance.workType as WorkType,
      officeId: attendance.office_id,
      remoteLocation: attendance.remote_location,
      overtimeRequested: attendance.overtimeRequested,
      overtimeApproved: attendance.overtime_approved,
      overtimeApprovedBy: attendance.overtime_approved_by,
      overtimeApprovedAt: attendance.overtime_approved_at,
      overtimeReason: attendance.overtime_reason,
      clockInMethod: attendance.clockIn_method,
      clockOutMethod: attendance.clockOut_method,
      notes: attendance.notes,
      managerNotes: attendance.manager_notes,
      isHoliday: attendance.is_holiday,
      createdAt: attendance.created_at,
      updatedAt: attendance.updated_at,
    };
  }
}

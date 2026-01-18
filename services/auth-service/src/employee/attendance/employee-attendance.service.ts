/**
 * Employee Attendance Service (Phase 5.2)
 * Allows employees to clock in/out and view their own attendance records
 */

import { Injectable } from '@nestjs/common';
import { AttendanceService } from '../../attendance/services/attendance.service';
import {
  ClockInDto,
  ClockOutDto,
  AttendanceResponseDto,
  AttendanceStatsDto,
} from '../../attendance/dto/attendance.dto';

@Injectable()
export class EmployeeAttendanceService {
  constructor(private readonly attendanceService: AttendanceService) {}

  /**
   * Clock in for the employee
   * @param employeeId The ID of the employee (from JWT)
   * @param dto Clock in data
   * @param ipAddress Client IP address
   */
  async clockIn(
    employeeId: string,
    dto: ClockInDto,
    ipAddress?: string,
  ): Promise<AttendanceResponseDto> {
    return this.attendanceService.clockIn(employeeId, dto, ipAddress);
  }

  /**
   * Clock out for the employee
   * @param employeeId The ID of the employee (from JWT)
   * @param dto Clock out data
   * @param ipAddress Client IP address
   */
  async clockOut(
    employeeId: string,
    dto: ClockOutDto,
    ipAddress?: string,
  ): Promise<AttendanceResponseDto> {
    return this.attendanceService.clockOut(employeeId, dto, ipAddress);
  }

  /**
   * Get employee's attendance by date
   * @param employeeId The ID of the employee (from JWT)
   * @param date Date to query
   */
  async getAttendanceByDate(employeeId: string, date: Date): Promise<AttendanceResponseDto | null> {
    return this.attendanceService.getAttendanceByDate(employeeId, date);
  }

  /**
   * Get employee's attendance records
   * @param employeeId The ID of the employee (from JWT)
   * @param startDate Start date
   * @param endDate End date
   * @param page Page number
   * @param limit Items per page
   */
  async getMyAttendances(
    employeeId: string,
    startDate?: Date,
    endDate?: Date,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: AttendanceResponseDto[]; total: number }> {
    return this.attendanceService.listAttendances({
      adminId: employeeId,
      startDate,
      endDate,
      page,
      limit,
    });
  }

  /**
   * Get employee's attendance statistics
   * @param employeeId The ID of the employee (from JWT)
   * @param startDate Start date
   * @param endDate End date
   */
  async getMyStats(
    employeeId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<AttendanceStatsDto> {
    return this.attendanceService.getStats(employeeId, startDate, endDate);
  }
}

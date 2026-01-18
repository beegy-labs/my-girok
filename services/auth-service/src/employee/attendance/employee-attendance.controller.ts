/**
 * Employee Attendance Controller (Phase 5.2)
 * Endpoints for employees to clock in/out and view their own attendance
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiOkResponse, ApiQuery } from '@nestjs/swagger';
import { EmployeeAuthGuard } from '../guards';
import { EmployeeRequest } from '../types';
import { EmployeeAttendanceService } from './employee-attendance.service';
import {
  ClockInDto,
  ClockOutDto,
  AttendanceResponseDto,
  AttendanceStatsDto,
} from '../../attendance/dto/attendance.dto';

@ApiTags('Employee Attendance')
@ApiBearerAuth()
@Controller('employee/attendance')
@UseGuards(EmployeeAuthGuard)
export class EmployeeAttendanceController {
  constructor(private readonly employeeAttendanceService: EmployeeAttendanceService) {}

  /**
   * Clock in
   * POST /employee/attendance/clock-in
   */
  @Post('clock-in')
  @ApiOperation({
    summary: 'Clock in',
    description: 'Employee clocks in for work',
  })
  @ApiOkResponse({ type: AttendanceResponseDto })
  async clockIn(
    @Req() req: EmployeeRequest,
    @Body() dto: ClockInDto,
  ): Promise<AttendanceResponseDto> {
    const ipAddress = req.ip || req.headers['x-forwarded-for']?.toString();
    return this.employeeAttendanceService.clockIn(req.employee.sub, dto, ipAddress);
  }

  /**
   * Clock out
   * POST /employee/attendance/clock-out
   */
  @Post('clock-out')
  @ApiOperation({
    summary: 'Clock out',
    description: 'Employee clocks out from work',
  })
  @ApiOkResponse({ type: AttendanceResponseDto })
  async clockOut(
    @Req() req: EmployeeRequest,
    @Body() dto: ClockOutDto,
  ): Promise<AttendanceResponseDto> {
    const ipAddress = req.ip || req.headers['x-forwarded-for']?.toString();
    return this.employeeAttendanceService.clockOut(req.employee.sub, dto, ipAddress);
  }

  /**
   * Get own attendance records
   * GET /employee/attendance/me
   */
  @Get('me')
  @ApiOperation({
    summary: 'Get own attendance records',
    description: 'Employee can view their own attendance records',
  })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  async getMyAttendances(
    @Req() req: EmployeeRequest,
    @Query('startDate') startDate?: Date,
    @Query('endDate') endDate?: Date,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number = 20,
  ): Promise<{ data: AttendanceResponseDto[]; total: number }> {
    return this.employeeAttendanceService.getMyAttendances(
      req.employee.sub,
      startDate,
      endDate,
      page,
      limit,
    );
  }

  /**
   * Get own attendance statistics
   * GET /employee/attendance/me/stats
   */
  @Get('me/stats')
  @ApiOperation({
    summary: 'Get own attendance statistics',
    description: 'Employee can view their own attendance statistics',
  })
  @ApiQuery({ name: 'startDate', required: true, type: Date })
  @ApiQuery({ name: 'endDate', required: true, type: Date })
  @ApiOkResponse({ type: AttendanceStatsDto })
  async getMyStats(
    @Req() req: EmployeeRequest,
    @Query('startDate') startDate: Date,
    @Query('endDate') endDate: Date,
  ): Promise<AttendanceStatsDto> {
    return this.employeeAttendanceService.getMyStats(req.employee.sub, startDate, endDate);
  }
}

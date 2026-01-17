import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard, AdminId } from '@my-girok/nest-common';
import { AttendanceService } from '../services/attendance.service';
import {
  ClockInDto,
  ClockOutDto,
  ApproveOvertimeDto,
  AdminAttendanceQueryDto,
  AttendanceResponseDto,
  AttendanceStatsDto,
} from '../dto/attendance.dto';

@ApiTags('Attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('clock-in')
  @ApiOperation({ summary: 'Clock in for the day' })
  clockIn(
    @AdminId() adminId: string,
    @Req() req: Request,
    @Body() dto: ClockInDto,
  ): Promise<AttendanceResponseDto> {
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];
    return this.attendanceService.clockIn(adminId, dto, ipAddress, userAgent);
  }

  @Post('clock-out')
  @ApiOperation({ summary: 'Clock out for the day' })
  clockOut(
    @AdminId() adminId: string,
    @Req() req: Request,
    @Body() dto: ClockOutDto,
  ): Promise<AttendanceResponseDto> {
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];
    return this.attendanceService.clockOut(adminId, dto, ipAddress, userAgent);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get my attendance records' })
  getMyAttendances(
    @AdminId() adminId: string,
    @Query() query: AdminAttendanceQueryDto,
  ): Promise<{ data: AttendanceResponseDto[]; total: number }> {
    return this.attendanceService.listAttendances({ ...query, adminId });
  }

  @Get('me/stats')
  @ApiOperation({ summary: 'Get my attendance statistics' })
  getMyStats(
    @AdminId() adminId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<AttendanceStatsDto> {
    return this.attendanceService.getStats(adminId, new Date(startDate), new Date(endDate));
  }

  @Get('date/:date')
  @ApiOperation({ summary: 'Get attendance by date' })
  getAttendanceByDate(
    @AdminId() adminId: string,
    @Param('date') date: string,
  ): Promise<AttendanceResponseDto | null> {
    return this.attendanceService.getAttendanceByDate(adminId, new Date(date));
  }

  @Get()
  @ApiOperation({ summary: 'List all attendance records (admin)' })
  listAttendances(
    @Query() query: AdminAttendanceQueryDto,
  ): Promise<{ data: AttendanceResponseDto[]; total: number }> {
    return this.attendanceService.listAttendances(query);
  }

  @Patch(':id/approve-overtime')
  @ApiOperation({ summary: 'Approve overtime request (manager)' })
  approveOvertime(
    @AdminId() approverId: string,
    @Param('id') id: string,
    @Body() dto: ApproveOvertimeDto,
  ): Promise<AttendanceResponseDto> {
    return this.attendanceService.approveOvertime(id, approverId, dto);
  }

  @Get('admin/:adminId/stats')
  @ApiOperation({ summary: 'Get admin attendance statistics (manager)' })
  getAdminStats(
    @Param('adminId') adminId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<AttendanceStatsDto> {
    return this.attendanceService.getStats(adminId, new Date(startDate), new Date(endDate));
  }
}

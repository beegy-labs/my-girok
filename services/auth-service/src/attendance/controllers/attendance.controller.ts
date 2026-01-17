import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Req } from '@nestjs/swagger';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
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
  clockIn(@Req() req: Request, @Body() dto: ClockInDto): Promise<AttendanceResponseDto> {
    const adminId = (req.user as any).id;
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];
    return this.attendanceService.clockIn(adminId, dto, ipAddress, userAgent);
  }

  @Post('clock-out')
  @ApiOperation({ summary: 'Clock out for the day' })
  clockOut(@Req() req: Request, @Body() dto: ClockOutDto): Promise<AttendanceResponseDto> {
    const adminId = (req.user as any).id;
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];
    return this.attendanceService.clockOut(adminId, dto, ipAddress, userAgent);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get my attendance records' })
  getMyAttendances(
    @Req() req: Request,
    @Query() query: AdminAttendanceQueryDto,
  ): Promise<{ data: AttendanceResponseDto[]; total: number }> {
    const adminId = (req.user as any).id;
    return this.attendanceService.listAttendances({ ...query, adminId });
  }

  @Get('me/stats')
  @ApiOperation({ summary: 'Get my attendance statistics' })
  getMyStats(
    @Req() req: Request,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<AttendanceStatsDto> {
    const adminId = (req.user as any).id;
    return this.attendanceService.getStats(adminId, new Date(startDate), new Date(endDate));
  }

  @Get('date/:date')
  @ApiOperation({ summary: 'Get attendance by date' })
  getAttendanceByDate(
    @Req() req: Request,
    @Param('date') date: string,
  ): Promise<AttendanceResponseDto | null> {
    const adminId = (req.user as any).id;
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
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: ApproveOvertimeDto,
  ): Promise<AttendanceResponseDto> {
    const approverId = (req.user as any).id;
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

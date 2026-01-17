import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminId } from '../../common/decorators/admin-id.decorator';
import { LeaveBalanceService } from '../services/leave-balance.service';
import {
  CreateLeaveBalanceDto,
  AdjustBalanceDto,
  LeaveBalanceResponseDto,
} from '../dto/leave-balance.dto';

@ApiTags('Leave Balances')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('leave-balances')
export class LeaveBalanceController {
  constructor(private readonly leaveBalanceService: LeaveBalanceService) {}

  @Post()
  @ApiOperation({ summary: 'Create a leave balance (HR/Admin)' })
  create(@Body() dto: CreateLeaveBalanceDto): Promise<LeaveBalanceResponseDto> {
    return this.leaveBalanceService.create(dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get my current leave balance' })
  getMyBalance(@AdminId() adminId: string): Promise<LeaveBalanceResponseDto> {
    return this.leaveBalanceService.getCurrentBalance(adminId);
  }

  @Get('me/:year')
  @ApiOperation({ summary: 'Get my leave balance for a specific year' })
  getMyBalanceByYear(
    @AdminId() adminId: string,
    @Param('year', ParseIntPipe) year: number,
  ): Promise<LeaveBalanceResponseDto> {
    return this.leaveBalanceService.getBalance(adminId, year);
  }

  @Get(':adminId/:year')
  @ApiOperation({ summary: 'Get admin leave balance (HR/Manager)' })
  getBalance(
    @Param('adminId') adminId: string,
    @Param('year', ParseIntPipe) year: number,
  ): Promise<LeaveBalanceResponseDto> {
    return this.leaveBalanceService.getBalance(adminId, year);
  }

  @Patch(':adminId/:year/adjust')
  @ApiOperation({ summary: 'Adjust leave balance (HR/Admin)' })
  adjust(
    @AdminId() adjustedBy: string,
    @Param('adminId') adminId: string,
    @Param('year', ParseIntPipe) year: number,
    @Body() dto: AdjustBalanceDto,
  ): Promise<LeaveBalanceResponseDto> {
    return this.leaveBalanceService.adjust(adminId, year, adjustedBy, dto);
  }

  @Post(':adminId/:year/recalculate')
  @ApiOperation({ summary: 'Recalculate leave balance based on approved leaves' })
  recalculate(
    @Param('adminId') adminId: string,
    @Param('year', ParseIntPipe) year: number,
  ): Promise<LeaveBalanceResponseDto> {
    return this.leaveBalanceService.recalculate(adminId, year);
  }

  @Post(':adminId/:year/initialize')
  @ApiOperation({ summary: 'Initialize leave balance for new year (HR)' })
  initialize(
    @Param('adminId') adminId: string,
    @Param('year', ParseIntPipe) year: number,
    @Query('tenureYears', ParseIntPipe) tenureYears: number,
  ): Promise<LeaveBalanceResponseDto> {
    return this.leaveBalanceService.initializeForNewYear(adminId, year, tenureYears);
  }
}

/**
 * Employee Leave Controller (Phase 5.3)
 * Endpoints for employees to manage their own leave requests and view balance
 */

import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { EmployeeAuthGuard } from '../guards';
import { EmployeeRequest } from '../types';
import { EmployeeLeaveService } from './employee-leave.service';
import {
  CreateLeaveDto,
  SubmitLeaveDto,
  CancelLeaveDto,
  LeaveResponseDto,
} from '../../leave/dto/leave.dto';
import { LeaveBalanceResponseDto } from '../../leave/dto/leave-balance.dto';

@ApiTags('Employee Leave')
@ApiBearerAuth()
@Controller('employee/leave')
@UseGuards(EmployeeAuthGuard)
export class EmployeeLeaveController {
  constructor(private readonly employeeLeaveService: EmployeeLeaveService) {}

  /**
   * Create leave request (DRAFT)
   * POST /employee/leave/requests
   */
  @Post('requests')
  @ApiOperation({
    summary: 'Create leave request',
    description: 'Employee creates a new leave request in DRAFT status',
  })
  @ApiOkResponse({ type: LeaveResponseDto })
  async createLeaveRequest(
    @Req() req: EmployeeRequest,
    @Body() dto: CreateLeaveDto,
  ): Promise<LeaveResponseDto> {
    return this.employeeLeaveService.createLeaveRequest(req.employee.sub, dto);
  }

  /**
   * Submit leave request for approval
   * POST /employee/leave/requests/:id/submit
   */
  @Post('requests/:id/submit')
  @ApiOperation({
    summary: 'Submit leave request',
    description: 'Employee submits leave request for approval (DRAFT -> PENDING)',
  })
  @ApiParam({ name: 'id', description: 'Leave request ID' })
  @ApiOkResponse({ type: LeaveResponseDto })
  async submitLeaveRequest(
    @Req() req: EmployeeRequest,
    @Param('id') leaveId: string,
    @Body() dto: SubmitLeaveDto,
  ): Promise<LeaveResponseDto> {
    return this.employeeLeaveService.submitLeaveRequest(req.employee.sub, leaveId, dto);
  }

  /**
   * Cancel leave request
   * POST /employee/leave/requests/:id/cancel
   */
  @Post('requests/:id/cancel')
  @ApiOperation({
    summary: 'Cancel leave request',
    description: 'Employee cancels their own leave request',
  })
  @ApiParam({ name: 'id', description: 'Leave request ID' })
  @ApiOkResponse({ type: LeaveResponseDto })
  async cancelLeaveRequest(
    @Req() req: EmployeeRequest,
    @Param('id') leaveId: string,
    @Body() dto: CancelLeaveDto,
  ): Promise<LeaveResponseDto> {
    return this.employeeLeaveService.cancelLeaveRequest(req.employee.sub, leaveId, dto);
  }

  /**
   * Get own leave requests
   * GET /employee/leave/requests/me
   */
  @Get('requests/me')
  @ApiOperation({
    summary: 'Get own leave requests',
    description: 'Employee can view their own leave requests',
  })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  async getMyLeaveRequests(
    @Req() req: EmployeeRequest,
    @Query('startDate') startDate?: Date,
    @Query('endDate') endDate?: Date,
    @Query('status') status?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number = 20,
  ): Promise<{ data: LeaveResponseDto[]; total: number }> {
    return this.employeeLeaveService.getMyLeaveRequests(
      req.employee.sub,
      startDate,
      endDate,
      status,
      page,
      limit,
    );
  }

  /**
   * Get leave request by ID
   * GET /employee/leave/requests/:id
   */
  @Get('requests/:id')
  @ApiOperation({
    summary: 'Get leave request by ID',
    description: 'Employee can view a specific leave request',
  })
  @ApiParam({ name: 'id', description: 'Leave request ID' })
  @ApiOkResponse({ type: LeaveResponseDto })
  async getLeaveRequest(@Param('id') leaveId: string): Promise<LeaveResponseDto> {
    return this.employeeLeaveService.getLeaveRequest(leaveId);
  }

  /**
   * Get own leave balance (current year)
   * GET /employee/leave/balance/me
   */
  @Get('balance/me')
  @ApiOperation({
    summary: 'Get own leave balance',
    description: 'Employee can view their own leave balance for current year',
  })
  @ApiOkResponse({ type: LeaveBalanceResponseDto })
  async getMyLeaveBalance(@Req() req: EmployeeRequest): Promise<LeaveBalanceResponseDto> {
    return this.employeeLeaveService.getMyLeaveBalance(req.employee.sub);
  }

  /**
   * Get own leave balance for specific year
   * GET /employee/leave/balance/me/:year
   */
  @Get('balance/me/:year')
  @ApiOperation({
    summary: 'Get own leave balance by year',
    description: 'Employee can view their own leave balance for a specific year',
  })
  @ApiParam({ name: 'year', description: 'Year', example: 2026 })
  @ApiOkResponse({ type: LeaveBalanceResponseDto })
  async getMyLeaveBalanceByYear(
    @Req() req: EmployeeRequest,
    @Param('year', ParseIntPipe) year: number,
  ): Promise<LeaveBalanceResponseDto> {
    return this.employeeLeaveService.getMyLeaveBalanceByYear(req.employee.sub, year);
  }
}

/**
 * Employee Leave Service (Phase 5.3)
 * Allows employees to submit leave requests and view their own leave balance
 */

import { Injectable } from '@nestjs/common';
import { LeaveService } from '../../leave/services/leave.service';
import { LeaveBalanceService } from '../../leave/services/leave-balance.service';
import {
  CreateLeaveDto,
  SubmitLeaveDto,
  CancelLeaveDto,
  LeaveResponseDto,
} from '../../leave/dto/leave.dto';
import { LeaveBalanceResponseDto } from '../../leave/dto/leave-balance.dto';

@Injectable()
export class EmployeeLeaveService {
  constructor(
    private readonly leaveService: LeaveService,
    private readonly leaveBalanceService: LeaveBalanceService,
  ) {}

  /**
   * Create leave request (DRAFT status)
   * @param employeeId The ID of the employee (from JWT)
   * @param dto Leave request data
   */
  async createLeaveRequest(employeeId: string, dto: CreateLeaveDto): Promise<LeaveResponseDto> {
    return this.leaveService.create(employeeId, dto);
  }

  /**
   * Submit leave request for approval (DRAFT -> PENDING)
   * @param employeeId The ID of the employee (from JWT)
   * @param leaveId Leave request ID
   * @param dto Submit data (approvers)
   */
  async submitLeaveRequest(
    employeeId: string,
    leaveId: string,
    dto: SubmitLeaveDto,
  ): Promise<LeaveResponseDto> {
    return this.leaveService.submit(leaveId, employeeId, dto);
  }

  /**
   * Cancel own leave request
   * @param employeeId The ID of the employee (from JWT)
   * @param leaveId Leave request ID
   * @param dto Cancel data (reason)
   */
  async cancelLeaveRequest(
    employeeId: string,
    leaveId: string,
    dto: CancelLeaveDto,
  ): Promise<LeaveResponseDto> {
    return this.leaveService.cancel(leaveId, employeeId, dto);
  }

  /**
   * Get own leave requests
   * @param employeeId The ID of the employee (from JWT)
   * @param startDate Start date filter
   * @param endDate End date filter
   * @param status Status filter
   * @param page Page number
   * @param limit Items per page
   */
  async getMyLeaveRequests(
    employeeId: string,
    startDate?: Date,
    endDate?: Date,
    status?: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: LeaveResponseDto[]; total: number }> {
    return this.leaveService.list({
      adminId: employeeId,
      startDate,
      endDate,
      status,
      page,
      limit,
    });
  }

  /**
   * Get own leave request by ID
   * @param leaveId Leave request ID
   */
  async getLeaveRequest(leaveId: string): Promise<LeaveResponseDto> {
    return this.leaveService.findOne(leaveId);
  }

  /**
   * Get own leave balance
   * @param employeeId The ID of the employee (from JWT)
   */
  async getMyLeaveBalance(employeeId: string): Promise<LeaveBalanceResponseDto> {
    return this.leaveBalanceService.getCurrentBalance(employeeId);
  }

  /**
   * Get own leave balance for a specific year
   * @param employeeId The ID of the employee (from JWT)
   * @param year Year to query
   */
  async getMyLeaveBalanceByYear(
    employeeId: string,
    year: number,
  ): Promise<LeaveBalanceResponseDto> {
    return this.leaveBalanceService.getBalance(employeeId, year);
  }
}

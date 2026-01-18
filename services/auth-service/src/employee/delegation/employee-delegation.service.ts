/**
 * Employee Delegation Service (Phase 5.4)
 * Allows employees to view delegations assigned TO them (read-only)
 */

import { Injectable } from '@nestjs/common';
import { DelegationService } from '../../delegation/services/delegation.service';
import { DelegationResponseDto } from '../../delegation/dto/delegation.dto';

@Injectable()
export class EmployeeDelegationService {
  constructor(private readonly delegationService: DelegationService) {}

  /**
   * Get delegations received by the employee (delegations assigned TO them)
   * @param employeeId The ID of the employee (from JWT)
   * @param status Status filter
   * @param page Page number
   * @param limit Items per page
   */
  async getReceivedDelegations(
    employeeId: string,
    status?: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: DelegationResponseDto[]; total: number }> {
    return this.delegationService.findAll({
      delegateId: employeeId,
      status,
      page,
      limit,
    });
  }

  /**
   * Get delegation by ID
   * @param delegationId Delegation ID
   */
  async getDelegation(delegationId: string): Promise<DelegationResponseDto> {
    return this.delegationService.findById(delegationId);
  }
}

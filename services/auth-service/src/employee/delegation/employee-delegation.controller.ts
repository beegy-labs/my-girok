/**
 * Employee Delegation Controller (Phase 5.4)
 * Endpoints for employees to view delegations assigned to them (read-only)
 */

import {
  Controller,
  Get,
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
import { EmployeeDelegationService } from './employee-delegation.service';
import { DelegationResponseDto } from '../../delegation/dto/delegation.dto';

@ApiTags('Employee Delegation')
@ApiBearerAuth()
@Controller('employee/delegations')
@UseGuards(EmployeeAuthGuard)
export class EmployeeDelegationController {
  constructor(private readonly employeeDelegationService: EmployeeDelegationService) {}

  /**
   * Get received delegations (delegations assigned TO the employee)
   * GET /employee/delegations/received
   */
  @Get('received')
  @ApiOperation({
    summary: 'Get received delegations',
    description: 'Employee can view delegations assigned to them (read-only)',
  })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  async getReceivedDelegations(
    @Req() req: EmployeeRequest,
    @Query('status') status?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number = 20,
  ): Promise<{ data: DelegationResponseDto[]; total: number }> {
    return this.employeeDelegationService.getReceivedDelegations(
      req.employee.sub,
      status,
      page,
      limit,
    );
  }

  /**
   * Get delegation by ID
   * GET /employee/delegations/received/:id
   */
  @Get('received/:id')
  @ApiOperation({
    summary: 'Get delegation by ID',
    description: 'Employee can view a specific delegation',
  })
  @ApiParam({ name: 'id', description: 'Delegation ID' })
  @ApiOkResponse({ type: DelegationResponseDto })
  async getDelegation(@Param('id') delegationId: string): Promise<DelegationResponseDto> {
    return this.employeeDelegationService.getDelegation(delegationId);
  }
}

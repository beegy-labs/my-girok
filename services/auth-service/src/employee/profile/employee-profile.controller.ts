/**
 * Employee Profile Controller (Phase 5.1)
 * Endpoints for employees to view/update their own profile
 */

import { Controller, Get, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { EmployeeAuthGuard } from '../guards';
import { EmployeeRequest } from '../types';
import { EmployeeProfileService } from './employee-profile.service';
import { UpdateEmployeeProfileDto } from './dto';
import { AdminDetailResponse } from '../../admin/dto';

@ApiTags('Employee Profile')
@ApiBearerAuth()
@Controller('employee/profile')
@UseGuards(EmployeeAuthGuard)
export class EmployeeProfileController {
  constructor(private readonly employeeProfileService: EmployeeProfileService) {}

  /**
   * Get own profile
   * GET /employee/profile/me
   */
  @Get('me')
  @ApiOperation({
    summary: 'Get own profile',
    description: 'Employee can view their own complete profile',
  })
  @ApiOkResponse({ type: AdminDetailResponse })
  async getMyProfile(@Req() req: EmployeeRequest): Promise<AdminDetailResponse> {
    return this.employeeProfileService.getMyProfile(req.employee.sub);
  }

  /**
   * Update own profile (limited fields)
   * PATCH /employee/profile/me
   */
  @Patch('me')
  @ApiOperation({
    summary: 'Update own profile',
    description: 'Employee can update limited fields: display name, contact info, preferences',
  })
  @ApiOkResponse({ type: AdminDetailResponse })
  async updateMyProfile(
    @Req() req: EmployeeRequest,
    @Body() dto: UpdateEmployeeProfileDto,
  ): Promise<AdminDetailResponse> {
    return this.employeeProfileService.updateMyProfile(req.employee.sub, dto);
  }
}

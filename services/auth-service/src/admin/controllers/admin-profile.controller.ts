/**
 * Admin Profile Controller (Phase 2)
 * API endpoints for SCIM 2.0 Core + Employee + Job & Organization + JML + Contact
 */

import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdminProfileService } from '../services';
import { AdminAuthGuard } from '../guards/admin-auth.guard';
import { CurrentAdmin } from '../decorators/current-admin.decorator';
import { AdminPayload } from '../types/admin.types';
import {
  UpdateScimCoreDto,
  UpdateEmployeeInfoDto,
  UpdateJobOrganizationDto,
  UpdatePartnerInfoDto,
  UpdateJoinerInfoDto,
  UpdateMoverInfoDto,
  UpdateLeaverInfoDto,
  UpdateContactInfoDto,
  UpdateAdminProfileDto,
  AdminDetailResponse,
} from '../dto';

@Controller('admin/profile')
@UseGuards(AdminAuthGuard)
export class AdminProfileController {
  constructor(private readonly adminProfileService: AdminProfileService) {}

  /**
   * Get admin detail (self)
   * GET /admin/profile/me
   */
  @Get('me')
  async getMyProfile(@CurrentAdmin() admin: AdminPayload): Promise<AdminDetailResponse> {
    return this.adminProfileService.getAdminDetail(admin.sub);
  }

  /**
   * Get admin detail by ID
   * GET /admin/profile/:id
   */
  @Get(':id')
  async getAdminProfile(@Param('id') id: string): Promise<AdminDetailResponse> {
    return this.adminProfileService.getAdminDetail(id);
  }

  /**
   * Update SCIM Core attributes
   * PATCH /admin/profile/:id/scim
   */
  @Patch(':id/scim')
  @HttpCode(HttpStatus.OK)
  async updateScimCore(
    @Param('id') id: string,
    @Body() dto: UpdateScimCoreDto,
  ): Promise<AdminDetailResponse> {
    return this.adminProfileService.updateScimCore(id, dto);
  }

  /**
   * Update Employee Info
   * PATCH /admin/profile/:id/employee
   */
  @Patch(':id/employee')
  @HttpCode(HttpStatus.OK)
  async updateEmployeeInfo(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeInfoDto,
  ): Promise<AdminDetailResponse> {
    return this.adminProfileService.updateEmployeeInfo(id, dto);
  }

  /**
   * Update Job & Organization
   * PATCH /admin/profile/:id/job
   */
  @Patch(':id/job')
  @HttpCode(HttpStatus.OK)
  async updateJobOrganization(
    @Param('id') id: string,
    @Body() dto: UpdateJobOrganizationDto,
  ): Promise<AdminDetailResponse> {
    return this.adminProfileService.updateJobOrganization(id, dto);
  }

  /**
   * Update Partner Info
   * PATCH /admin/profile/:id/partner
   */
  @Patch(':id/partner')
  @HttpCode(HttpStatus.OK)
  async updatePartnerInfo(
    @Param('id') id: string,
    @Body() dto: UpdatePartnerInfoDto,
  ): Promise<AdminDetailResponse> {
    return this.adminProfileService.updatePartnerInfo(id, dto);
  }

  /**
   * Update Joiner Info
   * PATCH /admin/profile/:id/joiner
   */
  @Patch(':id/joiner')
  @HttpCode(HttpStatus.OK)
  async updateJoinerInfo(
    @Param('id') id: string,
    @Body() dto: UpdateJoinerInfoDto,
  ): Promise<AdminDetailResponse> {
    return this.adminProfileService.updateJoinerInfo(id, dto);
  }

  /**
   * Update Mover Info
   * PATCH /admin/profile/:id/mover
   */
  @Patch(':id/mover')
  @HttpCode(HttpStatus.OK)
  async updateMoverInfo(
    @Param('id') id: string,
    @Body() dto: UpdateMoverInfoDto,
  ): Promise<AdminDetailResponse> {
    return this.adminProfileService.updateMoverInfo(id, dto);
  }

  /**
   * Update Leaver Info
   * PATCH /admin/profile/:id/leaver
   */
  @Patch(':id/leaver')
  @HttpCode(HttpStatus.OK)
  async updateLeaverInfo(
    @Param('id') id: string,
    @Body() dto: UpdateLeaverInfoDto,
  ): Promise<AdminDetailResponse> {
    return this.adminProfileService.updateLeaverInfo(id, dto);
  }

  /**
   * Update Contact Info
   * PATCH /admin/profile/:id/contact
   */
  @Patch(':id/contact')
  @HttpCode(HttpStatus.OK)
  async updateContactInfo(
    @Param('id') id: string,
    @Body() dto: UpdateContactInfoDto,
  ): Promise<AdminDetailResponse> {
    return this.adminProfileService.updateContactInfo(id, dto);
  }

  /**
   * Update complete profile (all sections)
   * PATCH /admin/profile/:id
   */
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @Param('id') id: string,
    @Body() dto: UpdateAdminProfileDto,
  ): Promise<AdminDetailResponse> {
    return this.adminProfileService.updateProfile(id, dto);
  }
}

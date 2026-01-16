/**
 * Admin Enterprise Controller (Phase 2)
 * API endpoints for NHI + Location + Access Control + Identity Verification + Extensions
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdminEnterpriseService } from '../services';
import { AdminAuthGuard } from '../guards/admin-auth.guard';
import { CurrentAdmin } from '../decorators/current-admin.decorator';
import { AdminPayload } from '../types/admin.types';
import {
  CreateNhiDto,
  UpdateNhiAttributesDto,
  UpdatePhysicalLocationDto,
  UpdateTaxLegalLocationDto,
  UpdateAccessControlDto,
  UpdateIdentityVerificationDto,
  VerifyAdminIdentityDto,
  UpdateExtensionAttributesDto,
  UpdateAdminEnterpriseDto,
  AdminListQueryDto,
  AdminDetailResponse,
} from '../dto';

@Controller('admin/enterprise')
@UseGuards(AdminAuthGuard)
export class AdminEnterpriseController {
  constructor(private readonly adminEnterpriseService: AdminEnterpriseService) {}

  /**
   * List/Search Admins with Phase 2 filters
   * GET /admin/enterprise/list
   */
  @Get('list')
  async listAdmins(@Query() query: AdminListQueryDto) {
    return this.adminEnterpriseService.listAdmins(query);
  }

  // ========== NHI Management ==========

  /**
   * Create Non-Human Identity
   * POST /admin/enterprise/nhi
   */
  @Post('nhi')
  @HttpCode(HttpStatus.CREATED)
  async createNhi(
    @Body() dto: CreateNhiDto,
    @CurrentAdmin() admin: AdminPayload,
  ): Promise<AdminDetailResponse> {
    return this.adminEnterpriseService.createNhi(dto, admin.sub);
  }

  /**
   * Update NHI attributes
   * PATCH /admin/enterprise/:id/nhi
   */
  @Patch(':id/nhi')
  @HttpCode(HttpStatus.OK)
  async updateNhiAttributes(
    @Param('id') id: string,
    @Body() dto: UpdateNhiAttributesDto,
  ): Promise<AdminDetailResponse> {
    return this.adminEnterpriseService.updateNhiAttributes(id, dto);
  }

  /**
   * Rotate NHI credentials
   * POST /admin/enterprise/:id/nhi/rotate
   */
  @Post(':id/nhi/rotate')
  @HttpCode(HttpStatus.OK)
  async rotateNhiCredentials(@Param('id') id: string): Promise<{ rotatedAt: Date }> {
    return this.adminEnterpriseService.rotateNhiCredentials(id);
  }

  // ========== Location Management ==========

  /**
   * Update Physical Location
   * PATCH /admin/enterprise/:id/location/physical
   */
  @Patch(':id/location/physical')
  @HttpCode(HttpStatus.OK)
  async updatePhysicalLocation(
    @Param('id') id: string,
    @Body() dto: UpdatePhysicalLocationDto,
  ): Promise<AdminDetailResponse> {
    return this.adminEnterpriseService.updatePhysicalLocation(id, dto);
  }

  /**
   * Update Tax & Legal Location
   * PATCH /admin/enterprise/:id/location/tax-legal
   */
  @Patch(':id/location/tax-legal')
  @HttpCode(HttpStatus.OK)
  async updateTaxLegalLocation(
    @Param('id') id: string,
    @Body() dto: UpdateTaxLegalLocationDto,
  ): Promise<AdminDetailResponse> {
    return this.adminEnterpriseService.updateTaxLegalLocation(id, dto);
  }

  // ========== Access Control ==========

  /**
   * Update Access Control
   * PATCH /admin/enterprise/:id/access-control
   */
  @Patch(':id/access-control')
  @HttpCode(HttpStatus.OK)
  async updateAccessControl(
    @Param('id') id: string,
    @Body() dto: UpdateAccessControlDto,
  ): Promise<AdminDetailResponse> {
    return this.adminEnterpriseService.updateAccessControl(id, dto);
  }

  // ========== Identity Verification ==========

  /**
   * Update Identity Verification
   * PATCH /admin/enterprise/:id/identity-verification
   */
  @Patch(':id/identity-verification')
  @HttpCode(HttpStatus.OK)
  async updateIdentityVerification(
    @Param('id') id: string,
    @Body() dto: UpdateIdentityVerificationDto,
  ): Promise<AdminDetailResponse> {
    return this.adminEnterpriseService.updateIdentityVerification(id, dto);
  }

  /**
   * Verify Admin Identity (sets verified flag)
   * POST /admin/enterprise/:id/verify
   */
  @Post(':id/verify')
  @HttpCode(HttpStatus.OK)
  async verifyIdentity(
    @Param('id') id: string,
    @Body() dto: VerifyAdminIdentityDto,
    @CurrentAdmin() admin: AdminPayload,
  ): Promise<AdminDetailResponse> {
    return this.adminEnterpriseService.verifyIdentity(id, dto, admin.sub);
  }

  // ========== JSONB Extensions ==========

  /**
   * Update JSONB Extension Attributes
   * PATCH /admin/enterprise/:id/extensions
   */
  @Patch(':id/extensions')
  @HttpCode(HttpStatus.OK)
  async updateExtensions(
    @Param('id') id: string,
    @Body() dto: UpdateExtensionAttributesDto,
  ): Promise<AdminDetailResponse> {
    return this.adminEnterpriseService.updateExtensions(id, dto);
  }

  // ========== Bulk Update ==========

  /**
   * Update complete enterprise attributes (all sections)
   * PATCH /admin/enterprise/:id
   */
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async updateEnterprise(
    @Param('id') id: string,
    @Body() dto: UpdateAdminEnterpriseDto,
  ): Promise<AdminDetailResponse> {
    return this.adminEnterpriseService.updateEnterprise(id, dto);
  }
}

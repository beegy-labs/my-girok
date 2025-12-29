import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ServiceFeatureService } from '../services/service-feature.service';
import { AdminPayload } from '../types/admin.types';
import {
  CreateServiceFeatureDto,
  UpdateServiceFeatureDto,
  BulkFeatureOperationDto,
  CreateFeaturePermissionDto,
  ListFeaturesQueryDto,
  ServiceFeatureResponseDto,
  FeaturePermissionResponseDto,
  ServiceFeatureListResponseDto,
} from '../dto/service-feature.dto';
import { Permissions } from '../decorators/permissions.decorator';
import { PermissionGuard } from '../guards/permission.guard';
import { CurrentAdmin } from '../decorators/current-admin.decorator';

@Controller('admin/services/:serviceId/features')
@UseGuards(PermissionGuard)
export class ServiceFeatureController {
  constructor(private readonly featureService: ServiceFeatureService) {}

  // ============================================================
  // FEATURE CRUD
  // ============================================================

  /**
   * List features for a service
   * GET /v1/admin/services/:serviceId/features
   */
  @Get()
  @Permissions('service:read')
  async listFeatures(
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Query() query: ListFeaturesQueryDto,
  ): Promise<ServiceFeatureListResponseDto> {
    return this.featureService.list(serviceId, {
      category: query.category,
      includeInactive: query.includeInactive === true,
      includeChildren: query.includeChildren !== false,
    });
  }

  /**
   * Get a single feature
   * GET /v1/admin/services/:serviceId/features/:id
   */
  @Get(':id')
  @Permissions('service:read')
  async getFeature(
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ServiceFeatureResponseDto> {
    return this.featureService.findOne(serviceId, id);
  }

  /**
   * Create a feature
   * POST /v1/admin/services/:serviceId/features
   */
  @Post()
  @Permissions('service:update')
  @HttpCode(HttpStatus.CREATED)
  async createFeature(
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Body() dto: CreateServiceFeatureDto,
    @CurrentAdmin() admin: AdminPayload,
  ): Promise<ServiceFeatureResponseDto> {
    return this.featureService.create(serviceId, dto, admin);
  }

  /**
   * Update a feature
   * PATCH /v1/admin/services/:serviceId/features/:id
   */
  @Patch(':id')
  @Permissions('service:update')
  async updateFeature(
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServiceFeatureDto,
    @CurrentAdmin() admin: AdminPayload,
  ): Promise<ServiceFeatureResponseDto> {
    return this.featureService.update(serviceId, id, dto, admin);
  }

  /**
   * Delete a feature
   * DELETE /v1/admin/services/:serviceId/features/:id
   */
  @Delete(':id')
  @Permissions('service:update')
  @HttpCode(HttpStatus.OK)
  async deleteFeature(
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAdmin() admin: AdminPayload,
  ): Promise<{ success: boolean }> {
    return this.featureService.delete(serviceId, id, admin);
  }

  /**
   * Bulk operations on features
   * POST /v1/admin/services/:serviceId/features/bulk
   */
  @Post('bulk')
  @Permissions('service:update')
  async bulkOperation(
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Body() dto: BulkFeatureOperationDto,
    @CurrentAdmin() admin: AdminPayload,
  ): Promise<ServiceFeatureListResponseDto> {
    return this.featureService.bulk(serviceId, dto, admin);
  }

  // ============================================================
  // PERMISSION MANAGEMENT
  // ============================================================

  /**
   * List permissions for a feature
   * GET /v1/admin/services/:serviceId/features/:id/permissions
   */
  @Get(':id/permissions')
  @Permissions('service:read')
  async listPermissions(
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Param('id', ParseUUIDPipe) featureId: string,
  ): Promise<FeaturePermissionResponseDto[]> {
    // Verify feature belongs to service
    await this.featureService.findOne(serviceId, featureId);
    return this.featureService.listPermissions(featureId);
  }

  /**
   * Create a permission for a feature
   * POST /v1/admin/services/:serviceId/features/:id/permissions
   */
  @Post(':id/permissions')
  @Permissions('service:update')
  @HttpCode(HttpStatus.CREATED)
  async createPermission(
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Param('id', ParseUUIDPipe) featureId: string,
    @Body() dto: CreateFeaturePermissionDto,
    @CurrentAdmin() admin: AdminPayload,
  ): Promise<FeaturePermissionResponseDto> {
    return this.featureService.createPermission(serviceId, featureId, dto, admin);
  }

  /**
   * Delete a permission
   * DELETE /v1/admin/services/:serviceId/features/:id/permissions/:permId
   */
  @Delete(':id/permissions/:permId')
  @Permissions('service:update')
  @HttpCode(HttpStatus.OK)
  async deletePermission(
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Param('id', ParseUUIDPipe) featureId: string,
    @Param('permId', ParseUUIDPipe) permId: string,
    @CurrentAdmin() admin: AdminPayload,
  ): Promise<{ success: boolean }> {
    // Verify feature belongs to service
    await this.featureService.findOne(serviceId, featureId);
    return this.featureService.deletePermission(serviceId, permId, admin);
  }
}

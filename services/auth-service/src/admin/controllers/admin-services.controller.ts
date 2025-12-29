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
import { AdminServicesService } from '../services/admin-services.service';
import {
  ServiceQueryDto,
  ServiceResponse,
  ServiceListResponse,
  ConsentRequirementQueryDto,
  CreateConsentRequirementDto,
  UpdateConsentRequirementDto,
  ConsentRequirementResponse,
  ConsentRequirementListResponse,
  BulkUpdateConsentRequirementsDto,
} from '../dto/admin-services.dto';
import { Permissions } from '../decorators/permissions.decorator';
import { PermissionGuard } from '../guards/permission.guard';

@Controller('admin/services')
@UseGuards(PermissionGuard)
export class AdminServicesController {
  constructor(private readonly adminServicesService: AdminServicesService) {}

  // ============================================================
  // SERVICES
  // ============================================================

  /**
   * List all services
   * GET /v1/admin/services
   */
  @Get()
  @Permissions('service:read')
  async listServices(@Query() query: ServiceQueryDto): Promise<ServiceListResponse> {
    return this.adminServicesService.listServices(query);
  }

  /**
   * Get service by ID
   * GET /v1/admin/services/:id
   */
  @Get(':id')
  @Permissions('service:read')
  async getService(@Param('id', ParseUUIDPipe) id: string): Promise<ServiceResponse> {
    return this.adminServicesService.getServiceById(id);
  }

  /**
   * Get service by slug
   * GET /v1/admin/services/slug/:slug
   */
  @Get('slug/:slug')
  @Permissions('service:read')
  async getServiceBySlug(@Param('slug') slug: string): Promise<ServiceResponse> {
    return this.adminServicesService.getServiceBySlug(slug);
  }

  // ============================================================
  // CONSENT REQUIREMENTS
  // ============================================================

  /**
   * List consent requirements for a service
   * GET /v1/admin/services/:serviceId/consent-requirements
   */
  @Get(':serviceId/consent-requirements')
  @Permissions('service:read')
  async listConsentRequirements(
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Query() query: ConsentRequirementQueryDto,
  ): Promise<ConsentRequirementListResponse> {
    return this.adminServicesService.listConsentRequirements(serviceId, query);
  }

  /**
   * Get a specific consent requirement
   * GET /v1/admin/services/:serviceId/consent-requirements/:id
   */
  @Get(':serviceId/consent-requirements/:id')
  @Permissions('service:read')
  async getConsentRequirement(
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ConsentRequirementResponse> {
    return this.adminServicesService.getConsentRequirement(serviceId, id);
  }

  /**
   * Create a consent requirement for a service
   * POST /v1/admin/services/:serviceId/consent-requirements
   */
  @Post(':serviceId/consent-requirements')
  @Permissions('service:update')
  @HttpCode(HttpStatus.CREATED)
  async createConsentRequirement(
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Body() dto: CreateConsentRequirementDto,
  ): Promise<ConsentRequirementResponse> {
    return this.adminServicesService.createConsentRequirement(serviceId, dto);
  }

  /**
   * Update a consent requirement
   * PATCH /v1/admin/services/:serviceId/consent-requirements/:id
   */
  @Patch(':serviceId/consent-requirements/:id')
  @Permissions('service:update')
  async updateConsentRequirement(
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateConsentRequirementDto,
  ): Promise<ConsentRequirementResponse> {
    return this.adminServicesService.updateConsentRequirement(serviceId, id, dto);
  }

  /**
   * Delete a consent requirement
   * DELETE /v1/admin/services/:serviceId/consent-requirements/:id
   */
  @Delete(':serviceId/consent-requirements/:id')
  @Permissions('service:update')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteConsentRequirement(
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.adminServicesService.deleteConsentRequirement(serviceId, id);
  }

  /**
   * Bulk update consent requirements for a service and country
   * PUT /v1/admin/services/:serviceId/consent-requirements/bulk
   */
  @Post(':serviceId/consent-requirements/bulk')
  @Permissions('service:update')
  async bulkUpdateConsentRequirements(
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Body() dto: BulkUpdateConsentRequirementsDto,
  ): Promise<ConsentRequirementListResponse> {
    return this.adminServicesService.bulkUpdateConsentRequirements(serviceId, dto);
  }
}

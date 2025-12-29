import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ServiceConfigService } from '../services/service-config.service';
import { AdminPayload } from '../types/admin.types';
import {
  AddDomainDto,
  DomainResponseDto,
  UpdateServiceConfigDto,
  ServiceConfigResponseDto,
} from '../dto/service-config.dto';
import { Permissions } from '../decorators/permissions.decorator';
import { PermissionGuard } from '../guards/permission.guard';
import { CurrentAdmin } from '../decorators/current-admin.decorator';

@Controller('admin/services/:serviceId')
@UseGuards(PermissionGuard)
export class ServiceConfigController {
  constructor(private readonly configService: ServiceConfigService) {}

  // ============================================================
  // DOMAIN MANAGEMENT
  // ============================================================

  /**
   * Get service domains
   * GET /v1/admin/services/:serviceId/domains
   */
  @Get('domains')
  @Permissions('service:read')
  async getDomains(
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
  ): Promise<DomainResponseDto> {
    return this.configService.getDomains(serviceId);
  }

  /**
   * Add a domain to service
   * POST /v1/admin/services/:serviceId/domains
   */
  @Post('domains')
  @Permissions('service:update')
  @HttpCode(HttpStatus.CREATED)
  async addDomain(
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Body() dto: AddDomainDto,
    @CurrentAdmin() admin: AdminPayload,
  ): Promise<DomainResponseDto> {
    return this.configService.addDomain(serviceId, dto, admin);
  }

  /**
   * Remove a domain from service
   * DELETE /v1/admin/services/:serviceId/domains/:domain
   */
  @Delete('domains/:domain')
  @Permissions('service:update')
  @HttpCode(HttpStatus.OK)
  async removeDomain(
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Param('domain') domain: string,
    @CurrentAdmin() admin: AdminPayload,
  ): Promise<DomainResponseDto> {
    return this.configService.removeDomain(serviceId, domain, admin);
  }

  // ============================================================
  // CONFIG MANAGEMENT
  // ============================================================

  /**
   * Get service configuration
   * GET /v1/admin/services/:serviceId/config
   */
  @Get('config')
  @Permissions('service:read')
  async getConfig(
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
  ): Promise<ServiceConfigResponseDto> {
    return this.configService.getConfig(serviceId);
  }

  /**
   * Update service configuration
   * PATCH /v1/admin/services/:serviceId/config
   */
  @Patch('config')
  @Permissions('service:update')
  async updateConfig(
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Body() dto: UpdateServiceConfigDto,
    @CurrentAdmin() admin: AdminPayload,
  ): Promise<ServiceConfigResponseDto> {
    return this.configService.updateConfig(serviceId, dto, admin);
  }
}

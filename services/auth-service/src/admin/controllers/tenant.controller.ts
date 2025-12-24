import { Controller, Get, Post, Put, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { TenantService } from '../services/tenant.service';
import {
  CreateTenantDto,
  UpdateTenantDto,
  UpdateTenantStatusDto,
  TenantListQuery,
  TenantResponse,
  TenantListResponse,
} from '../dto/tenant.dto';
import { AdminAuthGuard } from '../guards/admin-auth.guard';
import { PermissionGuard } from '../guards/permission.guard';
import { Permissions } from '../decorators/permissions.decorator';
import { CurrentAdmin } from '../decorators/current-admin.decorator';
import { AdminPayload } from '../types/admin.types';

@Controller('admin/tenants')
@UseGuards(AdminAuthGuard, PermissionGuard)
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  /**
   * List all tenants (System Admin only)
   * GET /v1/admin/tenants
   */
  @Get()
  @Permissions('tenant:read')
  async list(@Query() query: TenantListQuery): Promise<TenantListResponse> {
    return this.tenantService.list(query);
  }

  /**
   * Get tenant by ID (System Admin only)
   * GET /v1/admin/tenants/:id
   */
  @Get(':id')
  @Permissions('tenant:read')
  async findById(@Param('id') id: string): Promise<TenantResponse> {
    return this.tenantService.findById(id);
  }

  /**
   * Create new tenant (System Admin only)
   * POST /v1/admin/tenants
   */
  @Post()
  @Permissions('tenant:create')
  async create(@Body() dto: CreateTenantDto): Promise<TenantResponse> {
    return this.tenantService.create(dto);
  }

  /**
   * Update tenant (System Admin only)
   * PUT /v1/admin/tenants/:id
   */
  @Put(':id')
  @Permissions('tenant:update')
  async update(@Param('id') id: string, @Body() dto: UpdateTenantDto): Promise<TenantResponse> {
    return this.tenantService.update(id, dto);
  }

  /**
   * Update tenant status (approve, suspend, terminate)
   * PATCH /v1/admin/tenants/:id/status
   */
  @Patch(':id/status')
  @Permissions('tenant:approve')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTenantStatusDto,
    @CurrentAdmin() admin: AdminPayload,
  ): Promise<TenantResponse> {
    return this.tenantService.updateStatus(id, dto, admin);
  }

  /**
   * Get current admin's tenant (Tenant Admin)
   * GET /v1/admin/tenants/me
   */
  @Get('me')
  async getMyTenant(@CurrentAdmin() admin: AdminPayload): Promise<TenantResponse> {
    if (!admin.tenantId) {
      throw new Error('No tenant associated with this admin');
    }
    return this.tenantService.getMyTenant(admin.tenantId);
  }

  /**
   * Update current admin's tenant settings (Tenant Admin)
   * PUT /v1/admin/tenants/me
   */
  @Put('me')
  async updateMyTenant(
    @CurrentAdmin() admin: AdminPayload,
    @Body() dto: UpdateTenantDto,
  ): Promise<TenantResponse> {
    if (!admin.tenantId) {
      throw new Error('No tenant associated with this admin');
    }
    return this.tenantService.updateMyTenant(admin.tenantId, dto);
  }
}

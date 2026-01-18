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
import { AdminAccountService } from '../services/admin-account.service';
import {
  CreateAdminDto,
  InviteAdminDto,
  UpdateAdminDto,
  AssignRoleDto,
  AdminResponse,
  AdminDetailResponse,
  AdminListResponse,
  InvitationResponse,
  AdminListQueryDto,
} from '../dto/admin-account.dto';
import { CurrentAdmin } from '../decorators/current-admin.decorator';
import { Permissions } from '../decorators/permissions.decorator';
import { PermissionGuard } from '../guards/permission.guard';
import { AdminPayload } from '../types/admin.types';

@Controller('admin/admins')
@UseGuards(PermissionGuard)
export class AdminAccountController {
  constructor(private readonly adminAccountService: AdminAccountService) {}

  /**
   * Create a new system admin
   * POST /v1/admin/admins
   */
  @Post()
  @Permissions('system_admin:create')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentAdmin() admin: AdminPayload,
    @Body() dto: CreateAdminDto,
  ): Promise<AdminResponse> {
    return this.adminAccountService.create(admin.sub, dto);
  }

  /**
   * Invite an admin
   * POST /v1/admin/admins/invite
   */
  @Post('invite')
  @Permissions('system_admin:create')
  @HttpCode(HttpStatus.CREATED)
  async invite(
    @CurrentAdmin() admin: AdminPayload,
    @Body() dto: InviteAdminDto,
  ): Promise<InvitationResponse> {
    return this.adminAccountService.invite(admin.sub, dto);
  }

  /**
   * List admins with filters and pagination
   * GET /v1/admin/admins
   */
  @Get()
  @Permissions('system_admin:read')
  async findAll(@Query() query: AdminListQueryDto): Promise<AdminListResponse> {
    return this.adminAccountService.findAll(query);
  }

  /**
   * Get admin by ID
   * GET /v1/admin/admins/:id
   */
  @Get(':id')
  @Permissions('system_admin:read')
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<AdminDetailResponse> {
    return this.adminAccountService.findById(id);
  }

  /**
   * Update admin
   * PATCH /v1/admin/admins/:id
   */
  @Patch(':id')
  @Permissions('system_admin:update')
  async update(
    @CurrentAdmin() admin: AdminPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdminDto,
  ): Promise<AdminResponse> {
    return this.adminAccountService.update(admin.sub, id, dto);
  }

  /**
   * Deactivate admin
   * DELETE /v1/admin/admins/:id
   */
  @Delete(':id')
  @Permissions('system_admin:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivate(
    @CurrentAdmin() admin: AdminPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.adminAccountService.deactivate(admin.sub, id);
  }

  /**
   * Reactivate admin
   * POST /v1/admin/admins/:id/reactivate
   */
  @Post(':id/reactivate')
  @Permissions('system_admin:update')
  async reactivate(
    @CurrentAdmin() admin: AdminPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AdminResponse> {
    return this.adminAccountService.reactivate(admin.sub, id);
  }

  /**
   * Assign role to admin
   * PATCH /v1/admin/admins/:id/role
   */
  @Patch(':id/role')
  @Permissions('system_admin:update')
  async assignRole(
    @CurrentAdmin() admin: AdminPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignRoleDto,
  ): Promise<AdminResponse> {
    return this.adminAccountService.assignRole(admin.sub, id, dto.roleId);
  }
}

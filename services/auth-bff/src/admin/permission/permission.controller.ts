import { Controller, Get, Post, Delete, Param, Body, ParseUUIDPipe } from '@nestjs/common';
import { AllowedAccountTypes } from '../../common/decorators/account-type.decorator';
import { AccountType } from '../../config/constants';
import { PermissionService } from './permission.service';
import { AuthorizationGrpcClient } from '../../grpc-clients/authorization.client';
import {
  GrantPermissionDto,
  RevokePermissionDto,
  GrantMenuAccessDto,
  CheckPermissionDto,
  BatchCheckPermissionDto,
  ApplyTemplateDto,
  GrantPermissionResponse,
  RevokePermissionResponse,
  AdminPermissionsResponse,
  TeamPermissionsResponse,
  MenuPermissionsResponse,
  CheckPermissionResponse,
  BatchCheckPermissionResponse,
  PermissionTemplateListResponse,
  ApplyTemplateResponse,
} from './dto/permission.dto';

@Controller('admin/permissions')
@AllowedAccountTypes(AccountType.ADMIN)
export class PermissionController {
  constructor(
    private readonly permissionService: PermissionService,
    private readonly authzClient: AuthorizationGrpcClient,
  ) {}

  // ==========================================
  // Admin Permission Assignment
  // ==========================================

  /**
   * Grant permission to an admin
   */
  @Post('admin/:adminId/grant')
  async grantToAdmin(
    @Param('adminId', ParseUUIDPipe) adminId: string,
    @Body() dto: GrantPermissionDto,
  ): Promise<GrantPermissionResponse> {
    const user = `admin:${adminId}`;
    const token = await this.authzClient.grant(user, dto.relation, dto.object);
    return {
      success: true,
      user,
      relation: dto.relation,
      object: dto.object,
      consistencyToken: token,
    };
  }

  /**
   * Revoke permission from an admin
   */
  @Delete('admin/:adminId/revoke')
  async revokeFromAdmin(
    @Param('adminId', ParseUUIDPipe) adminId: string,
    @Body() dto: RevokePermissionDto,
  ): Promise<RevokePermissionResponse> {
    const user = `admin:${adminId}`;
    const token = await this.authzClient.revoke(user, dto.relation, dto.object);
    return { success: true, consistencyToken: token };
  }

  /**
   * Get all permissions for an admin (direct + inherited)
   */
  @Get('admin/:adminId')
  async getAdminPermissions(
    @Param('adminId', ParseUUIDPipe) adminId: string,
  ): Promise<AdminPermissionsResponse> {
    const user = `admin:${adminId}`;
    const directPermissions = await this.permissionService.getPermissionsForUser(user);
    const inheritedPermissions = await this.permissionService.getInheritedPermissions(user);

    return {
      adminId,
      directPermissions,
      inheritedPermissions,
    };
  }

  // ==========================================
  // Team Permission Assignment
  // ==========================================

  @Post('team/:teamId/grant')
  async grantToTeam(
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Body() dto: GrantPermissionDto,
  ): Promise<GrantPermissionResponse> {
    const user = `team:${teamId}#member`;
    const token = await this.authzClient.grant(user, dto.relation, dto.object);
    return {
      success: true,
      user,
      relation: dto.relation,
      object: dto.object,
      consistencyToken: token,
    };
  }

  @Delete('team/:teamId/revoke')
  async revokeFromTeam(
    @Param('teamId', ParseUUIDPipe) teamId: string,
    @Body() dto: RevokePermissionDto,
  ): Promise<RevokePermissionResponse> {
    const user = `team:${teamId}#member`;
    const token = await this.authzClient.revoke(user, dto.relation, dto.object);
    return { success: true, consistencyToken: token };
  }

  @Get('team/:teamId')
  async getTeamPermissions(
    @Param('teamId', ParseUUIDPipe) teamId: string,
  ): Promise<TeamPermissionsResponse> {
    const user = `team:${teamId}#member`;
    const permissions = await this.permissionService.getPermissionsForUser(user);
    return { teamId, permissions };
  }

  // ==========================================
  // Department Permission Assignment
  // ==========================================

  @Post('department/:deptId/grant')
  async grantToDepartment(
    @Param('deptId', ParseUUIDPipe) deptId: string,
    @Body() dto: GrantPermissionDto,
  ): Promise<GrantPermissionResponse> {
    const user = `department:${deptId}#member`;
    const token = await this.authzClient.grant(user, dto.relation, dto.object);
    return {
      success: true,
      user,
      relation: dto.relation,
      object: dto.object,
      consistencyToken: token,
    };
  }

  @Delete('department/:deptId/revoke')
  async revokeFromDepartment(
    @Param('deptId', ParseUUIDPipe) deptId: string,
    @Body() dto: RevokePermissionDto,
  ): Promise<RevokePermissionResponse> {
    const user = `department:${deptId}#member`;
    const token = await this.authzClient.revoke(user, dto.relation, dto.object);
    return { success: true, consistencyToken: token };
  }

  // ==========================================
  // Menu Permission Management
  // ==========================================

  @Get('menu')
  async getMenuPermissions(): Promise<MenuPermissionsResponse> {
    const menuPermissions = await this.permissionService.getMenuPermissions();
    return { menuPermissions };
  }

  @Post('menu/:menuId/grant')
  async grantMenuAccess(
    @Param('menuId') menuId: string,
    @Body() dto: GrantMenuAccessDto,
  ): Promise<GrantPermissionResponse> {
    const object = `menu_item:${menuId}`;
    const user = this.buildUserString(dto.type, dto.id);
    const token = await this.authzClient.grant(user, 'can_view', object);
    return { success: true, user, relation: 'can_view', object, consistencyToken: token };
  }

  // ==========================================
  // Permission Check API
  // ==========================================

  @Post('check')
  async checkPermission(@Body() dto: CheckPermissionDto): Promise<CheckPermissionResponse> {
    const allowed = await this.authzClient.check(dto.user, dto.relation, dto.object);
    return { allowed, user: dto.user, relation: dto.relation, object: dto.object };
  }

  @Post('check/batch')
  async batchCheckPermissions(
    @Body() dto: BatchCheckPermissionDto,
  ): Promise<BatchCheckPermissionResponse> {
    const results = await this.authzClient.batchCheck(dto.checks);
    return {
      results: dto.checks.map((check, i) => ({
        ...check,
        allowed: results[i],
      })),
    };
  }

  // ==========================================
  // Permission Templates
  // ==========================================

  @Get('templates')
  async listTemplates(): Promise<PermissionTemplateListResponse> {
    const templates = await this.permissionService.listTemplates();
    return { templates };
  }

  @Post('templates/:templateId/apply')
  async applyTemplate(
    @Param('templateId') templateId: string,
    @Body() dto: ApplyTemplateDto,
  ): Promise<ApplyTemplateResponse> {
    const appliedPermissions = await this.permissionService.applyTemplate(
      templateId,
      dto.targetUser,
      dto.scope,
    );
    return { success: true, appliedPermissions };
  }

  // ==========================================
  // Helpers
  // ==========================================

  private buildUserString(type: 'admin' | 'team' | 'department' | 'role', id: string): string {
    switch (type) {
      case 'admin':
        return `admin:${id}`;
      case 'team':
        return `team:${id}#member`;
      case 'department':
        return `department:${id}#member`;
      case 'role':
        return `role:${id}#assigned`;
    }
  }
}

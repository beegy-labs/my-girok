import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import {
  CreateRoleDto,
  RoleScope,
  UpdateRoleDto,
  QueryRoleDto,
  AssignPermissionsDto,
  RevokePermissionsDto,
} from './dto';
import {
  RoleEntity,
  RoleListResponse,
  RoleWithPermissions,
  RoleHierarchyNode,
} from './entities/role.entity';

@ApiTags('Roles')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  /**
   * Create a new role
   * POST /v1/auth/roles
   */
  @Post()
  @ApiOperation({ summary: 'Create a new role' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Role created successfully',
    type: RoleEntity,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Role with same name already exists in scope',
  })
  async create(@Body() dto: CreateRoleDto): Promise<RoleEntity> {
    return this.rolesService.create(dto);
  }

  /**
   * Get all roles with pagination
   * GET /v1/auth/roles
   */
  @Get()
  @ApiOperation({ summary: 'List all roles with pagination and filters' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Paginated list of roles',
    type: RoleListResponse,
  })
  async findAll(@Query() query: QueryRoleDto): Promise<RoleListResponse> {
    return this.rolesService.findAll(query);
  }

  /**
   * Get role hierarchy tree
   * GET /v1/auth/roles/hierarchy
   */
  @Get('hierarchy')
  @ApiOperation({ summary: 'Get role hierarchy as tree structure' })
  @ApiQuery({ name: 'scope', enum: RoleScope, required: true })
  @ApiQuery({ name: 'serviceId', required: false })
  @ApiQuery({ name: 'countryCode', required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role hierarchy tree',
    type: [RoleHierarchyNode],
  })
  async getHierarchy(
    @Query('scope') scope: RoleScope,
    @Query('serviceId') serviceId?: string,
    @Query('countryCode') countryCode?: string,
  ): Promise<RoleHierarchyNode[]> {
    return this.rolesService.getHierarchy(scope, serviceId, countryCode);
  }

  /**
   * Get role by ID
   * GET /v1/auth/roles/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get role by ID' })
  @ApiParam({ name: 'id', description: 'Role ID', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role details',
    type: RoleEntity,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Role not found',
  })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<RoleEntity> {
    return this.rolesService.findById(id);
  }

  /**
   * Get role with permissions
   * GET /v1/auth/roles/:id/with-permissions
   */
  @Get(':id/with-permissions')
  @ApiOperation({ summary: 'Get role with assigned permissions' })
  @ApiParam({ name: 'id', description: 'Role ID', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role with permissions',
    type: RoleWithPermissions,
  })
  async findWithPermissions(@Param('id', ParseUUIDPipe) id: string): Promise<RoleWithPermissions> {
    return this.rolesService.findWithPermissions(id);
  }

  /**
   * Update role
   * PUT /v1/auth/roles/:id
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update role' })
  @ApiParam({ name: 'id', description: 'Role ID', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role updated successfully',
    type: RoleEntity,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Role not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'System roles cannot be modified',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
  ): Promise<RoleEntity> {
    return this.rolesService.update(id, dto);
  }

  /**
   * Delete role
   * DELETE /v1/auth/roles/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete role' })
  @ApiParam({ name: 'id', description: 'Role ID', type: String })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Role deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Role not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot delete system role or role with dependencies',
  })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.rolesService.delete(id);
  }

  /**
   * Get role permissions
   * GET /v1/auth/roles/:id/permissions
   */
  @Get(':id/permissions')
  @ApiOperation({ summary: 'Get permissions assigned to role' })
  @ApiParam({ name: 'id', description: 'Role ID', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of permission strings',
    type: [String],
  })
  async getPermissions(@Param('id', ParseUUIDPipe) id: string): Promise<string[]> {
    return this.rolesService.getPermissions(id);
  }

  /**
   * Assign permissions to role
   * POST /v1/auth/roles/:id/permissions
   */
  @Post(':id/permissions')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Assign permissions to role' })
  @ApiParam({ name: 'id', description: 'Role ID', type: String })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Permissions assigned successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Role or permission not found',
  })
  async assignPermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignPermissionsDto,
  ): Promise<void> {
    return this.rolesService.assignPermissions(id, dto);
  }

  /**
   * Revoke permissions from role
   * DELETE /v1/auth/roles/:id/permissions
   */
  @Delete(':id/permissions')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke permissions from role' })
  @ApiParam({ name: 'id', description: 'Role ID', type: String })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Permissions revoked successfully',
  })
  async revokePermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RevokePermissionsDto,
  ): Promise<void> {
    return this.rolesService.revokePermissions(id, dto);
  }
}

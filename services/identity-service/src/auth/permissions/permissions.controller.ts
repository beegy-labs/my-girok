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
import { PermissionsService } from './permissions.service';
import {
  CreatePermissionDto,
  PermissionScope,
  UpdatePermissionDto,
  QueryPermissionDto,
  CheckPermissionDto,
  PermissionCheckResult,
} from './dto';
import {
  PermissionEntity,
  PermissionListResponse,
  PermissionsByCategory,
} from './entities/permission.entity';

@ApiTags('Permissions')
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  /**
   * Create a new permission
   * POST /v1/auth/permissions
   */
  @Post()
  @ApiOperation({ summary: 'Create a new permission' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Permission created successfully',
    type: PermissionEntity,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Permission already exists',
  })
  async create(@Body() dto: CreatePermissionDto): Promise<PermissionEntity> {
    return this.permissionsService.create(dto);
  }

  /**
   * Get all permissions with pagination
   * GET /v1/auth/permissions
   */
  @Get()
  @ApiOperation({ summary: 'List all permissions with pagination and filters' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Paginated list of permissions',
    type: PermissionListResponse,
  })
  async findAll(@Query() query: QueryPermissionDto): Promise<PermissionListResponse> {
    return this.permissionsService.findAll(query);
  }

  /**
   * Get permissions grouped by category
   * GET /v1/auth/permissions/by-category
   */
  @Get('by-category')
  @ApiOperation({ summary: 'Get permissions grouped by category' })
  @ApiQuery({ name: 'scope', enum: PermissionScope, required: false })
  @ApiQuery({ name: 'serviceId', required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Permissions grouped by category',
    type: [PermissionsByCategory],
  })
  async findByCategory(
    @Query('scope') scope?: PermissionScope,
    @Query('serviceId') serviceId?: string,
  ): Promise<PermissionsByCategory[]> {
    return this.permissionsService.findByCategory(scope, serviceId);
  }

  /**
   * Check permission for an account
   * POST /v1/auth/permissions/check
   */
  @Post('check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check if an account has a specific permission' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Permission check result',
    type: PermissionCheckResult,
  })
  async checkPermission(@Body() dto: CheckPermissionDto): Promise<PermissionCheckResult> {
    return this.permissionsService.checkPermission(dto);
  }

  /**
   * Get operator permissions
   * GET /v1/auth/permissions/operator/:operatorId
   */
  @Get('operator/:operatorId')
  @ApiOperation({ summary: 'Get all permissions for an operator' })
  @ApiParam({ name: 'operatorId', description: 'Operator ID', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of permission strings',
    type: [String],
  })
  async getOperatorPermissions(
    @Param('operatorId', ParseUUIDPipe) operatorId: string,
  ): Promise<string[]> {
    return this.permissionsService.getOperatorPermissions(operatorId);
  }

  /**
   * Get permission by ID
   * GET /v1/auth/permissions/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get permission by ID' })
  @ApiParam({ name: 'id', description: 'Permission ID', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Permission details',
    type: PermissionEntity,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Permission not found',
  })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<PermissionEntity> {
    return this.permissionsService.findById(id);
  }

  /**
   * Update permission
   * PUT /v1/auth/permissions/:id
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update permission' })
  @ApiParam({ name: 'id', description: 'Permission ID', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Permission updated successfully',
    type: PermissionEntity,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Permission not found',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePermissionDto,
  ): Promise<PermissionEntity> {
    return this.permissionsService.update(id, dto);
  }

  /**
   * Delete permission
   * DELETE /v1/auth/permissions/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete permission' })
  @ApiParam({ name: 'id', description: 'Permission ID', type: String })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Permission deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Permission not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Cannot delete permission with dependencies',
  })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.permissionsService.delete(id);
  }
}

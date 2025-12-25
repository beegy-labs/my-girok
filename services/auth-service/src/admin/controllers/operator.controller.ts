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
} from '@nestjs/common';
import { OperatorService } from '../services/operator.service';
import {
  CreateOperatorDto,
  InviteOperatorDto,
  UpdateOperatorDto,
  GrantPermissionDto,
  OperatorResponse,
  OperatorListResponse,
  InvitationResponse,
  OperatorListQueryDto,
} from '../dto/operator.dto';
import { CurrentAdmin } from '../decorators/current-admin.decorator';
import { Permissions } from '../decorators/permissions.decorator';
import { PermissionGuard } from '../guards/permission.guard';
import { AdminPayload } from '../types/admin.types';

@Controller('admin/operators')
@UseGuards(PermissionGuard)
export class OperatorController {
  constructor(private readonly operatorService: OperatorService) {}

  /**
   * Create a new operator
   * POST /v1/admin/operators
   */
  @Post()
  @Permissions('operator:create')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentAdmin() admin: AdminPayload,
    @Body() dto: CreateOperatorDto,
  ): Promise<OperatorResponse> {
    return this.operatorService.create(admin.sub, dto);
  }

  /**
   * Invite an operator
   * POST /v1/admin/operators/invite
   */
  @Post('invite')
  @Permissions('operator:create')
  @HttpCode(HttpStatus.CREATED)
  async invite(
    @CurrentAdmin() admin: AdminPayload,
    @Body() dto: InviteOperatorDto,
  ): Promise<InvitationResponse> {
    return this.operatorService.invite(admin.sub, dto);
  }

  /**
   * List operators
   * GET /v1/admin/operators
   */
  @Get()
  @Permissions('operator:read')
  async findAll(
    @CurrentAdmin() admin: AdminPayload,
    @Query() query: OperatorListQueryDto,
  ): Promise<OperatorListResponse> {
    return this.operatorService.findAll(admin.sub, query);
  }

  /**
   * Get operator by ID
   * GET /v1/admin/operators/:id
   */
  @Get(':id')
  @Permissions('operator:read')
  async findById(@Param('id') id: string): Promise<OperatorResponse> {
    return this.operatorService.findById(id);
  }

  /**
   * Update operator
   * PATCH /v1/admin/operators/:id
   */
  @Patch(':id')
  @Permissions('operator:update')
  async update(
    @CurrentAdmin() admin: AdminPayload,
    @Param('id') id: string,
    @Body() dto: UpdateOperatorDto,
  ): Promise<OperatorResponse> {
    return this.operatorService.update(admin.sub, id, dto);
  }

  /**
   * Delete operator
   * DELETE /v1/admin/operators/:id
   */
  @Delete(':id')
  @Permissions('operator:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@CurrentAdmin() admin: AdminPayload, @Param('id') id: string): Promise<void> {
    return this.operatorService.delete(admin.sub, id);
  }

  /**
   * Grant permission to operator
   * POST /v1/admin/operators/:id/permissions
   */
  @Post(':id/permissions')
  @Permissions('operator:update')
  @HttpCode(HttpStatus.NO_CONTENT)
  async grantPermission(
    @CurrentAdmin() admin: AdminPayload,
    @Param('id') id: string,
    @Body() dto: GrantPermissionDto,
  ): Promise<void> {
    return this.operatorService.grantPermission(admin.sub, id, dto.permissionId);
  }

  /**
   * Revoke permission from operator
   * DELETE /v1/admin/operators/:id/permissions/:pid
   */
  @Delete(':id/permissions/:pid')
  @Permissions('operator:update')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokePermission(
    @CurrentAdmin() admin: AdminPayload,
    @Param('id') id: string,
    @Param('pid') permissionId: string,
  ): Promise<void> {
    return this.operatorService.revokePermission(admin.sub, id, permissionId);
  }
}

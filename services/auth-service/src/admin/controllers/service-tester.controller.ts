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
import { ServiceTesterService } from '../services/service-tester.service';
import { AdminPayload } from '../types/admin.types';
import {
  CreateTesterUserDto,
  UpdateTesterUserDto,
  DeleteTesterDto,
  CreateTesterAdminDto,
  ListTesterUsersQueryDto,
  TesterUserResponseDto,
  TesterAdminResponseDto,
  TesterUserListResponseDto,
  TesterAdminListResponseDto,
} from '../dto/service-tester.dto';
import { Permissions } from '../decorators/permissions.decorator';
import { PermissionGuard } from '../guards/permission.guard';
import { CurrentAdmin } from '../decorators/current-admin.decorator';

@Controller('admin/services/:serviceId/testers')
@UseGuards(PermissionGuard)
export class ServiceTesterController {
  constructor(private readonly testerService: ServiceTesterService) {}

  // ============================================================
  // USER TESTERS
  // ============================================================

  /**
   * List user testers for a service
   * GET /v1/admin/services/:serviceId/testers/users
   */
  @Get('users')
  @Permissions('service:read')
  async listUserTesters(
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Query() query: ListTesterUsersQueryDto,
  ): Promise<TesterUserListResponseDto> {
    return this.testerService.listUserTesters(serviceId, query);
  }

  /**
   * Get a specific user tester
   * GET /v1/admin/services/:serviceId/testers/users/:userId
   */
  @Get('users/:userId')
  @Permissions('service:read')
  async getUserTester(
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<TesterUserResponseDto> {
    return this.testerService.getUserTester(serviceId, userId);
  }

  /**
   * Create a user tester
   * POST /v1/admin/services/:serviceId/testers/users
   */
  @Post('users')
  @Permissions('service:update')
  @HttpCode(HttpStatus.CREATED)
  async createUserTester(
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Body() dto: CreateTesterUserDto,
    @CurrentAdmin() admin: AdminPayload,
  ): Promise<TesterUserResponseDto> {
    return this.testerService.createUserTester(serviceId, dto, admin);
  }

  /**
   * Update a user tester
   * PATCH /v1/admin/services/:serviceId/testers/users/:userId
   */
  @Patch('users/:userId')
  @Permissions('service:update')
  async updateUserTester(
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateTesterUserDto,
    @CurrentAdmin() admin: AdminPayload,
  ): Promise<TesterUserResponseDto> {
    return this.testerService.updateUserTester(serviceId, userId, dto, admin);
  }

  /**
   * Delete a user tester
   * DELETE /v1/admin/services/:serviceId/testers/users/:userId
   */
  @Delete('users/:userId')
  @Permissions('service:update')
  @HttpCode(HttpStatus.OK)
  async deleteUserTester(
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: DeleteTesterDto,
    @CurrentAdmin() admin: AdminPayload,
  ): Promise<{ success: boolean }> {
    return this.testerService.deleteUserTester(serviceId, userId, dto.reason, admin);
  }

  // ============================================================
  // ADMIN TESTERS
  // ============================================================

  /**
   * List admin testers for a service
   * GET /v1/admin/services/:serviceId/testers/admins
   */
  @Get('admins')
  @Permissions('service:read')
  async listAdminTesters(
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
  ): Promise<TesterAdminListResponseDto> {
    return this.testerService.listAdminTesters(serviceId);
  }

  /**
   * Create an admin tester
   * POST /v1/admin/services/:serviceId/testers/admins
   */
  @Post('admins')
  @Permissions('service:update')
  @HttpCode(HttpStatus.CREATED)
  async createAdminTester(
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Body() dto: CreateTesterAdminDto,
    @CurrentAdmin() admin: AdminPayload,
  ): Promise<TesterAdminResponseDto> {
    return this.testerService.createAdminTester(serviceId, dto, admin);
  }

  /**
   * Delete an admin tester
   * DELETE /v1/admin/services/:serviceId/testers/admins/:adminId
   */
  @Delete('admins/:adminId')
  @Permissions('service:update')
  @HttpCode(HttpStatus.OK)
  async deleteAdminTester(
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Param('adminId', ParseUUIDPipe) adminId: string,
    @Body() dto: DeleteTesterDto,
    @CurrentAdmin() admin: AdminPayload,
  ): Promise<{ success: boolean }> {
    return this.testerService.deleteAdminTester(serviceId, adminId, dto.reason, admin);
  }
}

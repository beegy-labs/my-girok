import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { SanctionService } from '../services/sanction.service';
import { AdminPayload } from '../types/admin.types';
import {
  CreateSanctionDto,
  UpdateSanctionDto,
  RevokeSanctionDto,
  ExtendSanctionDto,
  ReduceSanctionDto,
  ReviewAppealDto,
  ResendNotificationsDto,
  ListSanctionsQueryDto,
  SanctionResponseDto,
  SanctionNotificationResponseDto,
  SanctionListResponseDto,
  AppealResponseDto,
} from '../dto/sanction.dto';
import { Permissions } from '../decorators/permissions.decorator';
import { PermissionGuard } from '../guards/permission.guard';
import { CurrentAdmin } from '../decorators/current-admin.decorator';

@Controller('admin/services/:serviceId/sanctions')
@UseGuards(PermissionGuard)
export class SanctionController {
  constructor(private readonly sanctionService: SanctionService) {}

  // ============================================================
  // SANCTION CRUD
  // ============================================================

  /**
   * List sanctions for a service
   * GET /v1/admin/services/:serviceId/sanctions
   */
  @Get()
  @Permissions('sanction:read')
  async list(
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Query() query: ListSanctionsQueryDto,
  ): Promise<SanctionListResponseDto> {
    return this.sanctionService.list(serviceId, query);
  }

  /**
   * Get a specific sanction
   * GET /v1/admin/services/:serviceId/sanctions/:id
   */
  @Get(':id')
  @Permissions('sanction:read')
  async findOne(
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('includeNotifications') includeNotifications?: boolean,
  ): Promise<SanctionResponseDto> {
    return this.sanctionService.findOne(serviceId, id, { includeNotifications });
  }

  /**
   * Create a sanction
   * POST /v1/admin/services/:serviceId/sanctions
   */
  @Post()
  @Permissions('sanction:create')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Body() dto: CreateSanctionDto,
    @CurrentAdmin() admin: AdminPayload,
  ): Promise<SanctionResponseDto> {
    return this.sanctionService.create(serviceId, dto, admin);
  }

  /**
   * Update a sanction
   * PATCH /v1/admin/services/:serviceId/sanctions/:id
   */
  @Patch(':id')
  @Permissions('sanction:update')
  async update(
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSanctionDto,
    @CurrentAdmin() admin: AdminPayload,
  ): Promise<SanctionResponseDto> {
    return this.sanctionService.update(serviceId, id, dto, admin);
  }

  // ============================================================
  // SANCTION ACTIONS
  // ============================================================

  /**
   * Revoke a sanction
   * POST /v1/admin/services/:serviceId/sanctions/:id/revoke
   */
  @Post(':id/revoke')
  @Permissions('sanction:revoke')
  async revoke(
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RevokeSanctionDto,
    @CurrentAdmin() admin: AdminPayload,
  ): Promise<SanctionResponseDto> {
    return this.sanctionService.revoke(serviceId, id, dto, admin);
  }

  /**
   * Extend a sanction
   * POST /v1/admin/services/:serviceId/sanctions/:id/extend
   */
  @Post(':id/extend')
  @Permissions('sanction:update')
  async extend(
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ExtendSanctionDto,
    @CurrentAdmin() admin: AdminPayload,
  ): Promise<SanctionResponseDto> {
    return this.sanctionService.extend(serviceId, id, dto, admin);
  }

  /**
   * Reduce a sanction
   * POST /v1/admin/services/:serviceId/sanctions/:id/reduce
   */
  @Post(':id/reduce')
  @Permissions('sanction:update')
  async reduce(
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReduceSanctionDto,
    @CurrentAdmin() admin: AdminPayload,
  ): Promise<SanctionResponseDto> {
    return this.sanctionService.reduce(serviceId, id, dto, admin);
  }

  // ============================================================
  // APPEAL MANAGEMENT
  // ============================================================

  /**
   * Get appeal for a sanction
   * GET /v1/admin/services/:serviceId/sanctions/:id/appeal
   */
  @Get(':id/appeal')
  @Permissions('sanction:read')
  async getAppeal(
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AppealResponseDto> {
    return this.sanctionService.getAppeal(serviceId, id);
  }

  /**
   * Review an appeal
   * POST /v1/admin/services/:serviceId/sanctions/:id/appeal/review
   */
  @Post(':id/appeal/review')
  @Permissions('sanction:review')
  async reviewAppeal(
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewAppealDto,
    @CurrentAdmin() admin: AdminPayload,
  ): Promise<SanctionResponseDto> {
    return this.sanctionService.reviewAppeal(serviceId, id, dto, admin);
  }

  // ============================================================
  // NOTIFICATIONS
  // ============================================================

  /**
   * Get notifications for a sanction
   * GET /v1/admin/services/:serviceId/sanctions/:id/notifications
   */
  @Get(':id/notifications')
  @Permissions('sanction:read')
  async getNotifications(
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SanctionNotificationResponseDto[]> {
    return this.sanctionService.getNotifications(serviceId, id);
  }

  /**
   * Resend notifications for a sanction
   * POST /v1/admin/services/:serviceId/sanctions/:id/notifications/resend
   */
  @Post(':id/notifications/resend')
  @Permissions('sanction:update')
  async resendNotifications(
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResendNotificationsDto,
    @CurrentAdmin() admin: AdminPayload,
  ): Promise<SanctionNotificationResponseDto[]> {
    return this.sanctionService.resendNotifications(serviceId, id, dto, admin);
  }
}

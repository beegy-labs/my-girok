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
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiHeader } from '@nestjs/swagger';
import { OperatorsService } from './operators.service';
import {
  CreateOperatorInvitationDto,
  AcceptInvitationDto,
  CreateOperatorDirectDto,
  UpdateOperatorDto,
  QueryOperatorDto,
  GrantPermissionsDto,
  RevokeOperatorPermissionsDto,
  QueryInvitationDto,
} from './dto';
import {
  OperatorEntity,
  OperatorListResponse,
  OperatorWithPermissions,
  OperatorInvitationEntity,
  InvitationListResponse,
} from './entities/operator.entity';

@ApiTags('Operators')
@Controller('operators')
export class OperatorsController {
  constructor(private readonly operatorsService: OperatorsService) {}

  /**
   * Create an operator invitation
   * POST /v1/auth/operators/invitations
   */
  @Post('invitations')
  @ApiOperation({ summary: 'Create an operator invitation' })
  @ApiHeader({
    name: 'x-user-id',
    description: 'ID of the user creating the invitation',
    required: true,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Invitation created successfully',
    type: OperatorInvitationEntity,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Operator or pending invitation already exists',
  })
  async createInvitation(
    @Body() dto: CreateOperatorInvitationDto,
    @Headers('x-user-id') userId: string,
  ): Promise<OperatorInvitationEntity> {
    return this.operatorsService.createInvitation(dto, userId);
  }

  /**
   * Accept an invitation
   * POST /v1/auth/operators/invitations/accept
   */
  @Post('invitations/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept an operator invitation' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Invitation accepted, operator created',
    type: OperatorEntity,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid or expired invitation',
  })
  async acceptInvitation(@Body() dto: AcceptInvitationDto): Promise<OperatorEntity> {
    return this.operatorsService.acceptInvitation(dto);
  }

  /**
   * List invitations
   * GET /v1/auth/operators/invitations
   */
  @Get('invitations')
  @ApiOperation({ summary: 'List operator invitations' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Paginated list of invitations',
    type: InvitationListResponse,
  })
  async findInvitations(@Query() query: QueryInvitationDto): Promise<InvitationListResponse> {
    return this.operatorsService.findInvitations(query);
  }

  /**
   * Cancel invitation
   * DELETE /v1/auth/operators/invitations/:id
   */
  @Delete('invitations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel an invitation' })
  @ApiParam({ name: 'id', description: 'Invitation ID', type: String })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Invitation cancelled',
  })
  async cancelInvitation(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.operatorsService.cancelInvitation(id);
  }

  /**
   * Resend invitation
   * POST /v1/auth/operators/invitations/:id/resend
   */
  @Post('invitations/:id/resend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend an invitation with new token' })
  @ApiParam({ name: 'id', description: 'Invitation ID', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Invitation resent',
    type: OperatorInvitationEntity,
  })
  async resendInvitation(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<OperatorInvitationEntity> {
    return this.operatorsService.resendInvitation(id);
  }

  /**
   * Create operator directly
   * POST /v1/auth/operators
   */
  @Post()
  @ApiOperation({ summary: 'Create an operator directly (without invitation)' })
  @ApiHeader({
    name: 'x-user-id',
    description: 'ID of the user creating the operator',
    required: true,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Operator created successfully',
    type: OperatorEntity,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Operator already exists',
  })
  async createDirect(
    @Body() dto: CreateOperatorDirectDto,
    @Headers('x-user-id') userId: string,
  ): Promise<OperatorEntity> {
    return this.operatorsService.createDirect(dto, userId);
  }

  /**
   * List operators
   * GET /v1/auth/operators
   */
  @Get()
  @ApiOperation({ summary: 'List operators with pagination and filters' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Paginated list of operators',
    type: OperatorListResponse,
  })
  async findAll(@Query() query: QueryOperatorDto): Promise<OperatorListResponse> {
    return this.operatorsService.findAll(query);
  }

  /**
   * Get operator by ID
   * GET /v1/auth/operators/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get operator by ID' })
  @ApiParam({ name: 'id', description: 'Operator ID', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Operator details',
    type: OperatorEntity,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Operator not found',
  })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<OperatorEntity> {
    return this.operatorsService.findById(id);
  }

  /**
   * Get operator with permissions
   * GET /v1/auth/operators/:id/with-permissions
   */
  @Get(':id/with-permissions')
  @ApiOperation({ summary: 'Get operator with all permissions' })
  @ApiParam({ name: 'id', description: 'Operator ID', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Operator with permissions',
    type: OperatorWithPermissions,
  })
  async findWithPermissions(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<OperatorWithPermissions> {
    return this.operatorsService.findWithPermissions(id);
  }

  /**
   * Update operator
   * PUT /v1/auth/operators/:id
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update operator' })
  @ApiParam({ name: 'id', description: 'Operator ID', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Operator updated',
    type: OperatorEntity,
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOperatorDto,
  ): Promise<OperatorEntity> {
    return this.operatorsService.update(id, dto);
  }

  /**
   * Deactivate operator
   * DELETE /v1/auth/operators/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate operator (soft delete)' })
  @ApiParam({ name: 'id', description: 'Operator ID', type: String })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Operator deactivated',
  })
  async deactivate(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.operatorsService.deactivate(id);
  }

  /**
   * Reactivate operator
   * POST /v1/auth/operators/:id/reactivate
   */
  @Post(':id/reactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reactivate a deactivated operator' })
  @ApiParam({ name: 'id', description: 'Operator ID', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Operator reactivated',
    type: OperatorEntity,
  })
  async reactivate(@Param('id', ParseUUIDPipe) id: string): Promise<OperatorEntity> {
    return this.operatorsService.reactivate(id);
  }

  /**
   * Grant permissions to operator
   * POST /v1/auth/operators/:id/permissions
   */
  @Post(':id/permissions')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Grant permissions to operator' })
  @ApiParam({ name: 'id', description: 'Operator ID', type: String })
  @ApiHeader({
    name: 'x-user-id',
    description: 'ID of the user granting permissions',
    required: true,
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Permissions granted',
  })
  async grantPermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GrantPermissionsDto,
    @Headers('x-user-id') userId: string,
  ): Promise<void> {
    return this.operatorsService.grantPermissions(id, dto, userId);
  }

  /**
   * Revoke permissions from operator
   * DELETE /v1/auth/operators/:id/permissions
   */
  @Delete(':id/permissions')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke permissions from operator' })
  @ApiParam({ name: 'id', description: 'Operator ID', type: String })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Permissions revoked',
  })
  async revokePermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RevokeOperatorPermissionsDto,
  ): Promise<void> {
    return this.operatorsService.revokePermissions(id, dto);
  }
}

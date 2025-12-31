import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PaginatedResponse } from '../../common/pagination';
import { SessionsService, SessionResponse, CreatedSessionResponse } from './sessions.service';
import { CreateSessionDto, RefreshSessionDto, RevokeSessionDto, SessionQueryDto } from './dto';

@ApiTags('sessions')
@Controller('sessions')
@ApiBearerAuth()
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new session' })
  @ApiResponse({
    status: 201,
    description: 'Session created successfully with tokens',
    schema: {
      properties: {
        id: { type: 'string', format: 'uuid' },
        accountId: { type: 'string', format: 'uuid' },
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
        expiresAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Account or device not found' })
  async create(@Body() dto: CreateSessionDto): Promise<CreatedSessionResponse> {
    return this.sessionsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List sessions with pagination and filtering' })
  @ApiQuery({
    name: 'accountId',
    required: false,
    type: String,
    description: 'Filter by account ID',
  })
  @ApiQuery({ name: 'deviceId', required: false, type: String, description: 'Filter by device ID' })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filter by active status',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20, max: 100)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of sessions with pagination metadata',
  })
  async findAll(
    @Query('accountId') accountId?: string,
    @Query('deviceId') deviceId?: string,
    @Query('isActive') isActive?: boolean,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<PaginatedResponse<SessionResponse>> {
    const params: SessionQueryDto = {
      accountId,
      deviceId,
      isActive,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    };
    return this.sessionsService.findAll(params);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get session by ID' })
  @ApiParam({ name: 'id', description: 'Session UUID' })
  @ApiResponse({ status: 200, description: 'Session found' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<SessionResponse> {
    return this.sessionsService.findById(id);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh session tokens' })
  @ApiResponse({
    status: 200,
    description: 'Session refreshed with new tokens',
    schema: {
      properties: {
        id: { type: 'string', format: 'uuid' },
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
        expiresAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(@Body() dto: RefreshSessionDto): Promise<CreatedSessionResponse> {
    return this.sessionsService.refresh(dto.refreshToken);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a session' })
  @ApiParam({ name: 'id', description: 'Session UUID' })
  @ApiResponse({ status: 204, description: 'Session revoked successfully' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async revoke(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto?: RevokeSessionDto,
  ): Promise<void> {
    return this.sessionsService.revoke(id, dto);
  }

  @Delete('account/:accountId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke all sessions for an account' })
  @ApiParam({ name: 'accountId', description: 'Account UUID' })
  @ApiQuery({
    name: 'excludeSessionId',
    required: false,
    description: 'Session ID to exclude from revocation',
  })
  @ApiResponse({
    status: 200,
    description: 'Sessions revoked',
    schema: {
      properties: {
        count: { type: 'number', description: 'Number of sessions revoked' },
      },
    },
  })
  async revokeAllForAccount(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Query('excludeSessionId') excludeSessionId?: string,
  ): Promise<{ count: number }> {
    const count = await this.sessionsService.revokeAllForAccount(accountId, excludeSessionId);
    return { count };
  }

  @Post(':id/touch')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Update session activity timestamp' })
  @ApiParam({ name: 'id', description: 'Session UUID' })
  @ApiResponse({ status: 204, description: 'Session activity updated' })
  async touch(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.sessionsService.touch(id);
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate access token' })
  @ApiResponse({
    status: 200,
    description: 'Token is valid',
    schema: {
      properties: {
        valid: { type: 'boolean' },
        session: { type: 'object', nullable: true },
      },
    },
  })
  async validateToken(
    @Body('accessToken') accessToken: string,
  ): Promise<{ valid: boolean; session: SessionResponse | null }> {
    const session = await this.sessionsService.validateAccessToken(accessToken);
    return {
      valid: session !== null,
      session,
    };
  }

  @Get('account/:accountId/count')
  @ApiOperation({ summary: 'Get active session count for account' })
  @ApiParam({ name: 'accountId', description: 'Account UUID' })
  @ApiResponse({
    status: 200,
    description: 'Active session count',
    schema: {
      properties: {
        count: { type: 'number' },
      },
    },
  })
  async getActiveSessionCount(
    @Param('accountId', ParseUUIDPipe) accountId: string,
  ): Promise<{ count: number }> {
    const count = await this.sessionsService.getActiveSessionCount(accountId);
    return { count };
  }

  @Post('cleanup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cleanup expired sessions (admin operation)' })
  @ApiResponse({
    status: 200,
    description: 'Expired sessions cleaned up',
    schema: {
      properties: {
        count: { type: 'number', description: 'Number of sessions cleaned up' },
      },
    },
  })
  async cleanupExpired(): Promise<{ count: number }> {
    const count = await this.sessionsService.cleanupExpired();
    return { count };
  }
}

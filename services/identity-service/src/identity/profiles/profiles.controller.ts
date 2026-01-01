import { Controller, Get, Put, Body, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ProfilesService } from './profiles.service';
import { UpdateProfileDto } from './dto';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';

/**
 * Profiles Controller
 *
 * Handles user profile CRUD operations.
 *
 * 2026 Best Practices:
 * - Rate limiting to prevent abuse
 * - XSS prevention via sanitization in service layer
 * - UUID validation on all parameters
 */
@ApiTags('Profiles')
@Controller('profiles')
@ApiBearerAuth()
@UseGuards(ApiKeyGuard)
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get(':accountId')
  @Throttle({ default: { ttl: 60000, limit: 60 } }) // 60 requests per minute
  @ApiOperation({ summary: 'Get profile by account ID' })
  @ApiParam({ name: 'accountId', description: 'Account ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Profile found' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async findByAccountId(@Param('accountId', ParseUUIDPipe) accountId: string) {
    return this.profilesService.findByAccountId(accountId);
  }

  @Put(':accountId')
  @Throttle({ default: { ttl: 60000, limit: 10 } }) // 10 updates per minute
  @ApiOperation({ summary: 'Update profile' })
  @ApiParam({ name: 'accountId', description: 'Account ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async update(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.profilesService.update(accountId, {
      ...dto,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
    });
  }
}

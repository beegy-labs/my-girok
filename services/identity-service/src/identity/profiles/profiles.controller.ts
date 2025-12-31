import { Controller, Get, Put, Body, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { ProfilesService } from './profiles.service';
import { UpdateProfileDto } from './dto';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';

@ApiTags('Profiles')
@Controller('profiles')
@ApiBearerAuth()
@UseGuards(ApiKeyGuard)
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get(':accountId')
  @ApiOperation({ summary: 'Get profile by account ID' })
  @ApiParam({ name: 'accountId', description: 'Account ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Profile found' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async findByAccountId(@Param('accountId', ParseUUIDPipe) accountId: string) {
    return this.profilesService.findByAccountId(accountId);
  }

  @Put(':accountId')
  @ApiOperation({ summary: 'Update profile' })
  @ApiParam({ name: 'accountId', description: 'Account ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
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

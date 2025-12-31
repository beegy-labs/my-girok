import { Controller, Get, Put, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ProfilesService } from './profiles.service';

@ApiTags('Profiles')
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get(':accountId')
  @ApiOperation({ summary: 'Get profile by account ID' })
  @ApiParam({ name: 'accountId', description: 'Account ID' })
  @ApiResponse({ status: 200, description: 'Profile found' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async findByAccountId(@Param('accountId', ParseUUIDPipe) accountId: string) {
    return this.profilesService.findByAccountId(accountId);
  }

  @Put(':accountId')
  @ApiOperation({ summary: 'Update profile' })
  @ApiParam({ name: 'accountId', description: 'Account ID' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  async update(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Body()
    data: {
      displayName?: string;
      firstName?: string;
      lastName?: string;
      avatar?: string;
      bio?: string;
      locale?: string;
      timezone?: string;
      countryCode?: string;
      visibility?: string;
    },
  ) {
    return this.profilesService.update(accountId, data);
  }
}

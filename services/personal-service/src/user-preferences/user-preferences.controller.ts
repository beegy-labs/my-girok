import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UserPreferencesService } from './user-preferences.service';
import {
  CreateUserPreferencesDto,
  UpdateUserPreferencesDto,
} from './dto';
import { CurrentUser } from '../common/decorators';

@ApiTags('User Preferences')
@ApiBearerAuth('JWT-auth')
@Controller('v1/user-preferences')
export class UserPreferencesController {
  constructor(
    private readonly userPreferencesService: UserPreferencesService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get user preferences',
    description:
      'Get current user preferences. Creates default if not exists.',
  })
  @ApiResponse({
    status: 200,
    description: 'User preferences retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async getUserPreferences(@CurrentUser() user: any) {
    return this.userPreferencesService.getUserPreferences(user.id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create or update user preferences',
    description:
      'Create new user preferences or update if already exists (upsert)',
  })
  @ApiResponse({
    status: 200,
    description: 'User preferences saved successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async upsertUserPreferences(
    @CurrentUser() user: any,
    @Body() dto: CreateUserPreferencesDto,
  ) {
    return this.userPreferencesService.upsertUserPreferences(
      user.id,
      dto,
    );
  }

  @Put()
  @ApiOperation({
    summary: 'Update user preferences',
    description: 'Partially update existing user preferences',
  })
  @ApiResponse({
    status: 200,
    description: 'User preferences updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'User preferences not found',
  })
  async updateUserPreferences(
    @CurrentUser() user: any,
    @Body() dto: UpdateUserPreferencesDto,
  ) {
    return this.userPreferencesService.updateUserPreferences(
      user.id,
      dto,
    );
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete user preferences',
    description: 'Delete user preferences (reset to defaults)',
  })
  @ApiResponse({
    status: 204,
    description: 'User preferences deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async deleteUserPreferences(@CurrentUser() user: any) {
    await this.userPreferencesService.deleteUserPreferences(user.id);
  }
}

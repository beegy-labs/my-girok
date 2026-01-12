import { Controller, Get, Param, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AllowedAccountTypes } from '../../common/decorators/account-type.decorator';
import { AccountType } from '../../config/constants';

@Controller('admin/analytics')
@AllowedAccountTypes(AccountType.ADMIN)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * Get user summary statistics
   */
  @Get('users/:userId/summary')
  async getUserSummary(@Param('userId') userId: string) {
    return this.analyticsService.getUserSummary(userId);
  }

  /**
   * Get user sessions
   */
  @Get('users/:userId/sessions')
  async getUserSessions(
    @Param('userId') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getUserSessions(userId, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      startDate,
      endDate,
    });
  }

  /**
   * Get user location statistics
   */
  @Get('users/:userId/locations')
  async getUserLocations(@Param('userId') userId: string) {
    return this.analyticsService.getUserLocations(userId);
  }

  /**
   * Get top active users
   */
  @Get('users/top')
  async getTopUsers(@Query('limit') limit?: number) {
    return this.analyticsService.getTopUsers(limit ? Number(limit) : 50);
  }

  /**
   * Get users overview
   */
  @Get('users/overview')
  async getUsersOverview(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.analyticsService.getUsersOverview({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
      search,
    });
  }
}

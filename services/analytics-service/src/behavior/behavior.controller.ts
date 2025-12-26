import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BehaviorService } from './behavior.service';
import {
  BehaviorQueryDto,
  TopEventsQueryDto,
  UserBehaviorQueryDto,
  EventCountResult,
  UserActivityResult,
  BehaviorSummary,
} from './dto/behavior-query.dto';

@ApiTags('Behavior')
@Controller('behavior')
export class BehaviorController {
  constructor(private readonly behaviorService: BehaviorService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get behavior summary' })
  @ApiResponse({ status: 200, description: 'Behavior summary returned' })
  async getSummary(@Query() query: BehaviorQueryDto): Promise<BehaviorSummary> {
    return this.behaviorService.getSummary(query);
  }

  @Get('top-events')
  @ApiOperation({ summary: 'Get top events by count' })
  @ApiResponse({ status: 200, description: 'Top events returned' })
  async getTopEvents(@Query() query: TopEventsQueryDto): Promise<EventCountResult[]> {
    return this.behaviorService.getTopEvents(query);
  }

  @Get('time-series')
  @ApiOperation({ summary: 'Get events time series' })
  @ApiResponse({ status: 200, description: 'Time series data returned' })
  async getTimeSeries(
    @Query() query: BehaviorQueryDto,
  ): Promise<{ timestamp: string; count: number }[]> {
    return this.behaviorService.getTimeSeries(query);
  }

  @Get('user')
  @ApiOperation({ summary: 'Get user behavior activity' })
  @ApiResponse({ status: 200, description: 'User activity returned' })
  async getUserActivity(@Query() query: UserBehaviorQueryDto): Promise<UserActivityResult> {
    return this.behaviorService.getUserActivity(query);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get events by category' })
  @ApiResponse({ status: 200, description: 'Category breakdown returned' })
  async getEventsByCategory(@Query() query: BehaviorQueryDto): Promise<Record<string, number>> {
    return this.behaviorService.getEventsByCategory(query);
  }
}

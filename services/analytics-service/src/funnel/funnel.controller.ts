import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { FunnelService } from './funnel.service';
import { FunnelQueryDto, FunnelResult, FunnelComparison } from './dto/funnel-query.dto';

@ApiTags('Funnel')
@Controller('funnel')
export class FunnelController {
  constructor(private readonly funnelService: FunnelService) {}

  @Get('analyze')
  @ApiOperation({ summary: 'Analyze funnel conversion' })
  @ApiResponse({ status: 200, description: 'Funnel analysis returned' })
  async analyzeFunnel(@Query() query: FunnelQueryDto): Promise<FunnelResult> {
    return this.funnelService.analyzeFunnel(query);
  }

  @Get('compare')
  @ApiOperation({ summary: 'Compare funnel between two periods' })
  @ApiResponse({ status: 200, description: 'Funnel comparison returned' })
  @ApiQuery({ name: 'previousStartDate', required: true })
  @ApiQuery({ name: 'previousEndDate', required: true })
  async compareFunnels(
    @Query() query: FunnelQueryDto,
    @Query('previousStartDate') previousStartDate: string,
    @Query('previousEndDate') previousEndDate: string,
  ): Promise<FunnelComparison> {
    return this.funnelService.compareFunnels(query, previousStartDate, previousEndDate);
  }

  @Get('dropoff')
  @ApiOperation({ summary: 'Get users who dropped off at a specific step' })
  @ApiResponse({ status: 200, description: 'Dropoff users returned' })
  @ApiQuery({ name: 'atStep', required: true, type: Number })
  async getDropoffUsers(
    @Query() query: FunnelQueryDto,
    @Query('atStep') atStep: number,
  ): Promise<{ userId: string; lastEvent: string; lastEventTime: string }[]> {
    return this.funnelService.getDropoffUsers(query, atStep);
  }
}

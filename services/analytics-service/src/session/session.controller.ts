import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SessionService } from './session.service';
import {
  SessionQueryDto,
  SessionSummary,
  SessionDetail,
  SessionTimeline,
  SessionDistribution,
} from './dto/session-query.dto';

@ApiTags('Sessions')
@Controller('sessions')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get session analytics summary' })
  @ApiResponse({ status: 200, description: 'Session summary returned' })
  async getSummary(@Query() query: SessionQueryDto): Promise<SessionSummary> {
    return this.sessionService.getSummary(query);
  }

  @Get()
  @ApiOperation({ summary: 'Get session list' })
  @ApiResponse({ status: 200, description: 'Sessions returned' })
  async getSessions(@Query() query: SessionQueryDto): Promise<SessionDetail[]> {
    return this.sessionService.getSessions(query);
  }

  @Get('distribution')
  @ApiOperation({ summary: 'Get session distribution analytics' })
  @ApiResponse({ status: 200, description: 'Distribution data returned' })
  async getDistribution(@Query() query: SessionQueryDto): Promise<SessionDistribution> {
    return this.sessionService.getDistribution(query);
  }

  @Get(':sessionId/timeline')
  @ApiOperation({ summary: 'Get session event timeline' })
  @ApiResponse({ status: 200, description: 'Session timeline returned' })
  async getSessionTimeline(@Param('sessionId') sessionId: string): Promise<SessionTimeline> {
    return this.sessionService.getSessionTimeline(sessionId);
  }
}

import { Controller, Post, Body, Req, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { Public } from '@my-girok/nest-common';
import { IngestionService } from './ingestion.service';
import { TrackEventDto, TrackEventsDto } from './dto/track-event.dto';
import { PageViewDto } from './dto/page-view.dto';
import { IdentifyDto } from './dto/identify.dto';

@ApiTags('Events')
@Controller('events')
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Post('track')
  @Public()
  @HttpCode(200)
  @Throttle({ events: { limit: 100, ttl: 60000 } })
  @ApiOperation({ summary: 'Track events' })
  @ApiResponse({ status: 200, description: 'Events tracked' })
  async track(@Body() dto: TrackEventsDto, @Req() req: Request): Promise<{ success: boolean }> {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    await this.ingestionService.trackEvents(dto.events, clientIp);
    return { success: true };
  }

  @Post('track/single')
  @Public()
  @HttpCode(200)
  @Throttle({ events: { limit: 100, ttl: 60000 } })
  @ApiOperation({ summary: 'Track single event' })
  @ApiResponse({ status: 200, description: 'Event tracked' })
  async trackSingle(
    @Body() dto: TrackEventDto,
    @Req() req: Request,
  ): Promise<{ success: boolean }> {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    await this.ingestionService.trackEvents([dto], clientIp);
    return { success: true };
  }

  @Post('page')
  @Public()
  @HttpCode(200)
  @Throttle({ events: { limit: 100, ttl: 60000 } })
  @ApiOperation({ summary: 'Track page view' })
  @ApiResponse({ status: 200, description: 'Page view tracked' })
  async pageView(@Body() dto: PageViewDto, @Req() req: Request): Promise<{ success: boolean }> {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    await this.ingestionService.trackPageView(dto, clientIp);
    return { success: true };
  }

  @Post('identify')
  @Public()
  @HttpCode(200)
  @Throttle({ events: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Identify user' })
  @ApiResponse({ status: 200, description: 'User identified' })
  async identify(@Body() dto: IdentifyDto): Promise<{ success: boolean }> {
    await this.ingestionService.identify(dto);
    return { success: true };
  }
}

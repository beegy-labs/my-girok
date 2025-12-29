import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AdminAuditService } from '../services/admin-audit.service';
import { AdminAuthGuard } from '../guards/admin-auth.guard';
import {
  UIEventsQueryDto,
  APILogsQueryDto,
  AuditLogsQueryDto,
  SessionsQueryDto,
  StatsQueryDto,
  UIEventResponse,
  APILogResponse,
  AuditLogResponse,
  SessionResponse,
  TraceResponse,
  PaginatedResponse,
  StatsResponse,
} from '../dto/admin-audit.dto';

@Controller('v1/audit')
@UseGuards(AdminAuthGuard)
export class AdminAuditController {
  constructor(private readonly adminAuditService: AdminAuditService) {}

  // ===== UI Events =====

  @Get('ui-events')
  async getUIEvents(@Query() query: UIEventsQueryDto): Promise<PaginatedResponse<UIEventResponse>> {
    return this.adminAuditService.getUIEvents(query);
  }

  @Get('ui-events/:id')
  async getUIEventById(@Param('id') id: string): Promise<UIEventResponse | null> {
    return this.adminAuditService.getUIEventById(id);
  }

  // ===== API Logs =====

  @Get('api-logs')
  async getAPILogs(@Query() query: APILogsQueryDto): Promise<PaginatedResponse<APILogResponse>> {
    return this.adminAuditService.getAPILogs(query);
  }

  @Get('api-logs/:id')
  async getAPILogById(@Param('id') id: string): Promise<APILogResponse | null> {
    return this.adminAuditService.getAPILogById(id);
  }

  // ===== Audit Logs =====

  @Get('audit-logs')
  async getAuditLogs(
    @Query() query: AuditLogsQueryDto,
  ): Promise<PaginatedResponse<AuditLogResponse>> {
    return this.adminAuditService.getAuditLogs(query);
  }

  @Get('audit-logs/:id')
  async getAuditLogById(@Param('id') id: string): Promise<AuditLogResponse | null> {
    return this.adminAuditService.getAuditLogById(id);
  }

  // ===== Sessions =====

  @Get('sessions')
  async getSessions(@Query() query: SessionsQueryDto): Promise<PaginatedResponse<SessionResponse>> {
    return this.adminAuditService.getSessions(query);
  }

  @Get('sessions/:sessionId')
  async getSessionById(@Param('sessionId') sessionId: string): Promise<SessionResponse | null> {
    return this.adminAuditService.getSessionById(sessionId);
  }

  @Get('sessions/:sessionId/events')
  async getSessionEvents(@Param('sessionId') sessionId: string): Promise<UIEventResponse[]> {
    return this.adminAuditService.getSessionEvents(sessionId);
  }

  // ===== Traces =====

  @Get('traces/:traceId')
  async getTraceById(@Param('traceId') traceId: string): Promise<TraceResponse> {
    return this.adminAuditService.getTraceById(traceId);
  }

  // ===== Actor Activity =====

  @Get('actors/:actorId/activity')
  async getActorActivity(
    @Param('actorId') actorId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<AuditLogResponse[]> {
    return this.adminAuditService.getActorActivity(actorId, startDate, endDate);
  }

  // ===== Target History =====

  @Get('targets/:targetId/history')
  async getTargetHistory(@Param('targetId') targetId: string): Promise<AuditLogResponse[]> {
    return this.adminAuditService.getTargetHistory(targetId);
  }

  // ===== Stats =====

  @Get('stats/overview')
  async getStatsOverview(@Query() query: StatsQueryDto): Promise<StatsResponse> {
    return this.adminAuditService.getStats(query);
  }
}

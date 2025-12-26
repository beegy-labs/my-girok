import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuditQueryService } from '../services/audit-query.service';
import {
  AuditLogQueryDto,
  AuditStatsQueryDto,
  PaginatedAuditLogResponse,
  AuditStatsResponse,
} from '../dto/audit-query.dto';
import { CurrentAdmin } from '../decorators/current-admin.decorator';
import { Permissions } from '../decorators/permissions.decorator';
import { PermissionGuard } from '../guards/permission.guard';
import { AdminPayload } from '../types/admin.types';

@ApiTags('Admin - Audit Logs')
@Controller('admin/audit-logs')
@UseGuards(PermissionGuard)
export class AuditQueryController {
  constructor(private readonly auditQueryService: AuditQueryService) {}

  /**
   * Query audit logs with filters
   * GET /v1/admin/audit-logs
   */
  @Get()
  @Permissions('audit:read')
  @ApiOperation({ summary: 'Query audit logs' })
  async queryLogs(
    @Query() query: AuditLogQueryDto,
    @CurrentAdmin() admin: AdminPayload,
  ): Promise<PaginatedAuditLogResponse> {
    return this.auditQueryService.query(query, admin);
  }

  /**
   * Get audit statistics
   * GET /v1/admin/audit-logs/stats
   */
  @Get('stats')
  @Permissions('audit:read')
  @ApiOperation({ summary: 'Get audit statistics' })
  async getStats(
    @Query() query: AuditStatsQueryDto,
    @CurrentAdmin() admin: AdminPayload,
  ): Promise<AuditStatsResponse> {
    return this.auditQueryService.getStats(query, admin);
  }
}

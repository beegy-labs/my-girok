import { Controller, Get, Query, UseGuards, Res, Header } from '@nestjs/common';
import { Response } from 'express';
import { Public } from '@my-girok/nest-common';
import { AdminAuditService } from '../services/admin-audit.service';
import {
  AuditLogListQuery,
  AuditLogListResponse,
  AuditLogFilterOptions,
} from '../dto/admin-audit.dto';
import { AdminAuthGuard } from '../guards/admin-auth.guard';
import { PermissionGuard } from '../guards/permission.guard';
import { Permissions } from '../decorators/permissions.decorator';

@Controller('admin/audit')
@Public() // Bypass global JwtAuthGuard - AdminAuthGuard handles auth
@UseGuards(AdminAuthGuard, PermissionGuard)
export class AdminAuditController {
  constructor(private readonly adminAuditService: AdminAuditService) {}

  /**
   * List audit logs with filters and pagination
   * GET /v1/admin/audit/logs
   */
  @Get('logs')
  @Permissions('audit:read')
  async listAuditLogs(@Query() query: AuditLogListQuery): Promise<AuditLogListResponse> {
    return this.adminAuditService.listAuditLogs(query);
  }

  /**
   * Get filter options for UI dropdowns
   * GET /v1/admin/audit/filters
   */
  @Get('filters')
  @Permissions('audit:read')
  async getFilterOptions(): Promise<AuditLogFilterOptions> {
    return this.adminAuditService.getFilterOptions();
  }

  /**
   * Export audit logs as CSV
   * GET /v1/admin/audit/logs/export
   */
  @Get('logs/export')
  @Permissions('audit:read')
  @Header('Content-Type', 'text/csv')
  async exportCsv(@Query() query: AuditLogListQuery, @Res() res: Response): Promise<void> {
    const csv = await this.adminAuditService.exportCsv(query);
    const filename = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }
}

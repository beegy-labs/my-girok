import { Controller, Get, Query, Param, NotFoundException, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, ParseUlidPipe } from '@my-girok/nest-common';
import { AuditQueryService } from '../services/audit-query.service';
import {
  AuditLogQueryDto,
  AuditLogResponseDto,
  PaginatedAuditLogResponseDto,
} from '../dto/audit-log.dto';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('audit/logs')
export class AuditLogController {
  constructor(private readonly auditQueryService: AuditQueryService) {}

  @Get()
  @ApiOperation({ summary: 'Get access logs' })
  @ApiResponse({ status: 200, description: 'Access logs retrieved' })
  async getLogs(@Query() query: AuditLogQueryDto): Promise<PaginatedAuditLogResponseDto> {
    return this.auditQueryService.getAccessLogs(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get access log by ID' })
  @ApiResponse({ status: 200, description: 'Access log found' })
  @ApiResponse({ status: 404, description: 'Log not found' })
  async getLogById(@Param('id', ParseUlidPipe) id: string): Promise<AuditLogResponseDto> {
    const log = await this.auditQueryService.getAccessLogById(id);
    if (!log) {
      throw new NotFoundException(`Audit log ${id} not found`);
    }
    return log;
  }
}

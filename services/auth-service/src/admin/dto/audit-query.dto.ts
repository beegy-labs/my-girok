import { IsOptional, IsString, IsEnum, IsDateString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ActorType } from '../../common/types/audit.types';

export class AuditLogQueryDto {
  @IsOptional()
  @IsEnum(['USER', 'ADMIN', 'OPERATOR', 'SYSTEM'])
  actorType?: ActorType;

  @IsOptional()
  @IsString()
  actorId?: string;

  @IsOptional()
  @IsString()
  serviceSlug?: string;

  @IsOptional()
  @IsString()
  resource?: string;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  targetId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class AuditStatsQueryDto {
  @IsOptional()
  @IsString()
  serviceSlug?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(['day', 'week', 'month'])
  groupBy?: 'day' | 'week' | 'month' = 'day';
}

export interface AuditLogResponse {
  id: string;
  timestamp: string;
  actorType: string;
  actorId: string;
  actorEmail: string;
  serviceSlug: string | null;
  resource: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  method: string;
  path: string;
  statusCode: number;
  ipAddress: string;
  success: boolean;
  errorMessage: string | null;
  durationMs: number;
}

export interface AuditStatsResponse {
  totalActions: number;
  successCount: number;
  failureCount: number;
  avgDurationMs: number;
  byActor: Array<{
    actorType: string;
    actorId: string;
    count: number;
  }>;
  byResource: Array<{
    resource: string;
    action: string;
    count: number;
  }>;
  byService: Array<{
    serviceSlug: string;
    count: number;
  }>;
  timeline: Array<{
    date: string;
    count: number;
    successCount: number;
    failureCount: number;
  }>;
}

export interface PaginatedAuditLogResponse {
  data: AuditLogResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

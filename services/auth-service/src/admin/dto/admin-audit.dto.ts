import { IsOptional, IsString, IsDateString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AuditLogListQuery {
  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  resource?: string;

  @IsOptional()
  @IsString()
  adminId?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;
}

export interface AuditLogAdmin {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
}

export interface AuditLogResponse {
  id: string;
  adminId: string;
  admin: AuditLogAdmin;
  action: string;
  resource: string;
  resourceId: string | null;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export interface AuditLogListResponse {
  items: AuditLogResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuditLogFilterOptions {
  actions: string[];
  resources: string[];
  admins: AuditLogAdmin[];
}

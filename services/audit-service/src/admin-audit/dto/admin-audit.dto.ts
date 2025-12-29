import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsDateString,
  IsInt,
  Min,
  Max,
  IsArray,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

// Common query parameters
export class BaseQueryDto {
  @IsUUID()
  @IsOptional()
  serviceId?: string;

  @IsUUID()
  @IsOptional()
  actorId?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  @IsOptional()
  limit?: number = 50;
}

// UI Events
export enum UIEventType {
  CLICK = 'click',
  PAGE_VIEW = 'page_view',
  FORM_SUBMIT = 'form_submit',
  MODAL_OPEN = 'modal_open',
  MODAL_CLOSE = 'modal_close',
  TAB_CHANGE = 'tab_change',
  FILTER_CHANGE = 'filter_change',
  SEARCH = 'search',
  SORT = 'sort',
  EXPORT = 'export',
  BULK_ACTION = 'bulk_action',
}

export enum UIEventCategory {
  SANCTION = 'sanction',
  TESTER = 'tester',
  CONFIG = 'config',
  FEATURE = 'feature',
  LEGAL = 'legal',
  USER = 'user',
  OPERATOR = 'operator',
  TENANT = 'tenant',
  AUDIT = 'audit',
}

export class UIEventsQueryDto extends BaseQueryDto {
  @IsEnum(UIEventType)
  @IsOptional()
  eventType?: UIEventType;

  @IsString()
  @IsOptional()
  eventCategory?: string;

  @IsString()
  @IsOptional()
  sessionId?: string;

  @IsString()
  @IsOptional()
  pagePath?: string;
}

// API Logs
export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
}

export class APILogsQueryDto extends BaseQueryDto {
  @IsEnum(HttpMethod)
  @IsOptional()
  method?: HttpMethod;

  @IsString()
  @IsOptional()
  pathTemplate?: string;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  statusCode?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  minResponseTime?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  maxResponseTime?: number;

  @IsString()
  @IsOptional()
  requestId?: string;
}

// Audit Logs
export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  APPROVE = 'approve',
  REJECT = 'reject',
  REVOKE = 'revoke',
  EXTEND = 'extend',
  REDUCE = 'reduce',
  EXPORT = 'export',
  BULK_UPDATE = 'bulk_update',
}

export enum AuditResource {
  SANCTION = 'sanction',
  TESTER_USER = 'tester_user',
  TESTER_ADMIN = 'tester_admin',
  SERVICE_CONFIG = 'service_config',
  SERVICE_FEATURE = 'feature',
  FEATURE_PERMISSION = 'feature_permission',
  LEGAL_DOCUMENT = 'legal_document',
  CONSENT = 'consent',
  USER = 'user',
  OPERATOR = 'operator',
  TENANT = 'tenant',
}

export class AuditLogsQueryDto extends BaseQueryDto {
  @IsEnum(AuditResource)
  @IsOptional()
  resource?: AuditResource;

  @IsEnum(AuditAction)
  @IsOptional()
  action?: AuditAction;

  @IsUUID()
  @IsOptional()
  targetId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',') : value))
  complianceTags?: string[];
}

// Sessions
export class SessionsQueryDto extends BaseQueryDto {
  @IsString()
  @IsOptional()
  userAgent?: string;

  @IsString()
  @IsOptional()
  country?: string;
}

// Stats
export enum StatsGroupBy {
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

export class StatsQueryDto {
  @IsUUID()
  @IsOptional()
  serviceId?: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsEnum(StatsGroupBy)
  @IsOptional()
  groupBy?: StatsGroupBy = StatsGroupBy.DAY;
}

// Export
export enum ExportFormat {
  CSV = 'csv',
  JSON = 'json',
}

export enum ExportType {
  UI_EVENTS = 'ui_events',
  API_LOGS = 'api_logs',
  AUDIT_LOGS = 'audit_logs',
  SESSIONS = 'sessions',
}

export class CreateExportDto {
  @IsEnum(ExportType)
  type!: ExportType;

  @IsEnum(ExportFormat)
  @IsOptional()
  format?: ExportFormat = ExportFormat.CSV;

  @IsUUID()
  @IsOptional()
  serviceId?: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  columns?: string[];
}

// Response interfaces
export interface UIEventResponse {
  id: string;
  timestamp: string;
  sessionId: string;
  actorId: string;
  actorEmail: string;
  serviceId: string;
  eventType: string;
  eventName: string;
  eventCategory: string;
  pagePath: string;
  traceId: string;
}

export interface APILogResponse {
  id: string;
  timestamp: string;
  requestId: string;
  traceId: string;
  actorId: string;
  actorEmail: string;
  serviceId: string;
  method: string;
  path: string;
  pathTemplate: string;
  statusCode: number;
  responseTimeMs: number;
  errorType: string | null;
  errorMessage: string | null;
}

export interface AuditLogResponse {
  id: string;
  timestamp: string;
  traceId: string;
  actorId: string;
  actorEmail: string;
  actorType: string;
  serviceId: string;
  resource: string;
  action: string;
  targetId: string;
  targetName: string;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  complianceTags: string[];
}

export interface SessionResponse {
  sessionId: string;
  actorId: string;
  actorEmail: string;
  serviceId: string;
  startedAt: string;
  lastActivityAt: string;
  endedAt: string | null;
  duration: number;
  eventCount: number;
  pageCount: number;
  userAgent: string;
  country: string;
}

export interface TraceResponse {
  traceId: string;
  uiEvents: UIEventResponse[];
  apiLogs: APILogResponse[];
  auditLogs: AuditLogResponse[];
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface StatsOverview {
  totalUIEvents: number;
  totalAPIRequests: number;
  totalAuditLogs: number;
  totalSessions: number;
  uniqueActors: number;
  avgResponseTime: number;
  errorRate: number;
}

export interface ActionStats {
  resource: string;
  action: string;
  count: number;
}

export interface ActorStats {
  actorId: string;
  actorEmail: string;
  count: number;
}

export interface ErrorStats {
  errorType: string;
  count: number;
}

export interface StatsResponse {
  overview: StatsOverview;
  actionsByResource: ActionStats[];
  topActors: ActorStats[];
  errorSummary: ErrorStats[];
}

export interface ExportResponse {
  id: string;
  type: ExportType;
  format: ExportFormat;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  completedAt: string | null;
  downloadUrl: string | null;
  rowCount: number | null;
  error: string | null;
}

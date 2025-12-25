export type ActorType = 'USER' | 'ADMIN' | 'OPERATOR' | 'SYSTEM';

export interface AuditEntry {
  // Actor info
  actorType: ActorType;
  actorId: string;
  actorEmail?: string;

  // Context
  serviceId?: string | null;
  serviceSlug?: string | null;
  tenantId?: string | null;
  countryCode?: string | null;

  // Action info
  resource: string;
  action: string;
  targetType?: string | null;
  targetId?: string | null;

  // Request details
  method?: string;
  path?: string;
  statusCode?: number;
  ipAddress?: string;
  userAgent?: string;

  // Data
  requestBody?: Record<string, unknown> | null;
  responseSummary?: string | null;
  metadata?: Record<string, unknown>;

  // Result
  success: boolean;
  errorMessage?: string | null;
  durationMs?: number;
}

export interface AuditLogRecord {
  id: string;
  timestamp: Date;
  actorType: ActorType;
  actorId: string;
  actorEmail: string;
  serviceId: string | null;
  serviceSlug: string | null;
  tenantId: string | null;
  countryCode: string | null;
  resource: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  method: string;
  path: string;
  statusCode: number;
  ipAddress: string;
  userAgent: string;
  requestBody: string | null;
  responseSummary: string | null;
  metadata: string;
  success: boolean;
  errorMessage: string | null;
  durationMs: number;
}

export interface AuditStats {
  totalActions: number;
  successCount: number;
  failureCount: number;
  avgDurationMs: number;
  byActor: Array<{
    actorType: ActorType;
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
}

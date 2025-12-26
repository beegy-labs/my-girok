import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { AuditEntry } from '../types/audit.types';

/**
 * AuditService handles audit logging with support for:
 * - OpenTelemetry log export (for ClickHouse via OTel Collector)
 * - PostgreSQL dual-write (optional backup)
 *
 * When OTel is configured, logs are emitted as structured logs
 * that the OTel Collector routes to ClickHouse.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private readonly dualWrite: boolean;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.dualWrite = this.configService.get<string>('AUDIT_DUAL_WRITE', 'true') === 'true';
  }

  /**
   * Log an audit entry
   * Emits to OTel and optionally writes to PostgreSQL
   */
  async log(entry: AuditEntry): Promise<void> {
    try {
      // Emit as structured log for OTel Collector
      this.emitOtelLog(entry);

      // Dual-write to PostgreSQL if enabled
      if (this.dualWrite) {
        await this.writeToPostgres(entry);
      }
    } catch (error) {
      this.logger.error('Failed to write audit log', error);
      // Don't throw - audit logging should not break the main flow
    }
  }

  /**
   * Emit log entry in OTel format
   * The OTel Collector will pick this up and route to ClickHouse
   */
  private emitOtelLog(entry: AuditEntry): void {
    // Structure the log entry with audit-specific attributes
    // These will be captured by the OTel SDK if configured
    const logEntry = {
      severity: 'INFO',
      message: `${entry.resource}:${entry.action}`,
      attributes: {
        'audit.actor_type': entry.actorType,
        'audit.actor_id': entry.actorId,
        'audit.actor_email': entry.actorEmail || '',
        'audit.service_id': entry.serviceId || '',
        'audit.service_slug': entry.serviceSlug || '',
        'audit.tenant_id': entry.tenantId || '',
        'audit.country_code': entry.countryCode || '',
        'audit.resource': entry.resource,
        'audit.action': entry.action,
        'audit.target_type': entry.targetType || '',
        'audit.target_id': entry.targetId || '',
        'audit.method': entry.method || '',
        'audit.path': entry.path || '',
        'audit.status_code': entry.statusCode || 0,
        'audit.ip_address': entry.ipAddress || '',
        'audit.user_agent': entry.userAgent || '',
        'audit.success': entry.success ? 1 : 0,
        'audit.error_message': entry.errorMessage || '',
        'audit.duration_ms': entry.durationMs || 0,
        'audit.metadata': JSON.stringify(entry.metadata || {}),
        'audit.request_body': entry.requestBody ? JSON.stringify(entry.requestBody) : '',
        'audit.response_summary': entry.responseSummary || '',
      },
    };

    // Log as JSON for OTel Collector to parse
    // In production, this would use @opentelemetry/api-logs
    this.logger.log(JSON.stringify(logEntry));
  }

  /**
   * Write audit entry to PostgreSQL (for backup/immediate queries)
   */
  private async writeToPostgres(entry: AuditEntry): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO audit_logs (
        id, admin_id, action, resource, resource_id,
        before_state, after_state, ip_address, user_agent, created_at
      )
      VALUES (
        gen_random_uuid()::TEXT,
        ${entry.actorId},
        ${entry.action},
        ${entry.resource},
        ${entry.targetId || null},
        ${entry.metadata ? JSON.stringify(entry.metadata) : null}::jsonb,
        ${entry.requestBody ? JSON.stringify(entry.requestBody) : null}::jsonb,
        ${entry.ipAddress || null},
        ${entry.userAgent || null},
        NOW()
      )
    `;
  }

  /**
   * Convenience method for logging admin actions
   */
  async logAdminAction(
    adminId: string,
    adminEmail: string,
    action: string,
    resource: string,
    options: {
      targetId?: string;
      targetType?: string;
      serviceSlug?: string;
      tenantId?: string;
      metadata?: Record<string, unknown>;
      ipAddress?: string;
      userAgent?: string;
    } = {},
  ): Promise<void> {
    await this.log({
      actorType: 'ADMIN',
      actorId: adminId,
      actorEmail: adminEmail,
      resource,
      action,
      targetId: options.targetId,
      targetType: options.targetType,
      serviceSlug: options.serviceSlug,
      tenantId: options.tenantId,
      metadata: options.metadata,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      success: true,
    });
  }

  /**
   * Convenience method for logging operator actions
   */
  async logOperatorAction(
    operatorId: string,
    operatorEmail: string,
    action: string,
    resource: string,
    serviceSlug: string,
    options: {
      targetId?: string;
      targetType?: string;
      metadata?: Record<string, unknown>;
      ipAddress?: string;
      userAgent?: string;
    } = {},
  ): Promise<void> {
    await this.log({
      actorType: 'OPERATOR',
      actorId: operatorId,
      actorEmail: operatorEmail,
      resource,
      action,
      serviceSlug,
      targetId: options.targetId,
      targetType: options.targetType,
      metadata: options.metadata,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      success: true,
    });
  }

  /**
   * Convenience method for logging user actions
   */
  async logUserAction(
    userId: string,
    userEmail: string,
    action: string,
    resource: string,
    options: {
      targetId?: string;
      serviceSlug?: string;
      metadata?: Record<string, unknown>;
      ipAddress?: string;
      userAgent?: string;
    } = {},
  ): Promise<void> {
    await this.log({
      actorType: 'USER',
      actorId: userId,
      actorEmail: userEmail,
      resource,
      action,
      targetId: options.targetId,
      serviceSlug: options.serviceSlug,
      metadata: options.metadata,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      success: true,
    });
  }

  /**
   * Convenience method for logging system actions
   */
  async logSystemAction(
    action: string,
    resource: string,
    options: {
      targetId?: string;
      serviceSlug?: string;
      metadata?: Record<string, unknown>;
      success?: boolean;
      errorMessage?: string;
    } = {},
  ): Promise<void> {
    await this.log({
      actorType: 'SYSTEM',
      actorId: 'system',
      actorEmail: 'system@internal',
      resource,
      action,
      targetId: options.targetId,
      serviceSlug: options.serviceSlug,
      metadata: options.metadata,
      success: options.success ?? true,
      errorMessage: options.errorMessage,
    });
  }
}

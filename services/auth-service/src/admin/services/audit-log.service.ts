import { Injectable, Logger } from '@nestjs/common';
import { AdminPayload } from '../types/admin.types';

export interface AuditLogParams {
  resource: string;
  action: string;
  targetId: string;
  targetType: string;
  targetIdentifier: string;
  beforeState?: unknown;
  afterState?: unknown;
  changedFields?: string[];
  reason?: string;
  admin: AdminPayload;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  async log(params: AuditLogParams): Promise<void> {
    // Emit structured log (OTEL will capture via NestJS Logger)
    this.logger.log({
      message: `Audit: ${params.action} ${params.resource}`,
      'log.type': 'audit',
      'audit.resource': params.resource,
      'audit.action': params.action,
      'audit.target_id': params.targetId,
      'audit.target_type': params.targetType,
      'audit.target_identifier': params.targetIdentifier,
      'audit.before_state': params.beforeState ? JSON.stringify(params.beforeState) : undefined,
      'audit.after_state': params.afterState ? JSON.stringify(params.afterState) : undefined,
      'audit.changed_fields': params.changedFields?.join(','),
      'audit.reason': params.reason,
      'actor.id': params.admin.sub,
      'actor.email': params.admin.email,
      'actor.scope': params.admin.scope,
      'actor.role': params.admin.roleName,
    });
  }
}

import { Injectable } from '@nestjs/common';
import {
  ID,
  formatAuditTimestamp,
  calculateAuditRetentionDate,
  generateAuditChecksum,
} from '@my-girok/nest-common';
import type {
  AdminCreatedEvent,
  AdminUpdatedEvent,
  AdminDeactivatedEvent,
  AdminReactivatedEvent,
  AdminInvitedEvent,
  AdminRoleChangedEvent,
} from '@my-girok/types';

interface ClickHouseAuditLog {
  id: string;
  timestamp: string;
  actor_id: string;
  actor_type: string;
  actor_email: string;
  actor_name: string;
  actor_scope: string;
  actor_role: string;
  actor_ip: string;
  service_id: string;
  service_slug: string;
  service_name: string;
  resource: string;
  resource_version: number;
  action: string;
  target_id: string;
  target_type: string;
  target_identifier: string;
  operation_type: string;
  before_state: string | null;
  after_state: string;
  changed_fields: string[];
  change_diff: string;
  reason: string;
  business_justification: string | null;
  ticket_id: string | null;
  approval_id: string | null;
  compliance_tags: string[];
  data_classification: string;
  pii_accessed: boolean;
  pii_fields: string[];
  source: string;
  source_version: string;
  trace_id: string;
  span_id: string;
  ui_event_id: string | null;
  api_log_id: string | null;
  checksum: string;
  previous_log_id: string | null;
  retention_until: string;
  legal_hold: boolean;
  [key: string]: any;
}

@Injectable()
export class AdminEventMapper {
  /**
   * Extract source service information from event metadata
   * Falls back to default auth-service values if not provided
   */
  private getSourceServiceInfo(metadata?: any) {
    return {
      serviceSlug: metadata?.sourceService?.slug || 'auth-service',
      serviceName: metadata?.sourceService?.name || 'Auth Service',
      sourceVersion: metadata?.sourceService?.version || '1.0.0',
    };
  }

  mapAdminCreatedToAuditLog(event: AdminCreatedEvent): ClickHouseAuditLog {
    const { serviceSlug, serviceName, sourceVersion } = this.getSourceServiceInfo(event.metadata);

    return {
      id: ID.generate(),
      timestamp: formatAuditTimestamp(event.timestamp),
      actor_id: event.actor.id,
      actor_type: event.actor.type,
      actor_email: (event.metadata?.actorEmail || '') as string,
      actor_name: (event.metadata?.actorName || '') as string,
      actor_scope: 'SYSTEM',
      actor_role: (event.metadata?.actorRole || '') as string,
      actor_ip: (event.metadata?.ipAddress || '') as string,
      service_id: (event.metadata?.serviceId || '') as string,
      service_slug: serviceSlug,
      service_name: serviceName,
      resource: 'admin_account',
      resource_version: 1,
      action: 'create',
      target_id: event.payload.adminId,
      target_type: 'admin',
      target_identifier: event.payload.email,
      operation_type: 'INSERT',
      before_state: null,
      after_state: JSON.stringify({
        id: event.payload.adminId,
        email: event.payload.email,
        name: event.payload.name,
        roleId: event.payload.roleId,
        scope: event.payload.scope,
        tenantId: event.payload.tenantId,
      }),
      changed_fields: ['id', 'email', 'name', 'roleId', 'scope', 'tenantId'],
      change_diff: JSON.stringify({ operation: 'CREATE' }),
      reason: `Admin account created: ${event.payload.email}`,
      business_justification: null,
      ticket_id: null,
      approval_id: null,
      compliance_tags: ['ADMIN_MANAGEMENT', 'ACCESS_CONTROL'],
      data_classification: 'INTERNAL',
      pii_accessed: true,
      pii_fields: ['email', 'name'],
      source: serviceSlug,
      source_version: sourceVersion,
      trace_id: (event.metadata?.traceId || '') as string,
      span_id: (event.metadata?.spanId || '') as string,
      ui_event_id: null,
      api_log_id: null,
      checksum: generateAuditChecksum(event),
      previous_log_id: null,
      retention_until: calculateAuditRetentionDate(event.timestamp, 7),
      legal_hold: false,
    };
  }

  mapAdminUpdatedToAuditLog(event: AdminUpdatedEvent): ClickHouseAuditLog {
    const { serviceSlug, serviceName, sourceVersion } = this.getSourceServiceInfo(event.metadata);

    return {
      id: ID.generate(),
      timestamp: formatAuditTimestamp(event.timestamp),
      actor_id: event.actor.id,
      actor_type: event.actor.type,
      actor_email: (event.metadata?.actorEmail || '') as string,
      actor_name: (event.metadata?.actorName || '') as string,
      actor_scope: 'SYSTEM',
      actor_role: (event.metadata?.actorRole || '') as string,
      actor_ip: (event.metadata?.ipAddress || '') as string,
      service_id: (event.metadata?.serviceId || '') as string,
      service_slug: serviceSlug,
      service_name: serviceName,
      resource: 'admin_account',
      resource_version: 1,
      action: 'update',
      target_id: event.payload.adminId,
      target_type: 'admin',
      target_identifier: event.payload.adminId,
      operation_type: 'UPDATE',
      before_state: null,
      after_state: JSON.stringify({ changedFields: event.payload.changedFields }),
      changed_fields: event.payload.changedFields,
      change_diff: JSON.stringify({
        changedFields: event.payload.changedFields,
      }),
      reason: `Admin account updated: ${event.payload.adminId}`,
      business_justification: null,
      ticket_id: null,
      approval_id: null,
      compliance_tags: ['ADMIN_MANAGEMENT', 'DATA_MODIFICATION'],
      data_classification: 'INTERNAL',
      pii_accessed: event.payload.changedFields.some((key) => ['email', 'name'].includes(key)),
      pii_fields: event.payload.changedFields.filter((key) => ['email', 'name'].includes(key)),
      source: serviceSlug,
      source_version: sourceVersion,
      trace_id: (event.metadata?.traceId || '') as string,
      span_id: (event.metadata?.spanId || '') as string,
      ui_event_id: null,
      api_log_id: null,
      checksum: generateAuditChecksum(event),
      previous_log_id: null,
      retention_until: calculateAuditRetentionDate(event.timestamp, 7),
      legal_hold: false,
    };
  }

  mapAdminDeactivatedToAuditLog(event: AdminDeactivatedEvent): ClickHouseAuditLog {
    const { serviceSlug, serviceName, sourceVersion } = this.getSourceServiceInfo(event.metadata);

    return {
      id: ID.generate(),
      timestamp: formatAuditTimestamp(event.timestamp),
      actor_id: event.actor.id,
      actor_type: event.actor.type,
      actor_email: (event.metadata?.actorEmail || '') as string,
      actor_name: (event.metadata?.actorName || '') as string,
      actor_scope: 'SYSTEM',
      actor_role: (event.metadata?.actorRole || '') as string,
      actor_ip: (event.metadata?.ipAddress || '') as string,
      service_id: (event.metadata?.serviceId || '') as string,
      service_slug: serviceSlug,
      service_name: serviceName,
      resource: 'admin_account',
      resource_version: 1,
      action: 'deactivate',
      target_id: event.payload.adminId,
      target_type: 'admin',
      target_identifier: event.payload.email,
      operation_type: 'UPDATE',
      before_state: JSON.stringify({ status: 'active' }),
      after_state: JSON.stringify({ status: 'deactivated' }),
      changed_fields: ['status'],
      change_diff: JSON.stringify({
        previous: { status: 'active' },
        current: { status: 'deactivated' },
      }),
      reason: event.payload.reason || `Admin account deactivated: ${event.payload.email}`,
      business_justification: null,
      ticket_id: null,
      approval_id: null,
      compliance_tags: ['ADMIN_MANAGEMENT', 'ACCESS_REVOCATION'],
      data_classification: 'INTERNAL',
      pii_accessed: false,
      pii_fields: [],
      source: serviceSlug,
      source_version: sourceVersion,
      trace_id: (event.metadata?.traceId || '') as string,
      span_id: (event.metadata?.spanId || '') as string,
      ui_event_id: null,
      api_log_id: null,
      checksum: generateAuditChecksum(event),
      previous_log_id: null,
      retention_until: calculateAuditRetentionDate(event.timestamp, 7),
      legal_hold: false,
    };
  }

  mapAdminReactivatedToAuditLog(event: AdminReactivatedEvent): ClickHouseAuditLog {
    const { serviceSlug, serviceName, sourceVersion } = this.getSourceServiceInfo(event.metadata);

    return {
      id: ID.generate(),
      timestamp: formatAuditTimestamp(event.timestamp),
      actor_id: event.actor.id,
      actor_type: event.actor.type,
      actor_email: (event.metadata?.actorEmail || '') as string,
      actor_name: (event.metadata?.actorName || '') as string,
      actor_scope: 'SYSTEM',
      actor_role: (event.metadata?.actorRole || '') as string,
      actor_ip: (event.metadata?.ipAddress || '') as string,
      service_id: (event.metadata?.serviceId || '') as string,
      service_slug: serviceSlug,
      service_name: serviceName,
      resource: 'admin_account',
      resource_version: 1,
      action: 'reactivate',
      target_id: event.payload.adminId,
      target_type: 'admin',
      target_identifier: event.payload.email,
      operation_type: 'UPDATE',
      before_state: JSON.stringify({ status: 'deactivated' }),
      after_state: JSON.stringify({ status: 'active' }),
      changed_fields: ['status'],
      change_diff: JSON.stringify({
        previous: { status: 'deactivated' },
        current: { status: 'active' },
      }),
      reason: `Admin account reactivated: ${event.payload.email}`,
      business_justification: null,
      ticket_id: null,
      approval_id: null,
      compliance_tags: ['ADMIN_MANAGEMENT', 'ACCESS_RESTORATION'],
      data_classification: 'INTERNAL',
      pii_accessed: false,
      pii_fields: [],
      source: serviceSlug,
      source_version: sourceVersion,
      trace_id: (event.metadata?.traceId || '') as string,
      span_id: (event.metadata?.spanId || '') as string,
      ui_event_id: null,
      api_log_id: null,
      checksum: generateAuditChecksum(event),
      previous_log_id: null,
      retention_until: calculateAuditRetentionDate(event.timestamp, 7),
      legal_hold: false,
    };
  }

  mapAdminInvitedToAuditLog(event: AdminInvitedEvent): ClickHouseAuditLog {
    const { serviceSlug, serviceName, sourceVersion } = this.getSourceServiceInfo(event.metadata);

    return {
      id: ID.generate(),
      timestamp: formatAuditTimestamp(event.timestamp),
      actor_id: event.actor.id,
      actor_type: event.actor.type,
      actor_email: (event.metadata?.actorEmail || '') as string,
      actor_name: (event.metadata?.actorName || '') as string,
      actor_scope: 'SYSTEM',
      actor_role: (event.metadata?.actorRole || '') as string,
      actor_ip: (event.metadata?.ipAddress || '') as string,
      service_id: (event.metadata?.serviceId || '') as string,
      service_slug: serviceSlug,
      service_name: serviceName,
      resource: 'admin_invitation',
      resource_version: 1,
      action: 'invite',
      target_id: event.payload.invitationId,
      target_type: 'admin_invitation',
      target_identifier: event.payload.email,
      operation_type: 'INSERT',
      before_state: null,
      after_state: JSON.stringify({
        invitationId: event.payload.invitationId,
        email: event.payload.email,
        name: event.payload.name,
        roleId: event.payload.roleId,
        expiresAt: event.payload.expiresAt,
      }),
      changed_fields: ['invitationId', 'email', 'name', 'roleId', 'expiresAt'],
      change_diff: JSON.stringify({ operation: 'INVITE' }),
      reason: `Admin invitation sent: ${event.payload.email}`,
      business_justification: null,
      ticket_id: null,
      approval_id: null,
      compliance_tags: ['ADMIN_MANAGEMENT', 'INVITATION'],
      data_classification: 'INTERNAL',
      pii_accessed: true,
      pii_fields: ['email', 'name'],
      source: serviceSlug,
      source_version: sourceVersion,
      trace_id: (event.metadata?.traceId || '') as string,
      span_id: (event.metadata?.spanId || '') as string,
      ui_event_id: null,
      api_log_id: null,
      checksum: generateAuditChecksum(event),
      previous_log_id: null,
      retention_until: calculateAuditRetentionDate(event.timestamp, 7),
      legal_hold: false,
    };
  }

  mapAdminRoleChangedToAuditLog(event: AdminRoleChangedEvent): ClickHouseAuditLog {
    const { serviceSlug, serviceName, sourceVersion } = this.getSourceServiceInfo(event.metadata);

    return {
      id: ID.generate(),
      timestamp: formatAuditTimestamp(event.timestamp),
      actor_id: event.actor.id,
      actor_type: event.actor.type,
      actor_email: (event.metadata?.actorEmail || '') as string,
      actor_name: (event.metadata?.actorName || '') as string,
      actor_scope: 'SYSTEM',
      actor_role: (event.metadata?.actorRole || '') as string,
      actor_ip: (event.metadata?.ipAddress || '') as string,
      service_id: (event.metadata?.serviceId || '') as string,
      service_slug: serviceSlug,
      service_name: serviceName,
      resource: 'admin_account',
      resource_version: 1,
      action: 'role_change',
      target_id: event.payload.adminId,
      target_type: 'admin',
      target_identifier: event.payload.adminId,
      operation_type: 'UPDATE',
      before_state: JSON.stringify({ roleId: event.payload.previousRoleId }),
      after_state: JSON.stringify({ roleId: event.payload.newRoleId }),
      changed_fields: ['roleId'],
      change_diff: JSON.stringify({
        previous: { roleId: event.payload.previousRoleId },
        current: { roleId: event.payload.newRoleId },
      }),
      reason: `Admin role changed from ${event.payload.previousRoleId} to ${event.payload.newRoleId}: ${event.payload.adminId}`,
      business_justification: null,
      ticket_id: null,
      approval_id: null,
      compliance_tags: ['ADMIN_MANAGEMENT', 'ROLE_ASSIGNMENT', 'ACCESS_CONTROL'],
      data_classification: 'INTERNAL',
      pii_accessed: false,
      pii_fields: [],
      source: serviceSlug,
      source_version: sourceVersion,
      trace_id: (event.metadata?.traceId || '') as string,
      span_id: (event.metadata?.spanId || '') as string,
      ui_event_id: null,
      api_log_id: null,
      checksum: generateAuditChecksum(event),
      previous_log_id: null,
      retention_until: calculateAuditRetentionDate(event.timestamp, 7),
      legal_hold: false,
    };
  }
}

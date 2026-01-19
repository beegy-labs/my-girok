import { describe, it, expect, beforeEach } from 'vitest';
import { AdminEventMapper } from '../admin-event.mapper';
import type {
  AdminCreatedEvent,
  AdminUpdatedEvent,
  AdminDeactivatedEvent,
  AdminReactivatedEvent,
  AdminInvitedEvent,
  AdminRoleChangedEvent,
} from '@my-girok/types';

describe('AdminEventMapper', () => {
  let mapper: AdminEventMapper;

  beforeEach(() => {
    mapper = new AdminEventMapper();
  });

  describe('mapAdminCreatedToAuditLog', () => {
    it('should map AdminCreatedEvent to ClickHouse audit log', () => {
      const event: AdminCreatedEvent = {
        eventId: 'evt_123',
        eventType: 'ADMIN_CREATED',
        aggregateId: 'admin_123',
        aggregateType: 'Admin',
        timestamp: new Date('2026-01-19T00:00:00.000Z'),
        version: 1,
        actor: {
          id: 'actor_123',
          type: 'SYSTEM',
        },
        payload: {
          adminId: 'admin_123',
          email: 'admin@example.com',
          name: 'Admin User',
          roleId: 'role_123',
          scope: 'SYSTEM',
        },
        metadata: {
          actorEmail: 'actor@example.com',
          actorName: 'Actor User',
          actorRole: 'SUPER_ADMIN',
          ipAddress: '192.168.1.1',
          serviceId: 'svc_123',
          traceId: 'trace_123',
          spanId: 'span_123',
        },
      };

      const result = mapper.mapAdminCreatedToAuditLog(event);

      expect(result).toMatchObject({
        actor_id: 'actor_123',
        actor_type: 'SYSTEM',
        actor_email: 'actor@example.com',
        actor_name: 'Actor User',
        actor_scope: 'SYSTEM',
        actor_role: 'SUPER_ADMIN',
        actor_ip: '192.168.1.1',
        service_id: 'svc_123',
        service_slug: 'auth-service',
        service_name: 'Auth Service',
        resource: 'admin_account',
        resource_version: 1,
        action: 'create',
        target_id: 'admin_123',
        target_type: 'admin',
        target_identifier: 'admin@example.com',
        operation_type: 'INSERT',
        before_state: null,
        changed_fields: ['id', 'email', 'name', 'roleId', 'scope', 'tenantId'],
        reason: 'Admin account created: admin@example.com',
        compliance_tags: ['ADMIN_MANAGEMENT', 'ACCESS_CONTROL'],
        data_classification: 'INTERNAL',
        pii_accessed: true,
        pii_fields: ['email', 'name'],
        source: 'auth-service',
        source_version: '1.0.0',
        trace_id: 'trace_123',
        span_id: 'span_123',
        legal_hold: false,
      });

      expect(result.id).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.after_state).toContain('admin_123');
      expect(result.checksum).toBeDefined();
      expect(result.retention_until).toBeDefined();
    });

    it('should handle missing optional metadata', () => {
      const event: AdminCreatedEvent = {
        eventId: 'evt_123',
        eventType: 'ADMIN_CREATED',
        aggregateId: 'admin_123',
        aggregateType: 'Admin',
        timestamp: new Date('2026-01-19T00:00:00.000Z'),
        version: 1,
        actor: {
          id: 'actor_123',
          type: 'SYSTEM',
        },
        payload: {
          adminId: 'admin_123',
          email: 'admin@example.com',
          name: 'Admin User',
          roleId: 'role_123',
          scope: 'SYSTEM',
        },
      };

      const result = mapper.mapAdminCreatedToAuditLog(event);

      expect(result.actor_email).toBe('');
      expect(result.actor_name).toBe('');
      expect(result.actor_role).toBe('');
      expect(result.actor_ip).toBe('');
      expect(result.service_id).toBe('');
      expect(result.trace_id).toBe('');
      expect(result.span_id).toBe('');
    });
  });

  describe('mapAdminUpdatedToAuditLog', () => {
    it('should map AdminUpdatedEvent to ClickHouse audit log', () => {
      const event: AdminUpdatedEvent = {
        eventId: 'evt_123',
        eventType: 'ADMIN_UPDATED',
        aggregateId: 'admin_123',
        aggregateType: 'Admin',
        timestamp: new Date('2026-01-19T00:00:00.000Z'),
        version: 1,
        actor: {
          id: 'actor_123',
          type: 'ADMIN',
        },
        payload: {
          adminId: 'admin_123',
          changedFields: ['name', 'email'],
        },
        metadata: {
          actorEmail: 'actor@example.com',
          actorName: 'Actor User',
          actorRole: 'SUPER_ADMIN',
          ipAddress: '192.168.1.1',
          serviceId: 'svc_123',
          traceId: 'trace_123',
          spanId: 'span_123',
        },
      };

      const result = mapper.mapAdminUpdatedToAuditLog(event);

      expect(result).toMatchObject({
        action: 'update',
        target_id: 'admin_123',
        target_identifier: 'admin_123',
        operation_type: 'UPDATE',
        changed_fields: ['name', 'email'],
        compliance_tags: ['ADMIN_MANAGEMENT', 'DATA_MODIFICATION'],
        pii_accessed: true,
        pii_fields: ['name', 'email'],
      });

      expect(result.after_state).toContain('changedFields');
    });

    it('should detect PII fields correctly', () => {
      const event: AdminUpdatedEvent = {
        eventId: 'evt_123',
        eventType: 'ADMIN_UPDATED',
        aggregateId: 'admin_123',
        aggregateType: 'Admin',
        timestamp: new Date('2026-01-19T00:00:00.000Z'),
        version: 1,
        actor: {
          id: 'actor_123',
          type: 'ADMIN',
        },
        payload: {
          adminId: 'admin_123',
          changedFields: ['roleId', 'scope'],
        },
      };

      const result = mapper.mapAdminUpdatedToAuditLog(event);

      expect(result.pii_accessed).toBe(false);
      expect(result.pii_fields).toEqual([]);
    });
  });

  describe('mapAdminDeactivatedToAuditLog', () => {
    it('should map AdminDeactivatedEvent to ClickHouse audit log', () => {
      const event: AdminDeactivatedEvent = {
        eventId: 'evt_123',
        eventType: 'ADMIN_DEACTIVATED',
        aggregateId: 'admin_123',
        aggregateType: 'Admin',
        timestamp: new Date('2026-01-19T00:00:00.000Z'),
        version: 1,
        actor: {
          id: 'actor_123',
          type: 'ADMIN',
        },
        payload: {
          adminId: 'admin_123',
          email: 'admin@example.com',
          reason: 'Policy violation',
        },
        metadata: {
          actorEmail: 'actor@example.com',
          traceId: 'trace_123',
          spanId: 'span_123',
        },
      };

      const result = mapper.mapAdminDeactivatedToAuditLog(event);

      expect(result).toMatchObject({
        action: 'deactivate',
        target_identifier: 'admin@example.com',
        operation_type: 'UPDATE',
        changed_fields: ['status'],
        reason: 'Policy violation',
        compliance_tags: ['ADMIN_MANAGEMENT', 'ACCESS_REVOCATION'],
        pii_accessed: false,
      });

      expect(result.before_state).toContain('active');
      expect(result.after_state).toContain('deactivated');
    });
  });

  describe('mapAdminReactivatedToAuditLog', () => {
    it('should map AdminReactivatedEvent to ClickHouse audit log', () => {
      const event: AdminReactivatedEvent = {
        eventId: 'evt_123',
        eventType: 'ADMIN_REACTIVATED',
        aggregateId: 'admin_123',
        aggregateType: 'Admin',
        timestamp: new Date('2026-01-19T00:00:00.000Z'),
        version: 1,
        actor: {
          id: 'actor_123',
          type: 'ADMIN',
        },
        payload: {
          adminId: 'admin_123',
          email: 'admin@example.com',
        },
      };

      const result = mapper.mapAdminReactivatedToAuditLog(event);

      expect(result).toMatchObject({
        action: 'reactivate',
        target_identifier: 'admin@example.com',
        operation_type: 'UPDATE',
        changed_fields: ['status'],
        reason: 'Admin account reactivated: admin@example.com',
        compliance_tags: ['ADMIN_MANAGEMENT', 'ACCESS_RESTORATION'],
        pii_accessed: false,
      });

      expect(result.before_state).toContain('deactivated');
      expect(result.after_state).toContain('active');
    });
  });

  describe('mapAdminInvitedToAuditLog', () => {
    it('should map AdminInvitedEvent to ClickHouse audit log', () => {
      const expiresAt = new Date('2026-01-26T00:00:00.000Z');
      const event: AdminInvitedEvent = {
        eventId: 'evt_123',
        eventType: 'ADMIN_INVITED',
        aggregateId: 'admin_123',
        aggregateType: 'Admin',
        timestamp: new Date('2026-01-19T00:00:00.000Z'),
        version: 1,
        actor: {
          id: 'actor_123',
          type: 'ADMIN',
        },
        payload: {
          invitationId: 'inv_123',
          email: 'newadmin@example.com',
          name: 'New Admin',
          roleId: 'role_123',
          type: 'EMAIL',
          expiresAt,
        },
      };

      const result = mapper.mapAdminInvitedToAuditLog(event);

      expect(result).toMatchObject({
        resource: 'admin_invitation',
        action: 'invite',
        target_id: 'inv_123',
        target_type: 'admin_invitation',
        target_identifier: 'newadmin@example.com',
        operation_type: 'INSERT',
        before_state: null,
        changed_fields: ['invitationId', 'email', 'name', 'roleId', 'expiresAt'],
        reason: 'Admin invitation sent: newadmin@example.com',
        compliance_tags: ['ADMIN_MANAGEMENT', 'INVITATION'],
        pii_accessed: true,
        pii_fields: ['email', 'name'],
      });

      expect(result.after_state).toContain('inv_123');
      expect(result.after_state).toContain('newadmin@example.com');
    });
  });

  describe('mapAdminRoleChangedToAuditLog', () => {
    it('should map AdminRoleChangedEvent to ClickHouse audit log', () => {
      const event: AdminRoleChangedEvent = {
        eventId: 'evt_123',
        eventType: 'ADMIN_ROLE_CHANGED',
        aggregateId: 'admin_123',
        aggregateType: 'Admin',
        timestamp: new Date('2026-01-19T00:00:00.000Z'),
        version: 1,
        actor: {
          id: 'actor_123',
          type: 'ADMIN',
        },
        payload: {
          adminId: 'admin_123',
          previousRoleId: 'role_old',
          newRoleId: 'role_new',
        },
      };

      const result = mapper.mapAdminRoleChangedToAuditLog(event);

      expect(result).toMatchObject({
        action: 'role_change',
        target_id: 'admin_123',
        target_identifier: 'admin_123',
        operation_type: 'UPDATE',
        changed_fields: ['roleId'],
        compliance_tags: ['ADMIN_MANAGEMENT', 'ROLE_ASSIGNMENT', 'ACCESS_CONTROL'],
        pii_accessed: false,
      });

      expect(result.before_state).toContain('role_old');
      expect(result.after_state).toContain('role_new');
      expect(result.reason).toContain('role_old');
      expect(result.reason).toContain('role_new');
    });
  });

  describe('timestamp formatting', () => {
    it('should format timestamp correctly', () => {
      const event: AdminCreatedEvent = {
        eventId: 'evt_123',
        eventType: 'ADMIN_CREATED',
        aggregateId: 'admin_123',
        aggregateType: 'Admin',
        timestamp: new Date('2026-01-19T12:34:56.789Z'),
        version: 1,
        actor: {
          id: 'actor_123',
          type: 'SYSTEM',
        },
        payload: {
          adminId: 'admin_123',
          email: 'admin@example.com',
          name: 'Admin User',
          roleId: 'role_123',
          scope: 'SYSTEM',
        },
      };

      const result = mapper.mapAdminCreatedToAuditLog(event);

      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}$/);
      expect(result.timestamp).toContain('2026-01-19');
    });
  });

  describe('retention date calculation', () => {
    it('should calculate retention date correctly for 7 years', () => {
      const event: AdminCreatedEvent = {
        eventId: 'evt_123',
        eventType: 'ADMIN_CREATED',
        aggregateId: 'admin_123',
        aggregateType: 'Admin',
        timestamp: new Date('2026-01-19T00:00:00.000Z'),
        version: 1,
        actor: {
          id: 'actor_123',
          type: 'SYSTEM',
        },
        payload: {
          adminId: 'admin_123',
          email: 'admin@example.com',
          name: 'Admin User',
          roleId: 'role_123',
          scope: 'SYSTEM',
        },
      };

      const result = mapper.mapAdminCreatedToAuditLog(event);

      expect(result.retention_until).toBe('2033-01-19');
    });
  });

  describe('checksum generation', () => {
    it('should generate consistent checksum for same event', () => {
      const event: AdminCreatedEvent = {
        eventId: 'evt_123',
        eventType: 'ADMIN_CREATED',
        aggregateId: 'admin_123',
        aggregateType: 'Admin',
        timestamp: new Date('2026-01-19T00:00:00.000Z'),
        version: 1,
        actor: {
          id: 'actor_123',
          type: 'SYSTEM',
        },
        payload: {
          adminId: 'admin_123',
          email: 'admin@example.com',
          name: 'Admin User',
          roleId: 'role_123',
          scope: 'SYSTEM',
        },
      };

      const result1 = mapper.mapAdminCreatedToAuditLog(event);
      const result2 = mapper.mapAdminCreatedToAuditLog(event);

      expect(result1.checksum).toBe(result2.checksum);
      expect(result1.checksum).toHaveLength(64); // SHA-256 hex length
    });

    it('should generate different checksum for different events', () => {
      const event1: AdminCreatedEvent = {
        eventId: 'evt_123',
        eventType: 'ADMIN_CREATED',
        aggregateId: 'admin_123',
        aggregateType: 'Admin',
        timestamp: new Date('2026-01-19T00:00:00.000Z'),
        version: 1,
        actor: {
          id: 'actor_123',
          type: 'SYSTEM',
        },
        payload: {
          adminId: 'admin_123',
          email: 'admin@example.com',
          name: 'Admin User',
          roleId: 'role_123',
          scope: 'SYSTEM',
        },
      };

      const event2: AdminCreatedEvent = {
        ...event1,
        eventId: 'evt_456',
      };

      const result1 = mapper.mapAdminCreatedToAuditLog(event1);
      const result2 = mapper.mapAdminCreatedToAuditLog(event2);

      expect(result1.checksum).not.toBe(result2.checksum);
    });
  });
});

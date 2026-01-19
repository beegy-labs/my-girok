import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { ClickHouseService } from '@my-girok/nest-common/clickhouse';
import { AdminCreatedHandler } from '../admin-created.handler';
import { AdminUpdatedHandler } from '../admin-updated.handler';
import { AdminDeactivatedHandler } from '../admin-deactivated.handler';
import { AdminReactivatedHandler } from '../admin-reactivated.handler';
import { AdminInvitedHandler } from '../admin-invited.handler';
import { AdminRoleChangedHandler } from '../admin-role-changed.handler';
import { AdminEventMapper } from '../../mappers/admin-event.mapper';
import type {
  AdminCreatedEvent,
  AdminUpdatedEvent,
  AdminDeactivatedEvent,
  AdminReactivatedEvent,
  AdminInvitedEvent,
  AdminRoleChangedEvent,
} from '@my-girok/types';

describe('Admin Event Handlers', () => {
  let clickhouseService: ClickHouseService;
  let configService: ConfigService;
  let mapper: AdminEventMapper;

  beforeEach(() => {
    clickhouseService = {
      insert: vi.fn().mockResolvedValue(undefined),
    } as any;

    configService = {
      get: vi.fn().mockReturnValue('audit_db'),
    } as any;

    mapper = new AdminEventMapper();
  });

  describe('AdminCreatedHandler', () => {
    let handler: AdminCreatedHandler;

    beforeEach(() => {
      handler = new AdminCreatedHandler(clickhouseService, configService, mapper);
    });

    it('should handle AdminCreatedEvent successfully', async () => {
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

      await handler.handle(event);

      expect(clickhouseService.insert).toHaveBeenCalledWith(
        'audit_db.admin_audit_logs',
        expect.arrayContaining([
          expect.objectContaining({
            actor_id: 'actor_123',
            target_id: 'admin_123',
            action: 'create',
          }),
        ]),
      );
    });

    it('should throw error when ClickHouse insert fails', async () => {
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

      const error = new Error('ClickHouse connection failed');
      vi.mocked(clickhouseService.insert).mockRejectedValueOnce(error);

      await expect(handler.handle(event)).rejects.toThrow(error);
    });
  });

  describe('AdminUpdatedHandler', () => {
    let handler: AdminUpdatedHandler;

    beforeEach(() => {
      handler = new AdminUpdatedHandler(clickhouseService, configService, mapper);
    });

    it('should handle AdminUpdatedEvent successfully', async () => {
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
      };

      await handler.handle(event);

      expect(clickhouseService.insert).toHaveBeenCalledWith(
        'audit_db.admin_audit_logs',
        expect.arrayContaining([
          expect.objectContaining({
            actor_id: 'actor_123',
            target_id: 'admin_123',
            action: 'update',
          }),
        ]),
      );
    });
  });

  describe('AdminDeactivatedHandler', () => {
    let handler: AdminDeactivatedHandler;

    beforeEach(() => {
      handler = new AdminDeactivatedHandler(clickhouseService, configService, mapper);
    });

    it('should handle AdminDeactivatedEvent successfully', async () => {
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
      };

      await handler.handle(event);

      expect(clickhouseService.insert).toHaveBeenCalledWith(
        'audit_db.admin_audit_logs',
        expect.arrayContaining([
          expect.objectContaining({
            actor_id: 'actor_123',
            target_id: 'admin_123',
            action: 'deactivate',
          }),
        ]),
      );
    });
  });

  describe('AdminReactivatedHandler', () => {
    let handler: AdminReactivatedHandler;

    beforeEach(() => {
      handler = new AdminReactivatedHandler(clickhouseService, configService, mapper);
    });

    it('should handle AdminReactivatedEvent successfully', async () => {
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

      await handler.handle(event);

      expect(clickhouseService.insert).toHaveBeenCalledWith(
        'audit_db.admin_audit_logs',
        expect.arrayContaining([
          expect.objectContaining({
            actor_id: 'actor_123',
            target_id: 'admin_123',
            action: 'reactivate',
          }),
        ]),
      );
    });
  });

  describe('AdminInvitedHandler', () => {
    let handler: AdminInvitedHandler;

    beforeEach(() => {
      handler = new AdminInvitedHandler(clickhouseService, configService, mapper);
    });

    it('should handle AdminInvitedEvent successfully', async () => {
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
          expiresAt: new Date('2026-01-26T00:00:00.000Z'),
        },
      };

      await handler.handle(event);

      expect(clickhouseService.insert).toHaveBeenCalledWith(
        'audit_db.admin_audit_logs',
        expect.arrayContaining([
          expect.objectContaining({
            actor_id: 'actor_123',
            target_id: 'inv_123',
            action: 'invite',
          }),
        ]),
      );
    });
  });

  describe('AdminRoleChangedHandler', () => {
    let handler: AdminRoleChangedHandler;

    beforeEach(() => {
      handler = new AdminRoleChangedHandler(clickhouseService, configService, mapper);
    });

    it('should handle AdminRoleChangedEvent successfully', async () => {
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

      await handler.handle(event);

      expect(clickhouseService.insert).toHaveBeenCalledWith(
        'audit_db.admin_audit_logs',
        expect.arrayContaining([
          expect.objectContaining({
            actor_id: 'actor_123',
            target_id: 'admin_123',
            action: 'role_change',
          }),
        ]),
      );
    });
  });

  describe('Error handling', () => {
    it('should propagate ClickHouse errors for retry', async () => {
      const handler = new AdminCreatedHandler(clickhouseService, configService, mapper);
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

      const error = new Error('Network timeout');
      vi.mocked(clickhouseService.insert).mockRejectedValueOnce(error);

      await expect(handler.handle(event)).rejects.toThrow('Network timeout');
    });
  });

  describe('Database configuration', () => {
    it('should use configured database name', async () => {
      vi.mocked(configService.get).mockReturnValue('custom_audit_db');

      const handler = new AdminCreatedHandler(clickhouseService, configService, mapper);
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

      await handler.handle(event);

      expect(clickhouseService.insert).toHaveBeenCalledWith(
        'custom_audit_db.admin_audit_logs',
        expect.any(Array),
      );
    });

    it('should fallback to default database name', async () => {
      vi.mocked(configService.get).mockReturnValue(null);

      const handler = new AdminCreatedHandler(clickhouseService, configService, mapper);
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

      await handler.handle(event);

      expect(clickhouseService.insert).toHaveBeenCalledWith(
        'audit_db.admin_audit_logs',
        expect.any(Array),
      );
    });
  });
});

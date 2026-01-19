import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdminEventsConsumer } from '../admin-events.consumer';
import {
  AdminCreatedHandler,
  AdminUpdatedHandler,
  AdminDeactivatedHandler,
  AdminReactivatedHandler,
  AdminInvitedHandler,
  AdminRoleChangedHandler,
} from '../../handlers';
import type {
  AdminCreatedEvent,
  AdminUpdatedEvent,
  AdminDeactivatedEvent,
  AdminReactivatedEvent,
  AdminInvitedEvent,
  AdminRoleChangedEvent,
} from '@my-girok/types';

describe('AdminEventsConsumer', () => {
  let consumer: AdminEventsConsumer;
  let adminCreatedHandler: AdminCreatedHandler;
  let adminUpdatedHandler: AdminUpdatedHandler;
  let adminDeactivatedHandler: AdminDeactivatedHandler;
  let adminReactivatedHandler: AdminReactivatedHandler;
  let adminInvitedHandler: AdminInvitedHandler;
  let adminRoleChangedHandler: AdminRoleChangedHandler;

  beforeEach(() => {
    adminCreatedHandler = {
      handle: vi.fn().mockResolvedValue(undefined),
    } as any;

    adminUpdatedHandler = {
      handle: vi.fn().mockResolvedValue(undefined),
    } as any;

    adminDeactivatedHandler = {
      handle: vi.fn().mockResolvedValue(undefined),
    } as any;

    adminReactivatedHandler = {
      handle: vi.fn().mockResolvedValue(undefined),
    } as any;

    adminInvitedHandler = {
      handle: vi.fn().mockResolvedValue(undefined),
    } as any;

    adminRoleChangedHandler = {
      handle: vi.fn().mockResolvedValue(undefined),
    } as any;

    consumer = new AdminEventsConsumer(
      adminCreatedHandler,
      adminUpdatedHandler,
      adminDeactivatedHandler,
      adminReactivatedHandler,
      adminInvitedHandler,
      adminRoleChangedHandler,
    );
  });

  describe('handleAdminCreated', () => {
    it('should call AdminCreatedHandler with event', async () => {
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

      await consumer.handleAdminCreated(event);

      expect(adminCreatedHandler.handle).toHaveBeenCalledWith(event);
      expect(adminCreatedHandler.handle).toHaveBeenCalledTimes(1);
    });

    it('should propagate errors from handler', async () => {
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

      const error = new Error('Handler failed');
      vi.mocked(adminCreatedHandler.handle).mockRejectedValueOnce(error);

      await expect(consumer.handleAdminCreated(event)).rejects.toThrow(error);
    });
  });

  describe('handleAdminUpdated', () => {
    it('should call AdminUpdatedHandler with event', async () => {
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

      await consumer.handleAdminUpdated(event);

      expect(adminUpdatedHandler.handle).toHaveBeenCalledWith(event);
      expect(adminUpdatedHandler.handle).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleAdminDeactivated', () => {
    it('should call AdminDeactivatedHandler with event', async () => {
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

      await consumer.handleAdminDeactivated(event);

      expect(adminDeactivatedHandler.handle).toHaveBeenCalledWith(event);
      expect(adminDeactivatedHandler.handle).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleAdminReactivated', () => {
    it('should call AdminReactivatedHandler with event', async () => {
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

      await consumer.handleAdminReactivated(event);

      expect(adminReactivatedHandler.handle).toHaveBeenCalledWith(event);
      expect(adminReactivatedHandler.handle).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleAdminInvited', () => {
    it('should call AdminInvitedHandler with event', async () => {
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

      await consumer.handleAdminInvited(event);

      expect(adminInvitedHandler.handle).toHaveBeenCalledWith(event);
      expect(adminInvitedHandler.handle).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleAdminRoleChanged', () => {
    it('should call AdminRoleChangedHandler with event', async () => {
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

      await consumer.handleAdminRoleChanged(event);

      expect(adminRoleChangedHandler.handle).toHaveBeenCalledWith(event);
      expect(adminRoleChangedHandler.handle).toHaveBeenCalledTimes(1);
    });
  });

  describe('Event routing', () => {
    it('should route different event types to correct handlers', async () => {
      const createdEvent: AdminCreatedEvent = {
        eventId: 'evt_created',
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

      const updatedEvent: AdminUpdatedEvent = {
        eventId: 'evt_updated',
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
          changedFields: ['name'],
        },
      };

      await consumer.handleAdminCreated(createdEvent);
      await consumer.handleAdminUpdated(updatedEvent);

      expect(adminCreatedHandler.handle).toHaveBeenCalledWith(createdEvent);
      expect(adminUpdatedHandler.handle).toHaveBeenCalledWith(updatedEvent);
      expect(adminCreatedHandler.handle).toHaveBeenCalledTimes(1);
      expect(adminUpdatedHandler.handle).toHaveBeenCalledTimes(1);
      expect(adminDeactivatedHandler.handle).not.toHaveBeenCalled();
      expect(adminReactivatedHandler.handle).not.toHaveBeenCalled();
      expect(adminInvitedHandler.handle).not.toHaveBeenCalled();
      expect(adminRoleChangedHandler.handle).not.toHaveBeenCalled();
    });
  });
});

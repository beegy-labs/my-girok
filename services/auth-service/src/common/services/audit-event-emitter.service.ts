import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ID } from '@my-girok/nest-common';
import type {
  AdminCreatedEvent,
  AdminUpdatedEvent,
  AdminDeactivatedEvent,
  AdminReactivatedEvent,
  AdminInvitedEvent,
  AdminRoleChangedEvent,
  EventActor,
} from '@my-girok/types';
import { KafkaProducerService } from '../../kafka/kafka-producer.service';

/**
 * Audit Event Emitter Service
 * Centralizes event emission for audit logging
 *
 * Dual-mode event emission:
 * 1. EventEmitter2: In-process event handling (always enabled)
 * 2. Kafka: Inter-service communication (optional, configurable)
 *
 * Events are consumed by audit-service for compliance logging
 */
@Injectable()
export class AuditEventEmitterService {
  private readonly logger = new Logger(AuditEventEmitterService.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  /**
   * Emit admin created event
   */
  async emitAdminCreated(params: {
    adminId: string;
    email: string;
    name: string;
    roleId: string;
    scope: 'SYSTEM' | 'TENANT';
    tenantId?: string;
    actor: EventActor;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const event: AdminCreatedEvent = {
      eventId: ID.generate(),
      eventType: 'ADMIN_CREATED',
      aggregateType: 'Admin',
      aggregateId: params.adminId,
      timestamp: new Date(),
      version: 1,
      actor: params.actor,
      metadata: params.metadata,
      payload: {
        adminId: params.adminId,
        email: params.email,
        name: params.name,
        roleId: params.roleId,
        scope: params.scope,
        tenantId: params.tenantId,
      },
    };

    await this.emitEvent('admin.created', event);
  }

  /**
   * Emit admin updated event
   */
  async emitAdminUpdated(params: {
    adminId: string;
    changedFields: string[];
    actor: EventActor;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const event: AdminUpdatedEvent = {
      eventId: ID.generate(),
      eventType: 'ADMIN_UPDATED',
      aggregateType: 'Admin',
      aggregateId: params.adminId,
      timestamp: new Date(),
      version: 1,
      actor: params.actor,
      metadata: params.metadata,
      payload: {
        adminId: params.adminId,
        changedFields: params.changedFields,
      },
    };

    await this.emitEvent('admin.updated', event);
  }

  /**
   * Emit admin deactivated event
   */
  async emitAdminDeactivated(params: {
    adminId: string;
    email: string;
    reason?: string;
    actor: EventActor;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const event: AdminDeactivatedEvent = {
      eventId: ID.generate(),
      eventType: 'ADMIN_DEACTIVATED',
      aggregateType: 'Admin',
      aggregateId: params.adminId,
      timestamp: new Date(),
      version: 1,
      actor: params.actor,
      metadata: params.metadata,
      payload: {
        adminId: params.adminId,
        email: params.email,
        reason: params.reason,
      },
    };

    await this.emitEvent('admin.deactivated', event);
  }

  /**
   * Emit admin reactivated event
   */
  async emitAdminReactivated(params: {
    adminId: string;
    email: string;
    actor: EventActor;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const event: AdminReactivatedEvent = {
      eventId: ID.generate(),
      eventType: 'ADMIN_REACTIVATED',
      aggregateType: 'Admin',
      aggregateId: params.adminId,
      timestamp: new Date(),
      version: 1,
      actor: params.actor,
      metadata: params.metadata,
      payload: {
        adminId: params.adminId,
        email: params.email,
      },
    };

    await this.emitEvent('admin.reactivated', event);
  }

  /**
   * Emit admin invited event
   */
  async emitAdminInvited(params: {
    invitationId: string;
    email: string;
    name: string;
    roleId: string;
    type: 'EMAIL' | 'DIRECT';
    expiresAt: Date;
    actor: EventActor;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const event: AdminInvitedEvent = {
      eventId: ID.generate(),
      eventType: 'ADMIN_INVITED',
      aggregateType: 'Admin',
      aggregateId: params.invitationId,
      timestamp: new Date(),
      version: 1,
      actor: params.actor,
      metadata: params.metadata,
      payload: {
        invitationId: params.invitationId,
        email: params.email,
        name: params.name,
        roleId: params.roleId,
        type: params.type,
        expiresAt: params.expiresAt,
      },
    };

    await this.emitEvent('admin.invited', event);
  }

  /**
   * Emit admin role changed event
   */
  async emitAdminRoleChanged(params: {
    adminId: string;
    previousRoleId: string;
    newRoleId: string;
    actor: EventActor;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const event: AdminRoleChangedEvent = {
      eventId: ID.generate(),
      eventType: 'ADMIN_ROLE_CHANGED',
      aggregateType: 'Admin',
      aggregateId: params.adminId,
      timestamp: new Date(),
      version: 1,
      actor: params.actor,
      metadata: params.metadata,
      payload: {
        adminId: params.adminId,
        previousRoleId: params.previousRoleId,
        newRoleId: params.newRoleId,
      },
    };

    await this.emitEvent('admin.roleChanged', event);
  }

  /**
   * Dual-mode event emission
   * 1. EventEmitter2: Always emit for in-process handlers
   * 2. Kafka: Publish to topic if enabled
   */
  private async emitEvent(topic: string, event: any): Promise<void> {
    // 1. Always emit to EventEmitter2 for in-process handling
    this.eventEmitter.emit(topic, event);

    // 2. Publish to Kafka if enabled
    try {
      await this.kafkaProducer.publishEvent(topic, event);
    } catch (error) {
      this.logger.error(`Failed to publish event to Kafka: ${topic}`, error);
      // Don't throw - EventEmitter2 already handled the event
    }
  }
}

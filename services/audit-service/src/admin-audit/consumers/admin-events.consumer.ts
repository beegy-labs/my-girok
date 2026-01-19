import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import type {
  AdminCreatedEvent,
  AdminUpdatedEvent,
  AdminDeactivatedEvent,
  AdminReactivatedEvent,
  AdminInvitedEvent,
  AdminRoleChangedEvent,
} from '@my-girok/types';
import {
  AdminCreatedHandler,
  AdminUpdatedHandler,
  AdminDeactivatedHandler,
  AdminReactivatedHandler,
  AdminInvitedHandler,
  AdminRoleChangedHandler,
} from '../handlers';

@Controller()
export class AdminEventsConsumer {
  private readonly logger = new Logger(AdminEventsConsumer.name);

  constructor(
    private readonly adminCreatedHandler: AdminCreatedHandler,
    private readonly adminUpdatedHandler: AdminUpdatedHandler,
    private readonly adminDeactivatedHandler: AdminDeactivatedHandler,
    private readonly adminReactivatedHandler: AdminReactivatedHandler,
    private readonly adminInvitedHandler: AdminInvitedHandler,
    private readonly adminRoleChangedHandler: AdminRoleChangedHandler,
  ) {}

  @EventPattern('admin.created')
  async handleAdminCreated(@Payload() event: AdminCreatedEvent) {
    this.logger.debug(`Received admin.created event: ${event.eventId}`);
    await this.adminCreatedHandler.handle(event);
  }

  @EventPattern('admin.updated')
  async handleAdminUpdated(@Payload() event: AdminUpdatedEvent) {
    this.logger.debug(`Received admin.updated event: ${event.eventId}`);
    await this.adminUpdatedHandler.handle(event);
  }

  @EventPattern('admin.deactivated')
  async handleAdminDeactivated(@Payload() event: AdminDeactivatedEvent) {
    this.logger.debug(`Received admin.deactivated event: ${event.eventId}`);
    await this.adminDeactivatedHandler.handle(event);
  }

  @EventPattern('admin.reactivated')
  async handleAdminReactivated(@Payload() event: AdminReactivatedEvent) {
    this.logger.debug(`Received admin.reactivated event: ${event.eventId}`);
    await this.adminReactivatedHandler.handle(event);
  }

  @EventPattern('admin.invited')
  async handleAdminInvited(@Payload() event: AdminInvitedEvent) {
    this.logger.debug(`Received admin.invited event: ${event.eventId}`);
    await this.adminInvitedHandler.handle(event);
  }

  @EventPattern('admin.roleChanged')
  async handleAdminRoleChanged(@Payload() event: AdminRoleChangedEvent) {
    this.logger.debug(`Received admin.roleChanged event: ${event.eventId}`);
    await this.adminRoleChangedHandler.handle(event);
  }
}

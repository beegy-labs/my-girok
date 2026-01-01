/**
 * Events Module
 *
 * Provides infrastructure for event-driven architecture:
 * - Event Bus interface for publishing and subscribing to events
 * - Outbox pattern implementation for reliable event publishing
 * - Outbox publisher for asynchronous event delivery
 */

// Event Bus
export {
  IEventBus,
  EVENT_BUS,
  PublishOptions,
  SubscribeOptions,
  Subscription,
  EventHandler,
} from './event-bus.interface';

// Outbox Event
export {
  OutboxStatus,
  OutboxEvent,
  CreateOutboxEventInput,
  OutboxProcessingResult,
} from './outbox-event.interface';

// Outbox Service
export { OutboxService, OutboxQueryOptions, OUTBOX_SERVICE } from './outbox.service';

// Outbox Publisher
export {
  OutboxPublisherService,
  OutboxPublisherOptions,
  OUTBOX_PUBLISHER_SERVICE,
} from './outbox-publisher.service';

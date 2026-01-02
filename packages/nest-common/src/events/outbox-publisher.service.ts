/**
 * Outbox Publisher Service
 *
 * Abstract service for publishing outbox events to message brokers.
 * Uses a Cron-based polling mechanism to process pending events.
 */

import { Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import type { OutboxEvent, OutboxProcessingResult } from './outbox-event.interface';
import type { OutboxService, OutboxQueryOptions } from './outbox.service';

/**
 * Publisher configuration options
 */
export interface OutboxPublisherOptions {
  /**
   * Polling interval in milliseconds
   * @default 1000 (1 second)
   */
  pollingIntervalMs?: number;

  /**
   * Maximum events to process per poll
   * @default 100
   */
  batchSize?: number;

  /**
   * Enable parallel processing of events
   * @default false
   */
  parallelProcessing?: boolean;

  /**
   * Maximum concurrent publish operations (when parallelProcessing is true)
   * @default 10
   */
  maxConcurrency?: number;

  /**
   * Threshold for considering events stuck (in ms)
   * @default 60000 (1 minute)
   */
  stuckThresholdMs?: number;

  /**
   * Enable stuck event recovery
   * @default true
   */
  enableStuckRecovery?: boolean;

  /**
   * Archive events older than this (in ms)
   * @default 604800000 (7 days)
   */
  archiveAfterMs?: number;

  /**
   * Delete archived events older than this (in ms)
   * @default 2592000000 (30 days)
   */
  deleteArchivedAfterMs?: number;

  /**
   * Enable cleanup job
   * @default true
   */
  enableCleanup?: boolean;

  /**
   * Cleanup job interval (in ms)
   * @default 3600000 (1 hour)
   */
  cleanupIntervalMs?: number;

  /**
   * Enable the publisher (set to false to disable polling)
   * @default true
   */
  enabled?: boolean;
}

/**
 * Default publisher options
 */
const DEFAULT_OPTIONS: Required<OutboxPublisherOptions> = {
  pollingIntervalMs: 1000,
  batchSize: 100,
  parallelProcessing: false,
  maxConcurrency: 10,
  stuckThresholdMs: 60000,
  enableStuckRecovery: true,
  archiveAfterMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  deleteArchivedAfterMs: 30 * 24 * 60 * 60 * 1000, // 30 days
  enableCleanup: true,
  cleanupIntervalMs: 60 * 60 * 1000, // 1 hour
  enabled: true,
};

/**
 * Abstract Outbox Publisher Service
 *
 * Provides the base implementation for polling outbox events and
 * publishing them to message brokers. Concrete implementations
 * must provide the actual publish logic.
 *
 * Features:
 * - Configurable polling interval
 * - Batch processing for efficiency
 * - Stuck event recovery
 * - Automatic cleanup of old events
 * - Graceful shutdown support
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class RedpandaOutboxPublisher extends OutboxPublisherService {
 *   constructor(
 *     outboxService: OutboxService,
 *     private readonly redpanda: RedpandaService,
 *   ) {
 *     super(outboxService, {
 *       pollingIntervalMs: 500,
 *       batchSize: 200,
 *     });
 *   }
 *
 *   protected async publishToMessageBroker(event: OutboxEvent): Promise<void> {
 *     await this.redpanda.produce(event.topic, {
 *       key: event.partitionKey,
 *       value: JSON.stringify(event.payload),
 *       headers: event.headers,
 *     });
 *   }
 * }
 * ```
 */
export abstract class OutboxPublisherService implements OnModuleInit, OnModuleDestroy {
  protected readonly logger = new Logger(this.constructor.name);
  protected readonly options: Required<OutboxPublisherOptions>;

  private pollingTimer: ReturnType<typeof setInterval> | null = null;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private isProcessing = false;
  private isShuttingDown = false;
  private lastProcessingResult: OutboxProcessingResult | null = null;

  constructor(
    protected readonly outboxService: OutboxService,
    options?: OutboxPublisherOptions,
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Publish a single event to the message broker
   *
   * This method must be implemented by concrete classes to handle
   * the actual publishing logic (Redpanda, Kafka, etc.).
   *
   * @param event - The outbox event to publish
   */
  protected abstract publishToMessageBroker(event: OutboxEvent): Promise<void>;

  /**
   * Called when the module is initialized
   * Starts the polling timer
   */
  async onModuleInit(): Promise<void> {
    if (!this.options.enabled) {
      this.logger.log('Outbox publisher is disabled');
      return;
    }

    this.startPolling();

    if (this.options.enableCleanup) {
      this.startCleanup();
    }

    this.logger.log(
      `Outbox publisher started (polling: ${this.options.pollingIntervalMs}ms, batch: ${this.options.batchSize})`,
    );
  }

  /**
   * Called when the module is destroyed
   * Stops the polling timer and waits for in-flight processing
   */
  async onModuleDestroy(): Promise<void> {
    this.isShuttingDown = true;
    this.stopPolling();
    this.stopCleanup();

    // Wait for in-flight processing to complete
    if (this.isProcessing) {
      this.logger.log('Waiting for in-flight outbox processing to complete...');
      await this.waitForProcessingComplete();
    }

    this.logger.log('Outbox publisher stopped');
  }

  /**
   * Start the polling timer
   */
  protected startPolling(): void {
    if (this.pollingTimer) {
      return;
    }

    this.pollingTimer = setInterval(() => {
      void this.poll();
    }, this.options.pollingIntervalMs);

    // Run immediately
    void this.poll();
  }

  /**
   * Stop the polling timer
   */
  protected stopPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  /**
   * Start the cleanup timer
   */
  protected startCleanup(): void {
    if (this.cleanupTimer) {
      return;
    }

    this.cleanupTimer = setInterval(() => {
      void this.cleanup();
    }, this.options.cleanupIntervalMs);
  }

  /**
   * Stop the cleanup timer
   */
  protected stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Poll for pending events and process them
   */
  protected async poll(): Promise<void> {
    // Skip if already processing or shutting down
    if (this.isProcessing || this.isShuttingDown) {
      return;
    }

    this.isProcessing = true;

    try {
      // Recover stuck events if enabled
      if (this.options.enableStuckRecovery) {
        await this.recoverStuckEvents();
      }

      // Fetch pending events
      const queryOptions: OutboxQueryOptions = {
        limit: this.options.batchSize,
        scheduledBefore: new Date(),
        orderByPriority: true,
        forUpdate: true,
      };

      const events = await this.outboxService.fetchPendingEvents(queryOptions);

      if (events.length === 0) {
        return;
      }

      // Process events
      if (this.options.parallelProcessing) {
        this.lastProcessingResult = await this.processParallel(events);
      } else {
        this.lastProcessingResult = await this.processSequential(events);
      }
    } catch (error) {
      this.logger.error(
        `Error during outbox polling: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process events sequentially
   */
  protected async processSequential(events: OutboxEvent[]): Promise<OutboxProcessingResult> {
    return this.outboxService.processBatch(events, (event) => this.publishToMessageBroker(event));
  }

  /**
   * Process events in parallel with concurrency limit
   */
  protected async processParallel(events: OutboxEvent[]): Promise<OutboxProcessingResult> {
    const startTime = Date.now();
    const result: OutboxProcessingResult = {
      published: 0,
      failed: 0,
      skipped: 0,
      durationMs: 0,
      errors: [],
    };

    // Create chunks for parallel processing
    const chunks = this.chunkArray(events, this.options.maxConcurrency);

    for (const chunk of chunks) {
      const chunkResult = await Promise.all(
        chunk.map(async (event) => {
          try {
            await this.outboxService.markAsProcessing(event.id);
            await this.publishToMessageBroker(event);
            await this.outboxService.markAsPublished(event.id);
            return { success: true, event };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            await this.outboxService.incrementRetry(event.id, errorMessage);
            return { success: false, event, error: errorMessage };
          }
        }),
      );

      for (const item of chunkResult) {
        if (item.success) {
          result.published++;
        } else {
          result.failed++;
          result.errors.push({
            eventId: item.event.id,
            error: item.error!,
          });
        }
      }
    }

    result.durationMs = Date.now() - startTime;

    if (result.published > 0 || result.failed > 0) {
      this.logger.log(
        `Processed ${events.length} outbox events in parallel: ${result.published} published, ${result.failed} failed (${result.durationMs}ms)`,
      );
    }

    return result;
  }

  /**
   * Recover stuck events
   */
  protected async recoverStuckEvents(): Promise<void> {
    try {
      const recovered = await this.outboxService.recoverStuckEvents(this.options.stuckThresholdMs);
      if (recovered > 0) {
        this.logger.warn(`Recovered ${recovered} stuck outbox events`);
      }
    } catch (error) {
      this.logger.error(
        `Error recovering stuck events: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Run cleanup job
   */
  protected async cleanup(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    try {
      // Archive old published events
      const archiveDate = new Date(Date.now() - this.options.archiveAfterMs);
      const archived = await this.outboxService.archiveOldEvents(archiveDate);
      if (archived > 0) {
        this.logger.log(`Archived ${archived} old outbox events`);
      }

      // Delete old archived events
      const deleteDate = new Date(Date.now() - this.options.deleteArchivedAfterMs);
      const deleted = await this.outboxService.deleteArchivedEvents(deleteDate);
      if (deleted > 0) {
        this.logger.log(`Deleted ${deleted} archived outbox events`);
      }
    } catch (error) {
      this.logger.error(
        `Error during outbox cleanup: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Wait for in-flight processing to complete
   */
  private async waitForProcessingComplete(timeoutMs = 30000): Promise<void> {
    const startTime = Date.now();
    while (this.isProcessing && Date.now() - startTime < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  /**
   * Split array into chunks
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  // ============================================================================
  // Public API for monitoring and control
  // ============================================================================

  /**
   * Get the last processing result
   */
  getLastProcessingResult(): OutboxProcessingResult | null {
    return this.lastProcessingResult;
  }

  /**
   * Check if the publisher is currently processing
   */
  isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }

  /**
   * Get outbox statistics
   */
  async getStatistics(): Promise<{
    pending: number;
    processing: number;
    published: number;
    failed: number;
    archived: number;
    total: number;
  }> {
    return this.outboxService.getStatistics();
  }

  /**
   * Manually trigger a poll (useful for testing)
   */
  async triggerPoll(): Promise<OutboxProcessingResult | null> {
    await this.poll();
    return this.lastProcessingResult;
  }

  /**
   * Manually trigger cleanup (useful for testing)
   */
  async triggerCleanup(): Promise<void> {
    await this.cleanup();
  }
}

/**
 * Outbox Publisher Service injection token
 */
export const OUTBOX_PUBLISHER_SERVICE = Symbol('OUTBOX_PUBLISHER_SERVICE');

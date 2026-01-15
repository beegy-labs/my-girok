import { Injectable, Logger } from '@nestjs/common';
import { HealthIndicator, HealthCheckResult } from './health-indicator.interface';

/**
 * Kafka producer interface for health check
 * Compatible with KafkaJS
 */
export interface KafkaHealthCheckAdapter {
  /**
   * Check if producer is connected
   * @returns true if connected
   */
  isConnected?(): Promise<boolean>;
}

/**
 * Kafka/Redpanda Health Indicator
 *
 * Checks Kafka connectivity via producer connection status.
 * By default, this is NOT critical (async processing with retry/buffer).
 *
 * Note: Kafka failures should not fail readiness probe because:
 * - Events can be buffered and retried
 * - The service can still process synchronous requests
 * - Restarting won't help if Kafka broker is down
 *
 * @example
 * ```typescript
 * @Module({
 *   providers: [
 *     {
 *       provide: KafkaHealthIndicator,
 *       useFactory: (kafka: KafkaProducerService) =>
 *         new KafkaHealthIndicator(kafka, { critical: false }),
 *       inject: [KafkaProducerService],
 *     },
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Injectable()
export class KafkaHealthIndicator implements HealthIndicator {
  private readonly logger = new Logger(KafkaHealthIndicator.name);

  readonly name = 'kafka';
  readonly critical: boolean;

  constructor(
    private readonly kafka: KafkaHealthCheckAdapter,
    options: { critical?: boolean } = {},
  ) {
    this.critical = options.critical ?? false; // Default: not critical (async with retry)
  }

  async check(): Promise<HealthCheckResult> {
    const start = Date.now();

    try {
      // If isConnected method exists, use it
      if (this.kafka.isConnected) {
        const connected = await this.kafka.isConnected();
        return {
          status: connected ? 'up' : 'down',
          latencyMs: Date.now() - start,
          message: connected ? undefined : 'Kafka producer not connected',
        };
      }

      // Fallback: assume connected if no method available
      return {
        status: 'up',
        latencyMs: Date.now() - start,
        details: { note: 'Connection status check not available' },
      };
    } catch (error) {
      this.logger.error('Kafka health check failed', error);
      return {
        status: 'down',
        latencyMs: Date.now() - start,
        message: error instanceof Error ? error.message : 'Kafka connection failed',
      };
    }
  }
}

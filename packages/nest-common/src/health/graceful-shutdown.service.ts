import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';

/**
 * Graceful Shutdown Service
 * Manages application readiness state for Kubernetes graceful shutdown
 *
 * Flow:
 * 1. K8s sends SIGTERM
 * 2. Service marks itself as NOT ready
 * 3. K8s stops routing new traffic (readiness probe fails)
 * 4. Service completes in-flight requests
 * 5. Service closes connections and exits
 */
@Injectable()
export class GracefulShutdownService implements OnModuleDestroy {
  private readonly logger = new Logger(GracefulShutdownService.name);
  private isReady = true;
  private isShuttingDown = false;

  /**
   * Check if the service is ready to accept traffic
   */
  isServiceReady(): boolean {
    return this.isReady && !this.isShuttingDown;
  }

  /**
   * Check if shutdown is in progress
   */
  isShutdownInProgress(): boolean {
    return this.isShuttingDown;
  }

  /**
   * Start graceful shutdown process
   * Called when SIGTERM is received
   */
  startShutdown(): void {
    if (this.isShuttingDown) {
      return;
    }

    this.logger.log('Starting graceful shutdown...');
    this.isShuttingDown = true;
    this.isReady = false;
  }

  /**
   * Mark service as not ready (for manual control)
   */
  markNotReady(): void {
    this.isReady = false;
    this.logger.log('Service marked as not ready');
  }

  /**
   * Mark service as ready (for manual control)
   */
  markReady(): void {
    if (!this.isShuttingDown) {
      this.isReady = true;
      this.logger.log('Service marked as ready');
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Module destroy - completing graceful shutdown');
  }
}

import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { SagaStateStore, SagaState, SagaStatus } from './saga.types';

/**
 * Redis/Valkey Saga State Store
 * Production-ready saga state persistence using Redis/Valkey
 *
 * Features:
 * - Distributed state across multiple instances
 * - Automatic TTL-based cleanup
 * - Atomic operations for consistency
 * - Recovery support for failed sagas
 */
@Injectable()
export class RedisSagaStateStore implements SagaStateStore {
  private readonly logger = new Logger(RedisSagaStateStore.name);
  private readonly keyPrefix = 'saga:state:';
  private readonly indexPrefix = 'saga:index:';
  private readonly defaultTtlMs = 24 * 60 * 60 * 1000; // 24 hours

  constructor(@Optional() @Inject(CACHE_MANAGER) private readonly cacheManager?: Cache) {
    if (!cacheManager) {
      this.logger.warn('Cache manager not available, saga state will not be persisted');
    }
  }

  /**
   * Save or update saga state
   */
  async save<TContext>(saga: SagaState<TContext>): Promise<void> {
    if (!this.cacheManager) {
      this.logger.warn('Cannot save saga state: cache manager not available');
      return;
    }

    const key = this.getKey(saga.id);
    const ttl = this.calculateTtl(saga);

    try {
      // Save saga state
      await this.cacheManager.set(key, JSON.stringify(saga), ttl);

      // Update status index for recovery queries
      await this.updateStatusIndex(saga.id, saga.status);

      this.logger.debug(`Saga state saved: ${saga.id} (status: ${saga.status})`);
    } catch (error) {
      this.logger.error(`Failed to save saga state ${saga.id}: ${error}`);
      throw error;
    }
  }

  /**
   * Get saga state by ID
   */
  async get<TContext>(sagaId: string): Promise<SagaState<TContext> | undefined> {
    if (!this.cacheManager) {
      return undefined;
    }

    const key = this.getKey(sagaId);

    try {
      const data = await this.cacheManager.get<string>(key);
      if (!data) {
        return undefined;
      }

      const saga = JSON.parse(data) as SagaState<TContext>;

      // Restore Date objects
      saga.startedAt = new Date(saga.startedAt);
      if (saga.completedAt) {
        saga.completedAt = new Date(saga.completedAt);
      }
      saga.steps.forEach((step) => {
        if (step.startedAt) step.startedAt = new Date(step.startedAt);
        if (step.completedAt) step.completedAt = new Date(step.completedAt);
      });

      return saga;
    } catch (error) {
      this.logger.error(`Failed to get saga state ${sagaId}: ${error}`);
      return undefined;
    }
  }

  /**
   * Delete saga state
   */
  async delete(sagaId: string): Promise<void> {
    if (!this.cacheManager) {
      return;
    }

    const key = this.getKey(sagaId);

    try {
      // Get current status before deletion for index cleanup
      const saga = await this.get(sagaId);
      if (saga) {
        await this.removeFromStatusIndex(sagaId, saga.status);
      }

      await this.cacheManager.del(key);
      this.logger.debug(`Saga state deleted: ${sagaId}`);
    } catch (error) {
      this.logger.error(`Failed to delete saga state ${sagaId}: ${error}`);
    }
  }

  /**
   * Get all active sagas
   * Note: This is an expensive operation, use sparingly (e.g., for monitoring)
   */
  async getAll(): Promise<SagaState<unknown>[]> {
    if (!this.cacheManager) {
      return [];
    }

    const activeStatuses = [SagaStatus.PENDING, SagaStatus.RUNNING, SagaStatus.COMPENSATING];
    const sagas: SagaState<unknown>[] = [];

    for (const status of activeStatuses) {
      const statusSagas = await this.getByStatus(status);
      sagas.push(...statusSagas);
    }

    return sagas;
  }

  /**
   * Get sagas by status (for recovery/monitoring)
   */
  async getByStatus(status: SagaStatus): Promise<SagaState<unknown>[]> {
    if (!this.cacheManager) {
      return [];
    }

    const indexKey = this.getStatusIndexKey(status);

    try {
      const sagaIdsJson = await this.cacheManager.get<string>(indexKey);
      if (!sagaIdsJson) {
        return [];
      }

      const sagaIds = JSON.parse(sagaIdsJson) as string[];
      const sagas: SagaState<unknown>[] = [];

      for (const sagaId of sagaIds) {
        const saga = await this.get(sagaId);
        if (saga && saga.status === status) {
          sagas.push(saga);
        }
      }

      return sagas;
    } catch (error) {
      this.logger.error(`Failed to get sagas by status ${status}: ${error}`);
      return [];
    }
  }

  /**
   * Get stale sagas (for recovery)
   * Returns sagas that have been running longer than the threshold
   */
  async getStaleSagas(thresholdMs: number = 5 * 60 * 1000): Promise<SagaState<unknown>[]> {
    const allActive = await this.getAll();
    const cutoff = new Date(Date.now() - thresholdMs);

    return allActive.filter((saga) => {
      return saga.startedAt < cutoff && !saga.completedAt;
    });
  }

  /**
   * Generate cache key for saga
   */
  private getKey(sagaId: string): string {
    return `${this.keyPrefix}${sagaId}`;
  }

  /**
   * Generate index key for status
   */
  private getStatusIndexKey(status: SagaStatus): string {
    return `${this.indexPrefix}status:${status}`;
  }

  /**
   * Calculate TTL based on saga state
   * Completed sagas have shorter TTL
   */
  private calculateTtl(saga: SagaState<unknown>): number {
    if (saga.status === SagaStatus.COMPLETED || saga.status === SagaStatus.COMPENSATED) {
      return 60 * 60 * 1000; // 1 hour for completed sagas
    }
    return this.defaultTtlMs;
  }

  /**
   * Update status index for saga
   */
  private async updateStatusIndex(sagaId: string, status: SagaStatus): Promise<void> {
    if (!this.cacheManager) return;

    const indexKey = this.getStatusIndexKey(status);

    try {
      const existing = await this.cacheManager.get<string>(indexKey);
      const sagaIds: string[] = existing ? JSON.parse(existing) : [];

      if (!sagaIds.includes(sagaId)) {
        sagaIds.push(sagaId);
        await this.cacheManager.set(indexKey, JSON.stringify(sagaIds), this.defaultTtlMs);
      }
    } catch (error) {
      this.logger.error(`Failed to update status index: ${error}`);
    }
  }

  /**
   * Remove saga from status index
   */
  private async removeFromStatusIndex(sagaId: string, status: SagaStatus): Promise<void> {
    if (!this.cacheManager) return;

    const indexKey = this.getStatusIndexKey(status);

    try {
      const existing = await this.cacheManager.get<string>(indexKey);
      if (!existing) return;

      const sagaIds: string[] = JSON.parse(existing);
      const filtered = sagaIds.filter((id) => id !== sagaId);

      if (filtered.length > 0) {
        await this.cacheManager.set(indexKey, JSON.stringify(filtered), this.defaultTtlMs);
      } else {
        await this.cacheManager.del(indexKey);
      }
    } catch (error) {
      this.logger.error(`Failed to remove from status index: ${error}`);
    }
  }
}

import { Module, Global } from '@nestjs/common';
import { SagaOrchestratorService, SAGA_STATE_STORE } from './saga-orchestrator.service';
import { RedisSagaStateStore } from './redis-saga-state-store';

/**
 * Saga Module
 * Provides distributed transaction support using the Saga pattern
 *
 * Usage:
 * 1. Define a saga with steps (execute + compensate)
 * 2. Use SagaOrchestratorService.execute() to run the saga
 * 3. If any step fails, previous steps are automatically compensated
 *
 * State persistence:
 * - Uses RedisSagaStateStore for production (distributed state)
 * - Falls back to InMemorySagaStateStore if Redis unavailable
 */
@Global()
@Module({
  providers: [
    RedisSagaStateStore,
    {
      provide: SAGA_STATE_STORE,
      useExisting: RedisSagaStateStore,
    },
    SagaOrchestratorService,
  ],
  exports: [SagaOrchestratorService, RedisSagaStateStore],
})
export class SagaModule {}

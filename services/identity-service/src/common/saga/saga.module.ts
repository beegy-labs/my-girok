import { Module, Global } from '@nestjs/common';
import { SagaOrchestratorService } from './saga-orchestrator.service';

/**
 * Saga Module
 * Provides distributed transaction support using the Saga pattern
 *
 * Usage:
 * 1. Define a saga with steps (execute + compensate)
 * 2. Use SagaOrchestratorService.execute() to run the saga
 * 3. If any step fails, previous steps are automatically compensated
 */
@Global()
@Module({
  providers: [SagaOrchestratorService],
  exports: [SagaOrchestratorService],
})
export class SagaModule {}

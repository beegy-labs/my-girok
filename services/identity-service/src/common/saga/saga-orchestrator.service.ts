import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { ID } from '@my-girok/nest-common';
import {
  SagaDefinition,
  SagaState,
  SagaResult,
  SagaStatus,
  SagaStepStatus,
  SagaStepState,
  SagaStepDefinition,
  SagaStateStore,
  InMemorySagaStateStore,
} from './saga.types';
import { RETRY } from '../constants';

/**
 * Injection token for saga state store
 * Use this to provide a custom persistence backend (Redis, database, etc.)
 */
export const SAGA_STATE_STORE = 'SAGA_STATE_STORE';

/**
 * Saga Orchestrator Service
 * Implements the Saga pattern for distributed transactions
 *
 * Features:
 * - Sequential step execution with automatic compensation on failure
 * - Retry support with exponential backoff
 * - Step-level and saga-level state tracking
 * - Compensation (rollback) for all completed steps on failure
 * - Pluggable state store for persistence (memory, Redis, database)
 *
 * Default: InMemorySagaStateStore (suitable for short-lived sagas)
 * Production: Inject a RedisSagaStateStore or DatabaseSagaStateStore via SAGA_STATE_STORE
 */
@Injectable()
export class SagaOrchestratorService {
  private readonly logger = new Logger(SagaOrchestratorService.name);
  private readonly stateStore: SagaStateStore;

  constructor(
    @Optional()
    @Inject(SAGA_STATE_STORE)
    stateStore?: SagaStateStore,
  ) {
    this.stateStore = stateStore ?? new InMemorySagaStateStore();
    this.logger.log(`Using saga state store: ${this.stateStore.constructor.name}`);
  }

  /**
   * Execute a saga with the given definition and initial context
   */
  async execute<TContext>(
    definition: SagaDefinition<TContext>,
    initialContext: TContext,
  ): Promise<SagaResult<TContext>> {
    const sagaId = ID.generate();
    const saga = this.initializeSaga(sagaId, definition, initialContext);

    await this.stateStore.save(saga);
    this.logger.log(`Saga started: ${definition.name} [${sagaId}]`);

    try {
      // Execute steps sequentially
      for (let i = 0; i < definition.steps.length; i++) {
        saga.currentStep = i;
        const step = definition.steps[i];
        const stepState = saga.steps[i];

        try {
          saga.context = await this.executeStep(step, saga.context, stepState);
          stepState.status = SagaStepStatus.COMPLETED;
          stepState.completedAt = new Date();
          await this.stateStore.save(saga); // Persist after each step
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          stepState.status = SagaStepStatus.FAILED;
          stepState.error = errorMessage;
          saga.error = `Step "${step.name}" failed: ${errorMessage}`;
          saga.status = SagaStatus.FAILED;
          await this.stateStore.save(saga);

          this.logger.error(`Saga step failed: ${step.name} [${sagaId}]`, error);

          // Start compensation
          await this.compensate(saga, definition, i - 1);
          break;
        }
      }

      // All steps completed successfully
      if (saga.status !== SagaStatus.FAILED && saga.status !== SagaStatus.COMPENSATED) {
        saga.status = SagaStatus.COMPLETED;
        saga.completedAt = new Date();
        await this.stateStore.save(saga);
        this.logger.log(`Saga completed: ${definition.name} [${sagaId}]`);
      }
    } finally {
      // Clean up completed/compensated sagas from store
      await this.stateStore.delete(sagaId);
    }

    return this.buildResult(saga);
  }

  /**
   * Initialize saga state
   */
  private initializeSaga<TContext>(
    sagaId: string,
    definition: SagaDefinition<TContext>,
    context: TContext,
  ): SagaState<TContext> {
    return {
      id: sagaId,
      name: definition.name,
      status: SagaStatus.RUNNING,
      context,
      steps: definition.steps.map((step) => ({
        name: step.name,
        status: SagaStepStatus.PENDING,
        retryCount: 0,
      })),
      currentStep: 0,
      startedAt: new Date(),
    };
  }

  /**
   * Execute a single step with retry support
   */
  private async executeStep<TContext>(
    step: SagaStepDefinition<TContext>,
    context: TContext,
    stepState: SagaStepState,
  ): Promise<TContext> {
    const retryConfig = step.retryConfig || {
      maxRetries: RETRY.MAX_RETRIES,
      delayMs: RETRY.DELAY_MS,
      backoffMultiplier: RETRY.BACKOFF_MULTIPLIER,
    };

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        stepState.status = SagaStepStatus.EXECUTING;
        stepState.startedAt = new Date();
        stepState.retryCount = attempt;

        return await step.execute(context);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < retryConfig.maxRetries) {
          const delay = retryConfig.delayMs * Math.pow(retryConfig.backoffMultiplier, attempt);
          this.logger.warn(
            `Step "${step.name}" failed (attempt ${attempt + 1}/${retryConfig.maxRetries + 1}), retrying in ${delay}ms`,
          );
          await this.delay(delay);
        }
      }
    }

    throw lastError;
  }

  /**
   * Compensate completed steps in reverse order
   */
  private async compensate<TContext>(
    saga: SagaState<TContext>,
    definition: SagaDefinition<TContext>,
    fromStep: number,
  ): Promise<void> {
    saga.status = SagaStatus.COMPENSATING;
    await this.stateStore.save(saga);
    this.logger.log(`Starting compensation for saga [${saga.id}]`);

    // Compensate in reverse order
    for (let i = fromStep; i >= 0; i--) {
      const step = definition.steps[i];
      const stepState = saga.steps[i];

      if (stepState.status !== SagaStepStatus.COMPLETED) {
        continue;
      }

      try {
        stepState.status = SagaStepStatus.COMPENSATING;
        await this.stateStore.save(saga);
        await step.compensate(saga.context);
        stepState.status = SagaStepStatus.COMPENSATED;
        await this.stateStore.save(saga);
        this.logger.debug(`Compensated step: ${step.name} [${saga.id}]`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        stepState.status = SagaStepStatus.COMPENSATION_FAILED;
        stepState.error = `Compensation failed: ${errorMessage}`;
        await this.stateStore.save(saga);
        this.logger.error(`Compensation failed for step: ${step.name} [${saga.id}]`, error);
        // Continue compensating other steps even if one fails
      }
    }

    saga.status = SagaStatus.COMPENSATED;
    saga.completedAt = new Date();
    await this.stateStore.save(saga);
    this.logger.log(`Saga compensated: ${saga.name} [${saga.id}]`);
  }

  /**
   * Build saga result
   */
  private buildResult<TContext>(saga: SagaState<TContext>): SagaResult<TContext> {
    return {
      success: saga.status === SagaStatus.COMPLETED,
      sagaId: saga.id,
      status: saga.status,
      context: saga.context,
      error: saga.error,
      steps: saga.steps,
    };
  }

  /**
   * Get active saga by ID
   */
  async getActiveSaga(sagaId: string): Promise<SagaState<unknown> | undefined> {
    return this.stateStore.get(sagaId);
  }

  /**
   * Get all active sagas
   * Note: Only available if the state store supports getAll()
   */
  async getActiveSagas(): Promise<SagaState<unknown>[]> {
    if (this.stateStore.getAll) {
      return this.stateStore.getAll();
    }
    this.logger.warn('getActiveSagas() not supported by current state store');
    return [];
  }

  /**
   * Get sagas by status (for recovery/monitoring)
   * Note: Only available if the state store supports getByStatus()
   */
  async getSagasByStatus(status: SagaStatus): Promise<SagaState<unknown>[]> {
    if (this.stateStore.getByStatus) {
      return this.stateStore.getByStatus(status);
    }
    this.logger.warn('getSagasByStatus() not supported by current state store');
    return [];
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

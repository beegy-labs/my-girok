import { Injectable, Logger } from '@nestjs/common';
import { ID } from '@my-girok/nest-common';
import {
  SagaDefinition,
  SagaState,
  SagaResult,
  SagaStatus,
  SagaStepStatus,
  SagaStepState,
  SagaStepDefinition,
} from './saga.types';

/**
 * Saga Orchestrator Service
 * Implements the Saga pattern for distributed transactions
 *
 * Features:
 * - Sequential step execution with automatic compensation on failure
 * - Retry support with exponential backoff
 * - Step-level and saga-level state tracking
 * - Compensation (rollback) for all completed steps on failure
 */
@Injectable()
export class SagaOrchestratorService {
  private readonly logger = new Logger(SagaOrchestratorService.name);
  private readonly activeSagas = new Map<string, SagaState<unknown>>();

  /**
   * Execute a saga with the given definition and initial context
   */
  async execute<TContext>(
    definition: SagaDefinition<TContext>,
    initialContext: TContext,
  ): Promise<SagaResult<TContext>> {
    const sagaId = ID.generate();
    const saga = this.initializeSaga(sagaId, definition, initialContext);

    this.activeSagas.set(sagaId, saga as SagaState<unknown>);
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
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          stepState.status = SagaStepStatus.FAILED;
          stepState.error = errorMessage;
          saga.error = `Step "${step.name}" failed: ${errorMessage}`;
          saga.status = SagaStatus.FAILED;

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
        this.logger.log(`Saga completed: ${definition.name} [${sagaId}]`);
      }
    } finally {
      this.activeSagas.delete(sagaId);
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
      maxRetries: 3,
      delayMs: 1000,
      backoffMultiplier: 2,
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
        await step.compensate(saga.context);
        stepState.status = SagaStepStatus.COMPENSATED;
        this.logger.debug(`Compensated step: ${step.name} [${saga.id}]`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        stepState.status = SagaStepStatus.COMPENSATION_FAILED;
        stepState.error = `Compensation failed: ${errorMessage}`;
        this.logger.error(`Compensation failed for step: ${step.name} [${saga.id}]`, error);
        // Continue compensating other steps even if one fails
      }
    }

    saga.status = SagaStatus.COMPENSATED;
    saga.completedAt = new Date();
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
  getActiveSaga(sagaId: string): SagaState<unknown> | undefined {
    return this.activeSagas.get(sagaId);
  }

  /**
   * Get all active sagas
   */
  getActiveSagas(): SagaState<unknown>[] {
    return Array.from(this.activeSagas.values());
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

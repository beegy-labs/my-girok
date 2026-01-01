import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
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
import { RETRY } from '../constants';

/**
 * Saga configuration options
 */
export interface SagaOptions {
  /** Step execution timeout in milliseconds (default: 30s) */
  stepTimeoutMs?: number;
  /** Total saga timeout in milliseconds (default: 5 min) */
  sagaTimeoutMs?: number;
  /** Whether to persist saga state (default: false) */
  persistState?: boolean;
}

/**
 * Default saga options
 */
const DEFAULT_OPTIONS: Required<SagaOptions> = {
  stepTimeoutMs: 30000, // 30 seconds
  sagaTimeoutMs: 5 * 60 * 1000, // 5 minutes
  persistState: false,
};

/**
 * Saga Orchestrator Service
 *
 * Implements the Saga pattern for distributed transactions.
 *
 * 2026 Best Practices:
 * - Sequential step execution with automatic compensation on failure
 * - Retry support with exponential backoff
 * - Step-level and saga-level state tracking
 * - Compensation (rollback) for all completed steps on failure
 * - Timeout enforcement at step and saga level
 * - Graceful cleanup on module destroy
 */
@Injectable()
export class SagaOrchestratorService implements OnModuleDestroy {
  private readonly logger = new Logger(SagaOrchestratorService.name);
  private readonly activeSagas = new Map<string, SagaState<unknown>>();
  private readonly sagaTimeouts = new Map<string, NodeJS.Timeout>();

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy() {
    this.logger.log(`Cleaning up ${this.activeSagas.size} active sagas...`);

    // Clear all timeouts
    for (const timeout of this.sagaTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.sagaTimeouts.clear();

    // Mark remaining sagas as interrupted
    for (const saga of this.activeSagas.values()) {
      saga.status = SagaStatus.FAILED;
      saga.error = 'Service shutdown during saga execution';
      saga.completedAt = new Date();
    }

    this.activeSagas.clear();
    this.logger.log('Saga cleanup complete');
  }

  /**
   * Execute a saga with the given definition and initial context
   */
  async execute<TContext>(
    definition: SagaDefinition<TContext>,
    initialContext: TContext,
    options?: SagaOptions,
  ): Promise<SagaResult<TContext>> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const sagaId = ID.generate();
    const saga = this.initializeSaga(sagaId, definition, initialContext);

    this.activeSagas.set(sagaId, saga as SagaState<unknown>);
    this.logger.log(`Saga started: ${definition.name} [${sagaId}]`);

    // Set saga-level timeout
    const sagaTimeoutPromise = this.createSagaTimeout(sagaId, opts.sagaTimeoutMs);

    try {
      // Race between saga execution and timeout
      await Promise.race([this.executeSteps(saga, definition, opts), sagaTimeoutPromise]);

      // All steps completed successfully
      if (saga.status !== SagaStatus.FAILED && saga.status !== SagaStatus.COMPENSATED) {
        saga.status = SagaStatus.COMPLETED;
        saga.completedAt = new Date();
        this.logger.log(`Saga completed: ${definition.name} [${sagaId}]`);
      }
    } catch (error) {
      // Handle timeout or other errors
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (saga.status !== SagaStatus.FAILED && saga.status !== SagaStatus.COMPENSATED) {
        saga.status = SagaStatus.FAILED;
        saga.error = errorMessage;
        saga.completedAt = new Date();

        // Attempt compensation for completed steps
        await this.compensate(saga, definition, saga.currentStep - 1);
      }

      this.logger.error(`Saga failed: ${definition.name} [${sagaId}]: ${errorMessage}`);
    } finally {
      // Clear timeout and remove saga from active list
      this.clearSagaTimeout(sagaId);
      this.activeSagas.delete(sagaId);
    }

    return this.buildResult(saga);
  }

  /**
   * Create a saga-level timeout
   */
  private createSagaTimeout(sagaId: string, timeoutMs: number): Promise<never> {
    return new Promise((_, reject) => {
      const timeout = setTimeout(() => {
        const saga = this.activeSagas.get(sagaId);
        if (saga && saga.status === SagaStatus.RUNNING) {
          saga.status = SagaStatus.FAILED;
          saga.error = `Saga timeout exceeded (${timeoutMs}ms)`;
          this.logger.error(`Saga timeout: [${sagaId}] exceeded ${timeoutMs}ms`);
        }
        reject(new Error(`Saga timeout exceeded (${timeoutMs}ms)`));
      }, timeoutMs);

      this.sagaTimeouts.set(sagaId, timeout);
    });
  }

  /**
   * Clear saga timeout
   */
  private clearSagaTimeout(sagaId: string): void {
    const timeout = this.sagaTimeouts.get(sagaId);
    if (timeout) {
      clearTimeout(timeout);
      this.sagaTimeouts.delete(sagaId);
    }
  }

  /**
   * Execute all saga steps
   */
  private async executeSteps<TContext>(
    saga: SagaState<TContext>,
    definition: SagaDefinition<TContext>,
    opts: Required<SagaOptions>,
  ): Promise<void> {
    for (let i = 0; i < definition.steps.length; i++) {
      saga.currentStep = i;
      const step = definition.steps[i];
      const stepState = saga.steps[i];

      try {
        saga.context = await this.executeStep(step, saga.context, stepState, opts.stepTimeoutMs);
        stepState.status = SagaStepStatus.COMPLETED;
        stepState.completedAt = new Date();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        stepState.status = SagaStepStatus.FAILED;
        stepState.error = errorMessage;
        saga.error = `Step "${step.name}" failed: ${errorMessage}`;
        saga.status = SagaStatus.FAILED;

        this.logger.error(`Saga step failed: ${step.name} [${saga.id}]`, error);

        // Start compensation
        await this.compensate(saga, definition, i - 1);
        break;
      }
    }
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
   * Execute a single step with retry support and timeout
   */
  private async executeStep<TContext>(
    step: SagaStepDefinition<TContext>,
    context: TContext,
    stepState: SagaStepState,
    stepTimeoutMs: number,
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

        // Execute step with timeout
        const result = await this.withTimeout(
          step.execute(context),
          stepTimeoutMs,
          `Step "${step.name}" timeout exceeded (${stepTimeoutMs}ms)`,
        );

        return result;
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
   * Wrap a promise with a timeout
   */
  private withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
    let timeoutId: NodeJS.Timeout;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]).finally(() => {
      clearTimeout(timeoutId);
    });
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

        // Execute compensation with timeout (use step timeout)
        await this.withTimeout(
          step.compensate(saga.context),
          DEFAULT_OPTIONS.stepTimeoutMs,
          `Compensation timeout for step "${step.name}"`,
        );

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
   * Get count of active sagas
   */
  getActiveSagaCount(): number {
    return this.activeSagas.size;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

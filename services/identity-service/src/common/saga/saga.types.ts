/**
 * Saga step status
 */
export enum SagaStepStatus {
  PENDING = 'PENDING',
  EXECUTING = 'EXECUTING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  COMPENSATING = 'COMPENSATING',
  COMPENSATED = 'COMPENSATED',
  COMPENSATION_FAILED = 'COMPENSATION_FAILED',
}

/**
 * Saga status
 */
export enum SagaStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  COMPENSATING = 'COMPENSATING',
  COMPENSATED = 'COMPENSATED',
}

/**
 * Saga step definition
 */
export interface SagaStepDefinition<TContext> {
  /** Step name */
  name: string;
  /** Execute the step */
  execute: (context: TContext) => Promise<TContext>;
  /** Compensate (rollback) the step */
  compensate: (context: TContext) => Promise<void>;
  /** Retry configuration */
  retryConfig?: {
    maxRetries: number;
    delayMs: number;
    backoffMultiplier: number;
  };
}

/**
 * Saga step state
 */
export interface SagaStepState {
  name: string;
  status: SagaStepStatus;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  retryCount: number;
}

/**
 * Saga state
 */
export interface SagaState<TContext> {
  id: string;
  name: string;
  status: SagaStatus;
  context: TContext;
  steps: SagaStepState[];
  currentStep: number;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

/**
 * Saga execution result
 */
export interface SagaResult<TContext> {
  success: boolean;
  sagaId: string;
  status: SagaStatus;
  context: TContext;
  error?: string;
  steps: SagaStepState[];
}

/**
 * Saga definition
 */
export interface SagaDefinition<TContext> {
  name: string;
  steps: SagaStepDefinition<TContext>[];
}

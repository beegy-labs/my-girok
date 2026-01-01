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

/**
 * Saga state store interface
 * Allows pluggable persistence backends (memory, Redis, database)
 *
 * Default implementation: InMemorySagaStateStore (for short-lived sagas)
 * Production recommendation: RedisSagaStateStore or DatabaseSagaStateStore
 */
export interface SagaStateStore {
  /**
   * Save or update saga state
   */
  save<TContext>(saga: SagaState<TContext>): Promise<void>;

  /**
   * Get saga state by ID
   */
  get<TContext>(sagaId: string): Promise<SagaState<TContext> | undefined>;

  /**
   * Delete saga state
   */
  delete(sagaId: string): Promise<void>;

  /**
   * Get all active sagas (optional, for monitoring)
   */
  getAll?(): Promise<SagaState<unknown>[]>;

  /**
   * Get sagas by status (optional, for recovery)
   */
  getByStatus?(status: SagaStatus): Promise<SagaState<unknown>[]>;
}

/**
 * In-memory saga state store (default)
 * Suitable for short-lived sagas within a single request
 * NOT suitable for long-running sagas or multi-instance deployments
 */
export class InMemorySagaStateStore implements SagaStateStore {
  private readonly store = new Map<string, SagaState<unknown>>();

  async save<TContext>(saga: SagaState<TContext>): Promise<void> {
    this.store.set(saga.id, saga as SagaState<unknown>);
  }

  async get<TContext>(sagaId: string): Promise<SagaState<TContext> | undefined> {
    return this.store.get(sagaId) as SagaState<TContext> | undefined;
  }

  async delete(sagaId: string): Promise<void> {
    this.store.delete(sagaId);
  }

  async getAll(): Promise<SagaState<unknown>[]> {
    return Array.from(this.store.values());
  }

  async getByStatus(status: SagaStatus): Promise<SagaState<unknown>[]> {
    return Array.from(this.store.values()).filter((s) => s.status === status);
  }
}

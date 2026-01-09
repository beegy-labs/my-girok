/**
 * Tests for gRPC Resilience Utilities
 *
 * Tests cover:
 * 1. Circuit Breaker pattern (CLOSED, OPEN, HALF_OPEN states)
 * 2. Retry logic with exponential backoff
 * 3. Timeout handling
 * 4. Error classification (retryable vs non-retryable)
 * 5. firstValueFrom usage with RxJS 8
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock @my-girok/types module before any imports
vi.mock('@my-girok/types', () => ({
  // Identity mappings
  AccountStatusProto: { ACTIVE: 2 },
  AccountModeProto: { USER: 1 },
  protoToAccountStatus: vi.fn(),
  protoToAccountMode: vi.fn(),
  accountStatusToProto: vi.fn(),
  accountModeToProto: vi.fn(),
  // Auth mappings
  RoleScopeProto: { GLOBAL: 1 },
  protoToRoleScope: vi.fn(),
  roleScopeToProto: vi.fn(),
  // Operator status mappings
  OperatorStatusProto: { ACTIVE: 2 },
  protoToOperatorStatus: vi.fn(),
  operatorStatusToProto: vi.fn(),
  isActiveToOperatorStatus: vi.fn(),
  operatorStatusToIsActive: vi.fn(),
  // Auth provider mappings
  AuthProviderProto: { LOCAL: 1 },
  protoToAuthProvider: vi.fn(),
  authProviderToProto: vi.fn(),
  // Sanction severity mappings
  SanctionSeverityProto: { LOW: 1 },
  protoToSanctionSeverity: vi.fn(),
  sanctionSeverityToProto: vi.fn(),
  // Legal mappings
  ConsentTypeProto: { TERMS_OF_SERVICE: 1 },
  ConsentStatusProto: { ACTIVE: 1 },
  DocumentTypeProto: { TERMS_OF_SERVICE: 1 },
  DsrTypeProto: { ACCESS: 1 },
  DsrStatusProto: { PENDING: 1 },
  protoToConsentType: vi.fn(),
  protoToConsentStatus: vi.fn(),
  protoToDocumentType: vi.fn(),
  protoToDsrType: vi.fn(),
  protoToDsrStatus: vi.fn(),
  consentTypeToProto: vi.fn(),
  consentStatusToProto: vi.fn(),
  documentTypeToProto: vi.fn(),
  dsrTypeToProto: vi.fn(),
  dsrStatusToProto: vi.fn(),
  // Sanction mappings
  SubjectTypeProto: { USER: 1 },
  SanctionTypeProto: { WARNING: 1 },
  SanctionStatusProto: { ACTIVE: 1 },
  protoToSubjectType: vi.fn(),
  protoToSanctionType: vi.fn(),
  protoToSanctionStatus: vi.fn(),
  subjectTypeToProto: vi.fn(),
  sanctionTypeToProto: vi.fn(),
  sanctionStatusToProto: vi.fn(),
}));

// Mock @nestjs/common Logger
vi.mock('@nestjs/common', async () => {
  const actual = await vi.importActual<typeof import('@nestjs/common')>('@nestjs/common');
  return {
    ...actual,
    Logger: class MockLogger {
      log = vi.fn();
      warn = vi.fn();
      error = vi.fn();
      debug = vi.fn();
    },
  };
});

import { status as GrpcStatus } from '@grpc/grpc-js';
import { Observable, of, throwError, timer, firstValueFrom } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import {
  CircuitBreaker,
  CircuitState,
  calculateBackoffDelay,
  isRetryableError,
  retryWithBackoff,
  createGrpcResilience,
  GrpcHealthAggregator,
  grpcHealthAggregator,
  DEFAULT_RETRY_CONFIG,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
  DEFAULT_RESILIENCE_CONFIG,
  RetryConfig,
  CircuitBreakerConfig,
} from '../grpc-resilience.util';
import { GrpcError } from '../grpc.types';

describe('grpc-resilience.util', () => {
  // ==========================================================================
  // Default Configuration Tests
  // ==========================================================================
  describe('Default Configurations', () => {
    it('should have correct default retry config', () => {
      expect(DEFAULT_RETRY_CONFIG).toEqual({
        maxRetries: 3,
        initialDelayMs: 100,
        maxDelayMs: 10000,
        backoffMultiplier: 2,
        jitterFactor: 0.2,
        retryableStatusCodes: [
          GrpcStatus.UNAVAILABLE,
          GrpcStatus.DEADLINE_EXCEEDED,
          GrpcStatus.RESOURCE_EXHAUSTED,
          GrpcStatus.ABORTED,
          GrpcStatus.INTERNAL,
        ],
      });
    });

    it('should have correct default circuit breaker config', () => {
      expect(DEFAULT_CIRCUIT_BREAKER_CONFIG).toEqual({
        failureThreshold: 5,
        resetTimeoutMs: 30000,
        successThreshold: 3,
        monitorWindowMs: 60000,
      });
    });

    it('should have correct default resilience config', () => {
      expect(DEFAULT_RESILIENCE_CONFIG).toEqual({
        retry: DEFAULT_RETRY_CONFIG,
        circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
        timeoutMs: 5000,
      });
    });
  });

  // ==========================================================================
  // Circuit Breaker State Transition Tests
  // ==========================================================================
  describe('CircuitBreaker', () => {
    let circuitBreaker: CircuitBreaker;
    const config: CircuitBreakerConfig = {
      failureThreshold: 3,
      resetTimeoutMs: 1000,
      successThreshold: 2,
      monitorWindowMs: 5000,
    };

    beforeEach(() => {
      circuitBreaker = new CircuitBreaker('TestService', config);
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    describe('Initial State (CLOSED)', () => {
      it('should start in CLOSED state', () => {
        const metrics = circuitBreaker.getMetrics();
        expect(metrics.state).toBe(CircuitState.CLOSED);
        expect(metrics.failures).toBe(0);
        expect(metrics.successes).toBe(0);
      });

      it('should allow execution in CLOSED state', () => {
        expect(circuitBreaker.canExecute()).toBe(true);
      });

      it('should increment success count on success in CLOSED state', () => {
        circuitBreaker.canExecute();
        circuitBreaker.onSuccess();
        const metrics = circuitBreaker.getMetrics();
        expect(metrics.successes).toBe(1);
        expect(metrics.state).toBe(CircuitState.CLOSED);
      });

      it('should track total requests', () => {
        circuitBreaker.canExecute();
        circuitBreaker.canExecute();
        circuitBreaker.canExecute();
        const metrics = circuitBreaker.getMetrics();
        expect(metrics.totalRequests).toBe(3);
      });
    });

    describe('CLOSED to OPEN Transition', () => {
      const grpcError: GrpcError = {
        code: GrpcStatus.UNAVAILABLE,
        message: 'Service unavailable',
      };

      it('should transition to OPEN after failure threshold', () => {
        // Record failures up to threshold
        for (let i = 0; i < config.failureThreshold; i++) {
          circuitBreaker.canExecute();
          circuitBreaker.onFailure(grpcError);
        }

        const metrics = circuitBreaker.getMetrics();
        expect(metrics.state).toBe(CircuitState.OPEN);
        expect(metrics.failedRequests).toBe(config.failureThreshold);
      });

      it('should remain CLOSED if failures below threshold', () => {
        for (let i = 0; i < config.failureThreshold - 1; i++) {
          circuitBreaker.canExecute();
          circuitBreaker.onFailure(grpcError);
        }

        const metrics = circuitBreaker.getMetrics();
        expect(metrics.state).toBe(CircuitState.CLOSED);
        expect(metrics.failures).toBe(config.failureThreshold - 1);
      });

      it('should track lastFailureTime', () => {
        const now = Date.now();
        vi.setSystemTime(now);

        circuitBreaker.canExecute();
        circuitBreaker.onFailure(grpcError);

        const metrics = circuitBreaker.getMetrics();
        expect(metrics.lastFailureTime).toBe(now);
      });
    });

    describe('OPEN State Behavior', () => {
      const grpcError: GrpcError = {
        code: GrpcStatus.UNAVAILABLE,
        message: 'Service unavailable',
      };

      beforeEach(() => {
        // Force circuit to OPEN
        for (let i = 0; i < config.failureThreshold; i++) {
          circuitBreaker.canExecute();
          circuitBreaker.onFailure(grpcError);
        }
      });

      it('should reject execution in OPEN state before reset timeout', () => {
        expect(circuitBreaker.canExecute()).toBe(false);
      });

      it('should transition to HALF_OPEN after reset timeout', () => {
        // Advance time past reset timeout
        vi.advanceTimersByTime(config.resetTimeoutMs + 1);

        expect(circuitBreaker.canExecute()).toBe(true);
        const metrics = circuitBreaker.getMetrics();
        expect(metrics.state).toBe(CircuitState.HALF_OPEN);
      });

      it('should update lastStateChange on transition', () => {
        const initialMetrics = circuitBreaker.getMetrics();
        const initialStateChange = initialMetrics.lastStateChange;

        vi.advanceTimersByTime(config.resetTimeoutMs + 100);
        circuitBreaker.canExecute();

        const metrics = circuitBreaker.getMetrics();
        expect(metrics.lastStateChange).toBeGreaterThan(initialStateChange);
      });
    });

    describe('HALF_OPEN State Behavior', () => {
      const grpcError: GrpcError = {
        code: GrpcStatus.UNAVAILABLE,
        message: 'Service unavailable',
      };

      beforeEach(() => {
        // Force circuit to OPEN then HALF_OPEN
        for (let i = 0; i < config.failureThreshold; i++) {
          circuitBreaker.canExecute();
          circuitBreaker.onFailure(grpcError);
        }
        vi.advanceTimersByTime(config.resetTimeoutMs + 1);
        circuitBreaker.canExecute(); // Transition to HALF_OPEN
      });

      it('should be in HALF_OPEN state', () => {
        const metrics = circuitBreaker.getMetrics();
        expect(metrics.state).toBe(CircuitState.HALF_OPEN);
      });

      it('should allow execution in HALF_OPEN state', () => {
        expect(circuitBreaker.canExecute()).toBe(true);
      });

      it('should transition to CLOSED after success threshold', () => {
        for (let i = 0; i < config.successThreshold; i++) {
          circuitBreaker.canExecute();
          circuitBreaker.onSuccess();
        }

        const metrics = circuitBreaker.getMetrics();
        expect(metrics.state).toBe(CircuitState.CLOSED);
      });

      it('should transition back to OPEN on any failure', () => {
        circuitBreaker.canExecute();
        circuitBreaker.onFailure(grpcError);

        const metrics = circuitBreaker.getMetrics();
        expect(metrics.state).toBe(CircuitState.OPEN);
      });

      it('should reset successes counter on transition to HALF_OPEN', () => {
        const metrics = circuitBreaker.getMetrics();
        expect(metrics.successes).toBe(0);
      });
    });

    describe('Reset and Force Open', () => {
      const grpcError: GrpcError = {
        code: GrpcStatus.UNAVAILABLE,
        message: 'Service unavailable',
      };

      it('should reset to initial state', () => {
        // Create some state
        for (let i = 0; i < config.failureThreshold; i++) {
          circuitBreaker.canExecute();
          circuitBreaker.onFailure(grpcError);
        }

        circuitBreaker.reset();

        const metrics = circuitBreaker.getMetrics();
        expect(metrics.state).toBe(CircuitState.CLOSED);
        expect(metrics.failures).toBe(0);
        expect(metrics.successes).toBe(0);
      });

      it('should force open the circuit', () => {
        circuitBreaker.forceOpen();

        const metrics = circuitBreaker.getMetrics();
        expect(metrics.state).toBe(CircuitState.OPEN);
      });
    });

    describe('Failure Window Cleanup', () => {
      const grpcError: GrpcError = {
        code: GrpcStatus.UNAVAILABLE,
        message: 'Service unavailable',
      };

      it('should clean up old failures outside monitor window', () => {
        // Record a failure
        circuitBreaker.canExecute();
        circuitBreaker.onFailure(grpcError);

        // Advance time past monitor window
        vi.advanceTimersByTime(config.monitorWindowMs + 1000);

        // Record another check which triggers cleanup
        circuitBreaker.canExecute();

        const metrics = circuitBreaker.getMetrics();
        // Old failure should be cleaned up
        expect(metrics.failures).toBe(0);
      });

      it('should keep failures within monitor window', () => {
        // Record failures
        circuitBreaker.canExecute();
        circuitBreaker.onFailure(grpcError);
        circuitBreaker.canExecute();
        circuitBreaker.onFailure(grpcError);

        // Advance time but stay within monitor window
        vi.advanceTimersByTime(config.monitorWindowMs / 2);

        circuitBreaker.canExecute();

        const metrics = circuitBreaker.getMetrics();
        expect(metrics.failures).toBe(2);
      });
    });
  });

  // ==========================================================================
  // Backoff Delay Calculation Tests
  // ==========================================================================
  describe('calculateBackoffDelay', () => {
    const config: RetryConfig = {
      maxRetries: 3,
      initialDelayMs: 100,
      maxDelayMs: 10000,
      backoffMultiplier: 2,
      jitterFactor: 0,
      retryableStatusCodes: [GrpcStatus.UNAVAILABLE],
    };

    it('should calculate exponential delay for first attempt', () => {
      const delay = calculateBackoffDelay(0, config);
      // 100 * 2^0 = 100
      expect(delay).toBe(100);
    });

    it('should calculate exponential delay for second attempt', () => {
      const delay = calculateBackoffDelay(1, config);
      // 100 * 2^1 = 200
      expect(delay).toBe(200);
    });

    it('should calculate exponential delay for third attempt', () => {
      const delay = calculateBackoffDelay(2, config);
      // 100 * 2^2 = 400
      expect(delay).toBe(400);
    });

    it('should cap delay at maxDelayMs', () => {
      const delay = calculateBackoffDelay(10, config);
      // 100 * 2^10 = 102400, but capped at 10000
      expect(delay).toBe(10000);
    });

    it('should apply jitter when configured', () => {
      const configWithJitter: RetryConfig = {
        ...config,
        jitterFactor: 0.2,
      };

      // Run multiple times to verify jitter adds variation
      const delays: number[] = [];
      for (let i = 0; i < 100; i++) {
        delays.push(calculateBackoffDelay(0, configWithJitter));
      }

      // With jitter factor of 0.2, delays should vary between 80 and 120
      const minDelay = Math.min(...delays);
      const maxDelay = Math.max(...delays);

      expect(minDelay).toBeGreaterThanOrEqual(80);
      expect(maxDelay).toBeLessThanOrEqual(120);
      // There should be variation
      expect(maxDelay).not.toBe(minDelay);
    });

    it('should never return negative delay', () => {
      const configWithHighJitter: RetryConfig = {
        ...config,
        jitterFactor: 1.0, // Maximum jitter
      };

      for (let i = 0; i < 100; i++) {
        const delay = calculateBackoffDelay(0, configWithHighJitter);
        expect(delay).toBeGreaterThanOrEqual(0);
      }
    });
  });

  // ==========================================================================
  // Error Classification Tests
  // ==========================================================================
  describe('isRetryableError', () => {
    const config = DEFAULT_RETRY_CONFIG;

    describe('GrpcError classification', () => {
      it('should return true for UNAVAILABLE', () => {
        const error: GrpcError = { code: GrpcStatus.UNAVAILABLE, message: 'test' };
        expect(isRetryableError(error, config)).toBe(true);
      });

      it('should return true for DEADLINE_EXCEEDED', () => {
        const error: GrpcError = { code: GrpcStatus.DEADLINE_EXCEEDED, message: 'test' };
        expect(isRetryableError(error, config)).toBe(true);
      });

      it('should return true for RESOURCE_EXHAUSTED', () => {
        const error: GrpcError = { code: GrpcStatus.RESOURCE_EXHAUSTED, message: 'test' };
        expect(isRetryableError(error, config)).toBe(true);
      });

      it('should return true for ABORTED', () => {
        const error: GrpcError = { code: GrpcStatus.ABORTED, message: 'test' };
        expect(isRetryableError(error, config)).toBe(true);
      });

      it('should return true for INTERNAL', () => {
        const error: GrpcError = { code: GrpcStatus.INTERNAL, message: 'test' };
        expect(isRetryableError(error, config)).toBe(true);
      });

      it('should return false for NOT_FOUND', () => {
        const error: GrpcError = { code: GrpcStatus.NOT_FOUND, message: 'test' };
        expect(isRetryableError(error, config)).toBe(false);
      });

      it('should return false for INVALID_ARGUMENT', () => {
        const error: GrpcError = { code: GrpcStatus.INVALID_ARGUMENT, message: 'test' };
        expect(isRetryableError(error, config)).toBe(false);
      });

      it('should return false for PERMISSION_DENIED', () => {
        const error: GrpcError = { code: GrpcStatus.PERMISSION_DENIED, message: 'test' };
        expect(isRetryableError(error, config)).toBe(false);
      });

      it('should return false for UNAUTHENTICATED', () => {
        const error: GrpcError = { code: GrpcStatus.UNAUTHENTICATED, message: 'test' };
        expect(isRetryableError(error, config)).toBe(false);
      });

      it('should return false for ALREADY_EXISTS', () => {
        const error: GrpcError = { code: GrpcStatus.ALREADY_EXISTS, message: 'test' };
        expect(isRetryableError(error, config)).toBe(false);
      });
    });

    describe('TimeoutError classification', () => {
      it('should return true for TimeoutError', () => {
        const error = new Error('Request timeout');
        error.name = 'TimeoutError';
        expect(isRetryableError(error, config)).toBe(true);
      });
    });

    describe('Connection error classification', () => {
      it('should return true for ECONNREFUSED', () => {
        const error = new Error('connect ECONNREFUSED 127.0.0.1:50051');
        expect(isRetryableError(error, config)).toBe(true);
      });

      it('should return true for unavailable message', () => {
        const error = new Error('Service unavailable');
        expect(isRetryableError(error, config)).toBe(true);
      });

      it('should return true for connection reset', () => {
        const error = new Error('connection reset by peer');
        expect(isRetryableError(error, config)).toBe(true);
      });
    });

    describe('Non-retryable errors', () => {
      it('should return false for generic Error', () => {
        const error = new Error('Some generic error');
        expect(isRetryableError(error, config)).toBe(false);
      });

      it('should return false for non-error objects', () => {
        expect(isRetryableError('string error', config)).toBe(false);
        expect(isRetryableError(123, config)).toBe(false);
        expect(isRetryableError(null, config)).toBe(false);
        expect(isRetryableError(undefined, config)).toBe(false);
      });
    });
  });

  // ==========================================================================
  // Retry with Backoff Tests
  // ==========================================================================
  describe('retryWithBackoff', () => {
    const config: RetryConfig = {
      maxRetries: 3,
      initialDelayMs: 10, // Short delay for tests
      maxDelayMs: 100,
      backoffMultiplier: 2,
      jitterFactor: 0,
      retryableStatusCodes: [GrpcStatus.UNAVAILABLE, GrpcStatus.DEADLINE_EXCEEDED],
    };

    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should pass through successful observable', async () => {
      const source$ = of('success');
      const result$ = source$.pipe(retryWithBackoff(config));

      const result = await firstValueFrom(result$);
      expect(result).toBe('success');
    });

    it('should retry retryable errors', async () => {
      let attempts = 0;
      const source$ = new Observable<string>((subscriber) => {
        attempts++;
        if (attempts < 3) {
          subscriber.error({ code: GrpcStatus.UNAVAILABLE, message: 'unavailable' });
        } else {
          subscriber.next('success');
          subscriber.complete();
        }
      });

      const result$ = source$.pipe(retryWithBackoff(config));

      // Start the subscription
      const promise = firstValueFrom(result$);

      // Advance timers for retry delays
      await vi.advanceTimersByTimeAsync(10); // First retry delay
      await vi.advanceTimersByTimeAsync(20); // Second retry delay

      const result = await promise;
      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should not retry non-retryable errors', async () => {
      let attempts = 0;
      const source$ = new Observable<string>((subscriber) => {
        attempts++;
        subscriber.error({ code: GrpcStatus.NOT_FOUND, message: 'not found' });
      });

      const result$ = source$.pipe(retryWithBackoff(config));

      await expect(firstValueFrom(result$)).rejects.toMatchObject({
        code: GrpcStatus.NOT_FOUND,
      });
      expect(attempts).toBe(1);
    });

    it('should fail after max retries', async () => {
      let attempts = 0;
      const source$ = new Observable<string>((subscriber) => {
        attempts++;
        subscriber.error({ code: GrpcStatus.UNAVAILABLE, message: 'unavailable' });
      });

      const result$ = source$.pipe(retryWithBackoff(config));

      let caughtError: unknown;
      // Start the subscription
      const promise = firstValueFrom(result$).catch((error) => {
        caughtError = error;
      });

      // Advance timers for all retry delays
      for (let i = 0; i < config.maxRetries; i++) {
        await vi.advanceTimersByTimeAsync(config.maxDelayMs);
      }

      await promise;

      expect(caughtError).toMatchObject({
        code: GrpcStatus.UNAVAILABLE,
      });
      // Initial attempt + maxRetries
      expect(attempts).toBe(config.maxRetries + 1);
    });
  });

  // ==========================================================================
  // Timeout Handling Tests
  // ==========================================================================
  describe('Timeout handling', () => {
    it('should timeout slow observables', async () => {
      vi.useFakeTimers();

      const resilience = createGrpcResilience('TestService', {
        timeoutMs: 100,
        retry: { ...DEFAULT_RETRY_CONFIG, maxRetries: 0 },
      });

      const slowObservable = () =>
        new Observable<string>(() => {
          // Never emits - simulates hung request
        });

      let caughtError: unknown;
      const promise = resilience.execute(slowObservable).catch((error) => {
        caughtError = error;
      });

      // Advance time past timeout
      await vi.advanceTimersByTimeAsync(150);
      await promise;

      expect(caughtError).toMatchObject({
        code: GrpcStatus.DEADLINE_EXCEEDED,
      });

      vi.useRealTimers();
    });

    it('should complete before timeout', async () => {
      const resilience = createGrpcResilience('TestService', {
        timeoutMs: 1000,
        retry: { ...DEFAULT_RETRY_CONFIG, maxRetries: 0 },
      });

      const fastObservable = () => of('quick response');

      const result = await resilience.execute(fastObservable);
      expect(result).toBe('quick response');
    });

    it('should allow custom timeout per call', async () => {
      vi.useFakeTimers();

      const resilience = createGrpcResilience('TestService', {
        timeoutMs: 1000, // Default 1 second
        retry: { ...DEFAULT_RETRY_CONFIG, maxRetries: 0 },
      });

      const slowObservable = () =>
        new Observable<string>(() => {
          // Never emits
        });

      let caughtError: unknown;
      // Override with shorter timeout
      const promise = resilience.execute(slowObservable, { timeoutMs: 50 }).catch((error) => {
        caughtError = error;
      });

      await vi.advanceTimersByTimeAsync(100);
      await promise;

      expect(caughtError).toMatchObject({
        code: GrpcStatus.DEADLINE_EXCEEDED,
      });

      vi.useRealTimers();
    });
  });

  // ==========================================================================
  // createGrpcResilience Integration Tests
  // ==========================================================================
  describe('createGrpcResilience', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should create resilience wrapper with default config', () => {
      const resilience = createGrpcResilience('TestService');

      const config = resilience.getConfig();
      expect(config.timeoutMs).toBe(5000);
      expect(config.retry.maxRetries).toBe(3);
      expect(config.circuitBreaker.failureThreshold).toBe(5);
    });

    it('should merge custom config with defaults', () => {
      const resilience = createGrpcResilience('TestService', {
        timeoutMs: 10000,
        retry: { maxRetries: 5 } as Partial<RetryConfig> as RetryConfig,
      });

      const config = resilience.getConfig();
      expect(config.timeoutMs).toBe(10000);
      expect(config.retry.maxRetries).toBe(5);
      expect(config.retry.initialDelayMs).toBe(100); // Default preserved
    });

    it('should execute successful calls', async () => {
      const resilience = createGrpcResilience('TestService');

      const result = await resilience.execute(() => of({ data: 'test' }));
      expect(result).toEqual({ data: 'test' });
    });

    it('should record success in circuit breaker', async () => {
      const resilience = createGrpcResilience('TestService');

      await resilience.execute(() => of('success'));

      const metrics = resilience.getMetrics();
      expect(metrics.successes).toBe(1);
      expect(metrics.state).toBe(CircuitState.CLOSED);
    });

    it('should record failure in circuit breaker', async () => {
      const resilience = createGrpcResilience('TestService', {
        retry: { ...DEFAULT_RETRY_CONFIG, maxRetries: 0 },
      });

      const error: GrpcError = { code: GrpcStatus.NOT_FOUND, message: 'Not found' };

      await expect(resilience.execute(() => throwError(() => error))).rejects.toMatchObject({
        code: GrpcStatus.NOT_FOUND,
      });

      const metrics = resilience.getMetrics();
      expect(metrics.failedRequests).toBe(1);
    });

    it('should reject when circuit is open', async () => {
      const resilience = createGrpcResilience('TestService', {
        circuitBreaker: {
          ...DEFAULT_CIRCUIT_BREAKER_CONFIG,
          failureThreshold: 2,
        },
        retry: { ...DEFAULT_RETRY_CONFIG, maxRetries: 0 },
      });

      const error: GrpcError = { code: GrpcStatus.UNAVAILABLE, message: 'unavailable' };

      // Trigger circuit breaker
      for (let i = 0; i < 2; i++) {
        await expect(resilience.execute(() => throwError(() => error))).rejects.toBeDefined();
      }

      // Circuit should be open now
      await expect(resilience.execute(() => of('should not run'))).rejects.toMatchObject({
        code: GrpcStatus.UNAVAILABLE,
        message: expect.stringContaining('Circuit breaker is open'),
      });
    });

    it('should skip circuit breaker when option set', async () => {
      const resilience = createGrpcResilience('TestService');

      // Force circuit open
      resilience.getCircuitBreaker().forceOpen();

      // Should still execute with skipCircuitBreaker
      const result = await resilience.execute(() => of('success'), { skipCircuitBreaker: true });
      expect(result).toBe('success');
    });

    it('should skip retry when option set', async () => {
      let attempts = 0;
      const resilience = createGrpcResilience('TestService');

      const error: GrpcError = { code: GrpcStatus.UNAVAILABLE, message: 'unavailable' };

      await expect(
        resilience.execute(
          () => {
            attempts++;
            return throwError(() => error);
          },
          { skipRetry: true },
        ),
      ).rejects.toBeDefined();

      // Should only attempt once with skipRetry
      expect(attempts).toBe(1);
    });

    it('should return circuit breaker instance', () => {
      const resilience = createGrpcResilience('TestService');
      const cb = resilience.getCircuitBreaker();
      expect(cb).toBeInstanceOf(CircuitBreaker);
    });

    it('should reset circuit breaker', async () => {
      const resilience = createGrpcResilience('TestService', {
        circuitBreaker: { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, failureThreshold: 1 },
        retry: { ...DEFAULT_RETRY_CONFIG, maxRetries: 0 },
      });

      const error: GrpcError = { code: GrpcStatus.UNAVAILABLE, message: 'unavailable' };

      await expect(resilience.execute(() => throwError(() => error))).rejects.toBeDefined();

      expect(resilience.getMetrics().state).toBe(CircuitState.OPEN);

      resilience.reset();

      expect(resilience.getMetrics().state).toBe(CircuitState.CLOSED);
    });
  });

  // ==========================================================================
  // GrpcHealthAggregator Tests
  // ==========================================================================
  describe('GrpcHealthAggregator', () => {
    let aggregator: GrpcHealthAggregator;

    beforeEach(() => {
      aggregator = new GrpcHealthAggregator();
    });

    it('should register services', () => {
      const resilience = createGrpcResilience('TestService');
      aggregator.register('TestService', resilience);

      const status = aggregator.getHealthStatus();
      expect(status).toHaveLength(1);
      expect(status[0].serviceName).toBe('TestService');
    });

    it('should unregister services', () => {
      const resilience = createGrpcResilience('TestService');
      aggregator.register('TestService', resilience);
      aggregator.unregister('TestService');

      const status = aggregator.getHealthStatus();
      expect(status).toHaveLength(0);
    });

    it('should report healthy status for closed circuits', () => {
      const resilience = createGrpcResilience('TestService');
      aggregator.register('TestService', resilience);

      const status = aggregator.getHealthStatus();
      expect(status[0].isHealthy).toBe(true);
      expect(status[0].circuitState).toBe(CircuitState.CLOSED);
    });

    it('should report unhealthy status for open circuits', () => {
      const resilience = createGrpcResilience('TestService');
      resilience.getCircuitBreaker().forceOpen();
      aggregator.register('TestService', resilience);

      const status = aggregator.getHealthStatus();
      expect(status[0].isHealthy).toBe(false);
      expect(status[0].circuitState).toBe(CircuitState.OPEN);
    });

    it('should check if all services are healthy', () => {
      const service1 = createGrpcResilience('Service1');
      const service2 = createGrpcResilience('Service2');

      aggregator.register('Service1', service1);
      aggregator.register('Service2', service2);

      expect(aggregator.isAllHealthy()).toBe(true);

      service1.getCircuitBreaker().forceOpen();
      expect(aggregator.isAllHealthy()).toBe(false);
    });

    it('should return unhealthy service names', () => {
      const service1 = createGrpcResilience('Service1');
      const service2 = createGrpcResilience('Service2');
      const service3 = createGrpcResilience('Service3');

      aggregator.register('Service1', service1);
      aggregator.register('Service2', service2);
      aggregator.register('Service3', service3);

      service1.getCircuitBreaker().forceOpen();
      service3.getCircuitBreaker().forceOpen();

      const unhealthy = aggregator.getUnhealthyServices();
      expect(unhealthy).toContain('Service1');
      expect(unhealthy).toContain('Service3');
      expect(unhealthy).not.toContain('Service2');
    });

    it('should include lastChecked timestamp', () => {
      vi.useFakeTimers();
      const now = Date.now();
      vi.setSystemTime(now);

      const resilience = createGrpcResilience('TestService');
      aggregator.register('TestService', resilience);

      const status = aggregator.getHealthStatus();
      expect(status[0].lastChecked).toBe(now);

      vi.useRealTimers();
    });
  });

  // ==========================================================================
  // Global Health Aggregator Tests
  // ==========================================================================
  describe('grpcHealthAggregator (global instance)', () => {
    afterEach(() => {
      // Clean up any registered services
      grpcHealthAggregator.getHealthStatus().forEach((s) => {
        grpcHealthAggregator.unregister(s.serviceName);
      });
    });

    it('should be a singleton instance', () => {
      expect(grpcHealthAggregator).toBeInstanceOf(GrpcHealthAggregator);
    });

    it('should allow registering and checking services', () => {
      const resilience = createGrpcResilience('GlobalTestService');
      grpcHealthAggregator.register('GlobalTestService', resilience);

      const status = grpcHealthAggregator.getHealthStatus();
      expect(status.find((s) => s.serviceName === 'GlobalTestService')).toBeDefined();
    });
  });

  // ==========================================================================
  // firstValueFrom Usage Tests (RxJS 8 compatibility)
  // ==========================================================================
  describe('firstValueFrom usage (RxJS 8 compatibility)', () => {
    it('should properly use firstValueFrom for observable conversion', async () => {
      const resilience = createGrpcResilience('TestService');

      // Test with immediate value
      const result = await resilience.execute(() => of({ id: '123', name: 'test' }));
      expect(result).toEqual({ id: '123', name: 'test' });
    });

    it('should handle delayed observables', async () => {
      vi.useFakeTimers();

      const resilience = createGrpcResilience('TestService', {
        timeoutMs: 1000,
      });

      const delayedObservable = () => timer(50).pipe(mergeMap(() => of('delayed result')));

      const promise = resilience.execute(delayedObservable);

      await vi.advanceTimersByTimeAsync(100);

      const result = await promise;
      expect(result).toBe('delayed result');

      vi.useRealTimers();
    });

    it('should take first value from multi-value observables', async () => {
      const resilience = createGrpcResilience('TestService');

      const multiValueObservable = () => of('first', 'second', 'third');

      const result = await resilience.execute(multiValueObservable);
      expect(result).toBe('first');
    });
  });

  // ==========================================================================
  // Default Parameter Coverage
  // ==========================================================================
  describe('Default Parameters', () => {
    it('should use default circuit breaker config when not provided', () => {
      const circuitBreaker = new CircuitBreaker('TestService');
      const metrics = circuitBreaker.getMetrics();
      expect(metrics.state).toBe(CircuitState.CLOSED);
      // Verify it uses defaults from DEFAULT_CIRCUIT_BREAKER_CONFIG
    });

    it('should use default retry config when not provided', async () => {
      const source$ = of('success');
      // Call retryWithBackoff without any config
      const result$ = source$.pipe(retryWithBackoff());
      const result = await firstValueFrom(result$);
      expect(result).toBe('success');
    });
  });

  // ==========================================================================
  // Edge Cases and Additional Coverage
  // ==========================================================================
  describe('Edge Cases', () => {
    it('should handle onSuccess in OPEN state gracefully', () => {
      const circuitBreaker = new CircuitBreaker('TestService', DEFAULT_CIRCUIT_BREAKER_CONFIG);
      circuitBreaker.forceOpen();

      // This should not throw
      circuitBreaker.onSuccess();
      expect(circuitBreaker.getMetrics().state).toBe(CircuitState.OPEN);
    });

    it('should handle onFailure in OPEN state', () => {
      const circuitBreaker = new CircuitBreaker('TestService', DEFAULT_CIRCUIT_BREAKER_CONFIG);
      circuitBreaker.forceOpen();

      const error: GrpcError = { code: GrpcStatus.UNAVAILABLE, message: 'test' };
      circuitBreaker.onFailure(error);

      // Should still be OPEN and failure recorded
      const metrics = circuitBreaker.getMetrics();
      expect(metrics.state).toBe(CircuitState.OPEN);
      expect(metrics.failedRequests).toBe(1);
    });

    it('should work with custom retryable status codes', () => {
      const customConfig: RetryConfig = {
        ...DEFAULT_RETRY_CONFIG,
        retryableStatusCodes: [GrpcStatus.NOT_FOUND], // Unusual but valid
      };

      const error: GrpcError = { code: GrpcStatus.NOT_FOUND, message: 'not found' };
      expect(isRetryableError(error, customConfig)).toBe(true);

      const unavailableError: GrpcError = { code: GrpcStatus.UNAVAILABLE, message: 'unavailable' };
      expect(isRetryableError(unavailableError, customConfig)).toBe(false);
    });

    it('should handle zero maxRetries', async () => {
      const resilience = createGrpcResilience('TestService', {
        retry: { ...DEFAULT_RETRY_CONFIG, maxRetries: 0 },
      });

      let attempts = 0;
      const error: GrpcError = { code: GrpcStatus.UNAVAILABLE, message: 'unavailable' };

      await expect(
        resilience.execute(() => {
          attempts++;
          return throwError(() => error);
        }),
      ).rejects.toBeDefined();

      expect(attempts).toBe(1);
    });

    it('should handle very small timeout', async () => {
      vi.useFakeTimers();

      const resilience = createGrpcResilience('TestService', {
        timeoutMs: 1, // 1ms timeout
        retry: { ...DEFAULT_RETRY_CONFIG, maxRetries: 0 },
      });

      const slowObservable = () =>
        new Observable<string>(() => {
          // Never emits
        });

      let caughtError: unknown;
      const promise = resilience.execute(slowObservable).catch((error) => {
        caughtError = error;
      });

      await vi.advanceTimersByTimeAsync(10);
      await promise;

      expect(caughtError).toMatchObject({
        code: GrpcStatus.DEADLINE_EXCEEDED,
      });

      vi.useRealTimers();
    });
  });
});

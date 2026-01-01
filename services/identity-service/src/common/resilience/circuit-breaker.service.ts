import { Injectable, Logger } from '@nestjs/common';

/**
 * Circuit breaker states
 */
export enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Failing, reject all requests
  HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

/**
 * Circuit breaker options
 */
export interface CircuitBreakerOptions {
  /** Name of the circuit (for logging) */
  name: string;
  /** Number of failures before opening circuit (default: 5) */
  failureThreshold?: number;
  /** Number of successful calls to close circuit (default: 3) */
  successThreshold?: number;
  /** Time in ms before attempting reset (default: 30000) */
  resetTimeoutMs?: number;
  /** Optional fallback function */
  fallback?: <T>() => Promise<T>;
}

/**
 * Circuit state tracker
 */
interface CircuitStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime?: Date;
  lastStateChange: Date;
}

/**
 * Circuit Breaker Service
 *
 * Implements the Circuit Breaker pattern for resilience.
 *
 * 2026 Best Practices:
 * - Prevents cascading failures
 * - Automatic recovery testing
 * - Configurable thresholds
 * - Named circuits for monitoring
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Circuit tripped, requests are rejected immediately
 * - HALF_OPEN: Testing recovery, limited requests allowed
 */
@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly circuits = new Map<string, CircuitStats>();

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(options: CircuitBreakerOptions, fn: () => Promise<T>): Promise<T> {
    const circuit = this.getOrCreateCircuit(options.name);
    const config = this.getConfig(options);

    // Check if circuit should transition from OPEN to HALF_OPEN
    this.checkResetTimeout(circuit, config);

    // If circuit is OPEN, fail fast
    if (circuit.state === CircuitState.OPEN) {
      this.logger.warn(`Circuit "${options.name}" is OPEN, rejecting request`);
      if (options.fallback) {
        return options.fallback<T>();
      }
      throw new CircuitBreakerOpenError(options.name);
    }

    try {
      const result = await fn();
      this.recordSuccess(circuit, config, options.name);
      return result;
    } catch (error) {
      this.recordFailure(circuit, config, options.name);
      throw error;
    }
  }

  /**
   * Get current state of a circuit
   */
  getCircuitState(name: string): CircuitState | undefined {
    return this.circuits.get(name)?.state;
  }

  /**
   * Get all circuit states (for monitoring)
   */
  getAllCircuitStates(): Record<string, CircuitStats> {
    const result: Record<string, CircuitStats> = {};
    for (const [name, stats] of this.circuits.entries()) {
      result[name] = { ...stats };
    }
    return result;
  }

  /**
   * Manually reset a circuit to CLOSED state
   */
  resetCircuit(name: string): void {
    const circuit = this.circuits.get(name);
    if (circuit) {
      circuit.state = CircuitState.CLOSED;
      circuit.failures = 0;
      circuit.successes = 0;
      circuit.lastStateChange = new Date();
      this.logger.log(`Circuit "${name}" manually reset to CLOSED`);
    }
  }

  /**
   * Get or create a circuit
   */
  private getOrCreateCircuit(name: string): CircuitStats {
    let circuit = this.circuits.get(name);
    if (!circuit) {
      circuit = {
        state: CircuitState.CLOSED,
        failures: 0,
        successes: 0,
        lastStateChange: new Date(),
      };
      this.circuits.set(name, circuit);
    }
    return circuit;
  }

  /**
   * Get configuration with defaults
   */
  private getConfig(
    options: CircuitBreakerOptions,
  ): Required<Omit<CircuitBreakerOptions, 'fallback'>> {
    return {
      name: options.name,
      failureThreshold: options.failureThreshold ?? 5,
      successThreshold: options.successThreshold ?? 3,
      resetTimeoutMs: options.resetTimeoutMs ?? 30000,
    };
  }

  /**
   * Check if OPEN circuit should transition to HALF_OPEN
   */
  private checkResetTimeout(
    circuit: CircuitStats,
    config: Required<Omit<CircuitBreakerOptions, 'fallback'>>,
  ): void {
    if (circuit.state !== CircuitState.OPEN) {
      return;
    }

    const timeSinceOpen = Date.now() - circuit.lastStateChange.getTime();
    if (timeSinceOpen >= config.resetTimeoutMs) {
      circuit.state = CircuitState.HALF_OPEN;
      circuit.successes = 0;
      circuit.lastStateChange = new Date();
      this.logger.log(`Circuit "${config.name}" transitioned to HALF_OPEN`);
    }
  }

  /**
   * Record a successful call
   */
  private recordSuccess(
    circuit: CircuitStats,
    config: Required<Omit<CircuitBreakerOptions, 'fallback'>>,
    name: string,
  ): void {
    if (circuit.state === CircuitState.HALF_OPEN) {
      circuit.successes++;
      if (circuit.successes >= config.successThreshold) {
        circuit.state = CircuitState.CLOSED;
        circuit.failures = 0;
        circuit.successes = 0;
        circuit.lastStateChange = new Date();
        this.logger.log(`Circuit "${name}" recovered, now CLOSED`);
      }
    } else if (circuit.state === CircuitState.CLOSED) {
      // Reset failure count on success in CLOSED state
      circuit.failures = 0;
    }
  }

  /**
   * Record a failed call
   */
  private recordFailure(
    circuit: CircuitStats,
    config: Required<Omit<CircuitBreakerOptions, 'fallback'>>,
    name: string,
  ): void {
    circuit.failures++;
    circuit.lastFailureTime = new Date();

    if (circuit.state === CircuitState.HALF_OPEN) {
      // Any failure in HALF_OPEN immediately opens the circuit
      circuit.state = CircuitState.OPEN;
      circuit.lastStateChange = new Date();
      this.logger.warn(`Circuit "${name}" failed in HALF_OPEN, now OPEN`);
    } else if (
      circuit.state === CircuitState.CLOSED &&
      circuit.failures >= config.failureThreshold
    ) {
      circuit.state = CircuitState.OPEN;
      circuit.lastStateChange = new Date();
      this.logger.warn(`Circuit "${name}" opened after ${circuit.failures} failures`);
    }
  }
}

/**
 * Error thrown when circuit breaker is open
 */
export class CircuitBreakerOpenError extends Error {
  constructor(circuitName: string) {
    super(`Circuit breaker "${circuitName}" is open`);
    this.name = 'CircuitBreakerOpenError';
  }
}

import { Test, TestingModule } from '@nestjs/testing';
import { CircuitBreakerService, CircuitState } from './circuit-breaker.service';

describe('CircuitBreakerService', () => {
  let service: CircuitBreakerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CircuitBreakerService],
    }).compile();

    service = module.get<CircuitBreakerService>(CircuitBreakerService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('execute', () => {
    const defaultOptions = {
      name: 'test-circuit',
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 5000,
    };

    it('should execute function successfully when circuit is closed', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');

      const result = await service.execute(defaultOptions, mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalled();
    });

    it('should open circuit after failure threshold', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('fail'));

      // Fail 3 times to open circuit
      for (let i = 0; i < 3; i++) {
        await expect(service.execute(defaultOptions, mockFn)).rejects.toThrow('fail');
      }

      const state = service.getState('test-circuit');
      expect(state).toBe(CircuitState.OPEN);
    });

    it('should reject immediately when circuit is open', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('fail'));

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await expect(service.execute(defaultOptions, mockFn)).rejects.toThrow('fail');
      }

      // Reset mock to track new calls
      mockFn.mockClear();

      // Should reject without calling the function
      await expect(service.execute(defaultOptions, mockFn)).rejects.toThrow(
        'Circuit breaker is open',
      );
      expect(mockFn).not.toHaveBeenCalled();
    });

    it('should transition to half-open after timeout', async () => {
      jest.useFakeTimers();
      const mockFn = jest.fn().mockRejectedValue(new Error('fail'));

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await expect(service.execute(defaultOptions, mockFn)).rejects.toThrow('fail');
      }

      expect(service.getState('test-circuit')).toBe(CircuitState.OPEN);

      // Advance time past the timeout
      jest.advanceTimersByTime(6000);

      // Mock successful response
      mockFn.mockResolvedValue('success');

      // Should allow the request (half-open state)
      const result = await service.execute(defaultOptions, mockFn);
      expect(result).toBe('success');
    });

    it('should close circuit after success threshold in half-open state', async () => {
      jest.useFakeTimers();
      const mockFn = jest.fn().mockRejectedValue(new Error('fail'));

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await expect(service.execute(defaultOptions, mockFn)).rejects.toThrow('fail');
      }

      // Advance time to transition to half-open
      jest.advanceTimersByTime(6000);

      // Mock successful responses
      mockFn.mockResolvedValue('success');

      // Success threshold is 2
      await service.execute(defaultOptions, mockFn);
      await service.execute(defaultOptions, mockFn);

      expect(service.getState('test-circuit')).toBe(CircuitState.CLOSED);
    });

    it('should reopen circuit if failure in half-open state', async () => {
      jest.useFakeTimers();
      const mockFn = jest.fn().mockRejectedValue(new Error('fail'));

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await expect(service.execute(defaultOptions, mockFn)).rejects.toThrow('fail');
      }

      // Advance time to transition to half-open
      jest.advanceTimersByTime(6000);

      // Fail again in half-open state
      await expect(service.execute(defaultOptions, mockFn)).rejects.toThrow('fail');

      expect(service.getState('test-circuit')).toBe(CircuitState.OPEN);
    });

    it('should use custom fallback when provided', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('fail'));
      const fallback = jest.fn().mockResolvedValue('fallback');

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await expect(service.execute({ ...defaultOptions, fallback }, mockFn)).rejects.toThrow(
          'fail',
        );
      }

      // Circuit is open, should use fallback
      const result = await service.execute({ ...defaultOptions, fallback }, mockFn);

      expect(result).toBe('fallback');
      expect(fallback).toHaveBeenCalled();
    });
  });

  describe('getState', () => {
    it('should return CLOSED for unknown circuit', () => {
      expect(service.getState('unknown-circuit')).toBe(CircuitState.CLOSED);
    });
  });

  describe('reset', () => {
    it('should reset circuit to closed state', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('fail'));

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await expect(
          service.execute(
            { name: 'reset-test', failureThreshold: 3, successThreshold: 2, timeout: 5000 },
            mockFn,
          ),
        ).rejects.toThrow('fail');
      }

      expect(service.getState('reset-test')).toBe(CircuitState.OPEN);

      service.reset('reset-test');

      expect(service.getState('reset-test')).toBe(CircuitState.CLOSED);
    });
  });

  describe('getStats', () => {
    it('should return circuit statistics', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');

      await service.execute(
        { name: 'stats-test', failureThreshold: 3, successThreshold: 2, timeout: 5000 },
        mockFn,
      );

      const stats = service.getStats('stats-test');

      expect(stats).toEqual(
        expect.objectContaining({
          state: CircuitState.CLOSED,
          failures: 0,
          successes: expect.any(Number),
        }),
      );
    });

    it('should return default stats for unknown circuit', () => {
      const stats = service.getStats('unknown');

      expect(stats).toEqual({
        state: CircuitState.CLOSED,
        failures: 0,
        successes: 0,
        lastFailure: null,
        lastSuccess: null,
      });
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { SagaOrchestratorService } from './saga-orchestrator.service';
import { SagaDefinition } from './saga.types';

interface TestContext {
  value: number;
  step1Done?: boolean;
  step2Done?: boolean;
  step3Done?: boolean;
}

describe('SagaOrchestratorService', () => {
  let service: SagaOrchestratorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SagaOrchestratorService],
    }).compile();

    service = module.get<SagaOrchestratorService>(SagaOrchestratorService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('execute', () => {
    it('should execute all saga steps successfully', async () => {
      const saga: SagaDefinition<TestContext> = {
        name: 'TestSaga',
        steps: [
          {
            name: 'Step1',
            execute: async (ctx) => ({ ...ctx, step1Done: true, value: ctx.value + 1 }),
            compensate: async () => {},
          },
          {
            name: 'Step2',
            execute: async (ctx) => ({ ...ctx, step2Done: true, value: ctx.value + 1 }),
            compensate: async () => {},
          },
          {
            name: 'Step3',
            execute: async (ctx) => ({ ...ctx, step3Done: true, value: ctx.value + 1 }),
            compensate: async () => {},
          },
        ],
      };

      const result = await service.execute(saga, { value: 0 });

      expect(result.success).toBe(true);
      expect(result.context.value).toBe(3);
      expect(result.context.step1Done).toBe(true);
      expect(result.context.step2Done).toBe(true);
      expect(result.context.step3Done).toBe(true);
    });

    it('should compensate on failure', async () => {
      const compensateCalls: string[] = [];

      const saga: SagaDefinition<TestContext> = {
        name: 'FailingSaga',
        steps: [
          {
            name: 'Step1',
            execute: async (ctx) => ({ ...ctx, step1Done: true }),
            compensate: async () => {
              compensateCalls.push('Step1');
            },
          },
          {
            name: 'Step2',
            execute: async (ctx) => ({ ...ctx, step2Done: true }),
            compensate: async () => {
              compensateCalls.push('Step2');
            },
          },
          {
            name: 'Step3',
            execute: async () => {
              throw new Error('Step3 failed');
            },
            compensate: async () => {
              compensateCalls.push('Step3');
            },
          },
        ],
      };

      const result = await service.execute(saga, { value: 0 });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Step3 failed');
      // Compensation should be called in reverse order for completed steps
      expect(compensateCalls).toEqual(['Step2', 'Step1']);
    });

    it('should retry failed steps with retry config', async () => {
      let attempts = 0;

      const saga: SagaDefinition<TestContext> = {
        name: 'RetrySaga',
        steps: [
          {
            name: 'RetryableStep',
            execute: async (ctx) => {
              attempts++;
              if (attempts < 3) {
                throw new Error('Temporary failure');
              }
              return { ...ctx, step1Done: true };
            },
            compensate: async () => {},
            retryConfig: {
              maxRetries: 3,
              delayMs: 10,
              backoffMultiplier: 1,
            },
          },
        ],
      };

      const result = await service.execute(saga, { value: 0 });

      expect(result.success).toBe(true);
      expect(attempts).toBe(3);
    });

    it('should fail after max retries exceeded', async () => {
      let attempts = 0;

      const saga: SagaDefinition<TestContext> = {
        name: 'FailRetrySaga',
        steps: [
          {
            name: 'AlwaysFailsStep',
            execute: async () => {
              attempts++;
              throw new Error('Always fails');
            },
            compensate: async () => {},
            retryConfig: {
              maxRetries: 2,
              delayMs: 10,
              backoffMultiplier: 1,
            },
          },
        ],
      };

      const result = await service.execute(saga, { value: 0 });

      expect(result.success).toBe(false);
      expect(attempts).toBe(3); // 1 initial + 2 retries
    });

    it('should timeout step execution', async () => {
      const saga: SagaDefinition<TestContext> = {
        name: 'TimeoutSaga',
        steps: [
          {
            name: 'SlowStep',
            execute: async (ctx) => {
              // Simulate a step that takes longer than timeout
              await new Promise((resolve) => setTimeout(resolve, 2000));
              return ctx;
            },
            compensate: async () => {},
          },
        ],
      };

      // Use a very short timeout to trigger failure quickly
      const result = await service.execute(saga, { value: 0 }, { stepTimeoutMs: 100 });

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    }, 10000);

    it('should pass options to saga execution', async () => {
      const saga: SagaDefinition<TestContext> = {
        name: 'OptionsSaga',
        steps: [
          {
            name: 'Step1',
            execute: async (ctx) => ({ ...ctx, step1Done: true }),
            compensate: async () => {},
          },
        ],
      };

      const result = await service.execute(
        saga,
        { value: 0 },
        {
          stepTimeoutMs: 5000,
          sagaTimeoutMs: 30000,
        },
      );

      expect(result.success).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty saga', async () => {
      const saga: SagaDefinition<TestContext> = {
        name: 'EmptySaga',
        steps: [],
      };

      const result = await service.execute(saga, { value: 0 });

      expect(result.success).toBe(true);
      expect(result.context.value).toBe(0);
    });

    it('should handle compensation failure gracefully', async () => {
      const saga: SagaDefinition<TestContext> = {
        name: 'CompensationFailSaga',
        steps: [
          {
            name: 'Step1',
            execute: async (ctx) => ({ ...ctx, step1Done: true }),
            compensate: async () => {
              throw new Error('Compensation failed');
            },
          },
          {
            name: 'Step2',
            execute: async () => {
              throw new Error('Step2 failed');
            },
            compensate: async () => {},
          },
        ],
      };

      // Should not throw, should complete with failure status
      const result = await service.execute(saga, { value: 0 });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Step2 failed');
    });

    it('should preserve context through all steps', async () => {
      const saga: SagaDefinition<{ items: string[] }> = {
        name: 'ContextSaga',
        steps: [
          {
            name: 'AddItem1',
            execute: async (ctx) => ({ items: [...ctx.items, 'item1'] }),
            compensate: async () => {},
          },
          {
            name: 'AddItem2',
            execute: async (ctx) => ({ items: [...ctx.items, 'item2'] }),
            compensate: async () => {},
          },
          {
            name: 'AddItem3',
            execute: async (ctx) => ({ items: [...ctx.items, 'item3'] }),
            compensate: async () => {},
          },
        ],
      };

      const result = await service.execute(saga, { items: [] });

      expect(result.success).toBe(true);
      expect(result.context.items).toEqual(['item1', 'item2', 'item3']);
    });
  });
});

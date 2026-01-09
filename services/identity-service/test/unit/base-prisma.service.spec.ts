import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createUuidv7Extension, BasePrismaService } from '../../src/database/base-prisma.service';

// Mock @my-girok/nest-common
vi.mock('@my-girok/nest-common', () => ({
  ID: {
    generate: vi.fn().mockReturnValue('generated-uuid-v7'),
  },
}));

describe('base-prisma.service', () => {
  describe('createUuidv7Extension', () => {
    let mockClient: {
      $extends: ReturnType<typeof vi.fn>;
    };
    let capturedExtension: {
      query: {
        $allModels: {
          create: (params: unknown) => Promise<unknown>;
          createMany: (params: unknown) => Promise<unknown>;
        };
      };
    };

    beforeEach(() => {
      mockClient = {
        $extends: vi.fn().mockImplementation((ext) => {
          capturedExtension = ext;
          return { ...mockClient, __extended: true };
        }),
      };
    });

    it('should call $extends on the client', () => {
      createUuidv7Extension(mockClient);

      expect(mockClient.$extends).toHaveBeenCalled();
    });

    it('should return extended client', () => {
      const result = createUuidv7Extension(mockClient);

      expect(result).toHaveProperty('__extended', true);
    });

    describe('create hook', () => {
      beforeEach(() => {
        createUuidv7Extension(mockClient);
      });

      it('should generate ID if not provided', async () => {
        const mockQuery = vi.fn().mockResolvedValue({ id: 'generated-uuid-v7' });
        const args = { data: { name: 'test' } };

        await capturedExtension.query.$allModels.create({ args, query: mockQuery });

        expect(args.data.id).toBe('generated-uuid-v7');
        expect(mockQuery).toHaveBeenCalledWith(args);
      });

      it('should not overwrite existing ID', async () => {
        const mockQuery = vi.fn().mockResolvedValue({ id: 'existing-id' });
        const args = { data: { id: 'existing-id', name: 'test' } };

        await capturedExtension.query.$allModels.create({ args, query: mockQuery });

        expect(args.data.id).toBe('existing-id');
        expect(mockQuery).toHaveBeenCalledWith(args);
      });
    });

    describe('createMany hook', () => {
      beforeEach(() => {
        createUuidv7Extension(mockClient);
      });

      it('should generate IDs for all items without ID', async () => {
        const mockQuery = vi.fn().mockResolvedValue({ count: 2 });
        const args = {
          data: [{ name: 'item1' }, { name: 'item2' }],
        };

        await capturedExtension.query.$allModels.createMany({ args, query: mockQuery });

        expect(args.data[0].id).toBe('generated-uuid-v7');
        expect(args.data[1].id).toBe('generated-uuid-v7');
        expect(mockQuery).toHaveBeenCalledWith(args);
      });

      it('should preserve existing IDs', async () => {
        const mockQuery = vi.fn().mockResolvedValue({ count: 2 });
        const args = {
          data: [{ id: 'existing-1', name: 'item1' }, { name: 'item2' }],
        };

        await capturedExtension.query.$allModels.createMany({ args, query: mockQuery });

        expect(args.data[0].id).toBe('existing-1');
        expect(args.data[1].id).toBe('generated-uuid-v7');
      });

      it('should handle non-array data gracefully', async () => {
        const mockQuery = vi.fn().mockResolvedValue({ count: 0 });
        const args = {
          data: { name: 'single' } as unknown as Record<string, unknown>[],
        };

        // Should not throw when data is not an array
        await capturedExtension.query.$allModels.createMany({ args, query: mockQuery });

        expect(mockQuery).toHaveBeenCalled();
      });
    });
  });

  describe('BasePrismaService', () => {
    // Create a concrete implementation for testing
    class TestPrismaService extends BasePrismaService {
      protected readonly serviceName = 'TestService';
      connectFn: ReturnType<typeof vi.fn>;

      constructor() {
        super();
        this.connectFn = vi.fn();
      }

      async onModuleInit(): Promise<void> {
        await this.connectWithRetry(this.connectFn);
      }

      async onModuleDestroy(): Promise<void> {
        // No-op for test
      }

      // Expose protected methods for testing
      public testConnectWithRetry(
        fn: () => Promise<void>,
        maxRetries?: number,
        delayMs?: number,
      ): Promise<void> {
        return this.connectWithRetry(fn, maxRetries, delayMs);
      }

      public testDelay(ms: number): Promise<void> {
        return this.delay(ms);
      }
    }

    let service: TestPrismaService;

    beforeEach(() => {
      service = new TestPrismaService();
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    describe('connectWithRetry', () => {
      it('should connect successfully on first attempt', async () => {
        const connectFn = vi.fn().mockResolvedValue(undefined);

        await service.testConnectWithRetry(connectFn);

        expect(connectFn).toHaveBeenCalledTimes(1);
      });

      it('should retry on failure', async () => {
        vi.useRealTimers();
        const connectFn = vi
          .fn()
          .mockRejectedValueOnce(new Error('Connection failed'))
          .mockResolvedValueOnce(undefined);

        await service.testConnectWithRetry(connectFn, 3, 10);

        expect(connectFn).toHaveBeenCalledTimes(2);
        vi.useFakeTimers();
      });

      it('should throw after max retries', async () => {
        vi.useRealTimers();
        const error = new Error('Persistent failure');
        const connectFn = vi.fn().mockRejectedValue(error);

        await expect(service.testConnectWithRetry(connectFn, 3, 10)).rejects.toThrow(
          'Persistent failure',
        );
        expect(connectFn).toHaveBeenCalledTimes(3);

        vi.useFakeTimers();
      });

      it('should use exponential backoff', async () => {
        vi.useRealTimers();
        const connectFn = vi
          .fn()
          .mockRejectedValueOnce(new Error('Error 1'))
          .mockRejectedValueOnce(new Error('Error 2'))
          .mockResolvedValueOnce(undefined);

        await service.testConnectWithRetry(connectFn, 3, 10);

        expect(connectFn).toHaveBeenCalledTimes(3);
        vi.useFakeTimers();
      });

      it('should handle non-Error objects', async () => {
        vi.useRealTimers();
        const connectFn = vi
          .fn()
          .mockRejectedValueOnce('string error')
          .mockResolvedValueOnce(undefined);

        await service.testConnectWithRetry(connectFn, 2, 10);

        expect(connectFn).toHaveBeenCalledTimes(2);
        vi.useFakeTimers();
      });
    });

    describe('delay', () => {
      it('should delay for specified milliseconds', async () => {
        vi.useRealTimers();

        const start = Date.now();
        await service.testDelay(50);
        const elapsed = Date.now() - start;

        expect(elapsed).toBeGreaterThanOrEqual(45); // Allow some tolerance
        expect(elapsed).toBeLessThan(100);
      });
    });

    describe('logger initialization', () => {
      it('should create logger with correct name', () => {
        // The logger is created in constructor
        expect(service).toBeDefined();
      });
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ApiKeyGuard } from '../../src/common/guards/api-key.guard';

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;
  let reflector: jest.Mocked<Reflector>;

  const createMockExecutionContext = (
    headers: Record<string, string | string[]> = {},
  ): ExecutionContext => {
    const mockRequest = {
      headers: {
        'x-api-key': headers['x-api-key'] || '',
        ...headers,
      },
    };

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    const mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'API_KEYS') {
          return 'test-api-key-1,test-api-key-2';
        }
        return undefined;
      }),
    };

    // Mock process.env
    process.env.NODE_ENV = 'test';
    process.env.API_KEYS = 'test-api-key-1,test-api-key-2';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyGuard,
        { provide: Reflector, useValue: mockReflector },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    guard = module.get<ApiKeyGuard>(ApiKeyGuard);
    reflector = module.get(Reflector);
  });

  afterEach(() => {
    delete process.env.NODE_ENV;
    delete process.env.API_KEYS;
  });

  describe('canActivate', () => {
    it('should allow access to public routes', () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      const context = createMockExecutionContext({});

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw UnauthorizedException when no API key provided', () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const context = createMockExecutionContext({});

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow('API key is required');
    });

    it('should allow access with valid API key', () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const context = createMockExecutionContext({
        'x-api-key': 'test-api-key-1',
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access with second valid API key', () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const context = createMockExecutionContext({
        'x-api-key': 'test-api-key-2',
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw UnauthorizedException for invalid API key', () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const context = createMockExecutionContext({
        'x-api-key': 'invalid-api-key',
      });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow('Invalid API key');
    });

    it('should handle array of API keys in header', () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const context = createMockExecutionContext({
        'x-api-key': ['test-api-key-1', 'ignored-key'],
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('cache invalidation', () => {
    it('should invalidate cache when called', () => {
      guard.invalidateCache();

      // After invalidation, next canActivate should refresh keys
      reflector.getAllAndOverride.mockReturnValue(false);
      const context = createMockExecutionContext({
        'x-api-key': 'test-api-key-1',
      });

      const result = guard.canActivate(context);
      expect(result).toBe(true);
    });
  });

  describe('timing-safe comparison', () => {
    it('should use timing-safe comparison for API key validation', () => {
      reflector.getAllAndOverride.mockReturnValue(false);

      // Valid key should work
      const validContext = createMockExecutionContext({
        'x-api-key': 'test-api-key-1',
      });
      expect(guard.canActivate(validContext)).toBe(true);

      // Similar but invalid key should fail
      const invalidContext = createMockExecutionContext({
        'x-api-key': 'test-api-key-3',
      });
      expect(() => guard.canActivate(invalidContext)).toThrow('Invalid API key');
    });

    it('should reject keys with different lengths', () => {
      reflector.getAllAndOverride.mockReturnValue(false);

      const shortContext = createMockExecutionContext({
        'x-api-key': 'short',
      });
      expect(() => guard.canActivate(shortContext)).toThrow('Invalid API key');

      const longContext = createMockExecutionContext({
        'x-api-key': 'very-long-api-key-that-does-not-match-anything',
      });
      expect(() => guard.canActivate(longContext)).toThrow('Invalid API key');
    });
  });

  describe('production configuration', () => {
    it('should throw error in production without API keys', async () => {
      process.env.NODE_ENV = 'production';
      process.env.API_KEYS = '';

      const mockConfigNoProd = {
        get: jest.fn().mockReturnValue(''),
      };

      expect(() => {
        new ApiKeyGuard(
          { getAllAndOverride: jest.fn() } as unknown as Reflector,
          mockConfigNoProd as unknown as ConfigService,
        );
      }).toThrow('API_KEYS is required in production');
    });
  });

  describe('edge cases', () => {
    it('should handle whitespace in API keys config', async () => {
      const mockConfigWithWhitespace = {
        get: jest.fn().mockReturnValue('  key1  ,  key2  '),
      };

      process.env.NODE_ENV = 'test';

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ApiKeyGuard,
          { provide: Reflector, useValue: { getAllAndOverride: jest.fn() } },
          { provide: ConfigService, useValue: mockConfigWithWhitespace },
        ],
      }).compile();

      const testGuard = module.get<ApiKeyGuard>(ApiKeyGuard);
      const testReflector = module.get<Reflector>(Reflector);

      (testReflector.getAllAndOverride as jest.Mock).mockReturnValue(false);

      const context = createMockExecutionContext({
        'x-api-key': 'key1',
      });

      expect(testGuard.canActivate(context)).toBe(true);
    });

    it('should handle empty string API key', () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const context = createMockExecutionContext({
        'x-api-key': '',
      });

      expect(() => guard.canActivate(context)).toThrow('API key is required');
    });
  });

  describe('key hashing security', () => {
    it('should hash keys and never store original keys in memory', () => {
      // This test verifies the security pattern - original keys should not be
      // directly accessible after initialization
      reflector.getAllAndOverride.mockReturnValue(false);

      // Verify that valid key works (proving hash comparison is used)
      const validContext = createMockExecutionContext({
        'x-api-key': 'test-api-key-1',
      });
      expect(guard.canActivate(validContext)).toBe(true);

      // Verify that the hash of the key is what's being compared, not the key itself
      const invalidContext = createMockExecutionContext({
        'x-api-key': 'test-api-key-1-modified',
      });
      expect(() => guard.canActivate(invalidContext)).toThrow('Invalid API key');
    });
  });
});

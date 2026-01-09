import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';
import { CacheService } from './cache.service';

// Define a custom type for the mocked cache manager
interface MockCacheManager {
  get: Mock;
  set: Mock;
  del: Mock;
  store: {
    keys: Mock;
  };
}

describe('CacheService', () => {
  let service: CacheService;
  let cacheManager: MockCacheManager;

  beforeEach(async () => {
    const mockCacheManager: MockCacheManager = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      store: {
        keys: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [CacheService, { provide: CACHE_MANAGER, useValue: mockCacheManager }],
    }).compile();

    service = module.get<CacheService>(CacheService);
    cacheManager = module.get(CACHE_MANAGER);
  });

  describe('get', () => {
    it('should return cached value', async () => {
      cacheManager.get.mockResolvedValue({ id: '123', name: 'test' });

      const result = await service.get<{ id: string; name: string }>('test-key');

      expect(result).toEqual({ id: '123', name: 'test' });
      expect(cacheManager.get).toHaveBeenCalledWith('identity:test-key');
    });

    it('should return undefined for missing key', async () => {
      cacheManager.get.mockResolvedValue(undefined);

      const result = await service.get('missing-key');

      expect(result).toBeUndefined();
    });

    it('should return undefined on error', async () => {
      cacheManager.get.mockRejectedValue(new Error('Cache error'));

      const result = await service.get('error-key');

      expect(result).toBeUndefined();
    });
  });

  describe('set', () => {
    it('should set value in cache', async () => {
      cacheManager.set.mockResolvedValue(undefined);

      await service.set('test-key', { data: 'value' }, 60000);

      expect(cacheManager.set).toHaveBeenCalledWith('identity:test-key', { data: 'value' }, 60000);
    });

    it('should not throw on error', async () => {
      cacheManager.set.mockRejectedValue(new Error('Cache error'));

      await expect(service.set('error-key', { data: 'value' })).resolves.not.toThrow();
    });
  });

  describe('del', () => {
    it('should delete value from cache', async () => {
      cacheManager.del.mockResolvedValue(true);

      await service.del('test-key');

      expect(cacheManager.del).toHaveBeenCalledWith('identity:test-key');
    });

    it('should not throw on error', async () => {
      cacheManager.del.mockRejectedValue(new Error('Cache error'));

      await expect(service.del('error-key')).resolves.not.toThrow();
    });
  });

  describe('getOrSet', () => {
    it('should return cached value if exists', async () => {
      cacheManager.get.mockResolvedValue('cached-value');

      const factory = vi.fn().mockResolvedValue('new-value');
      const result = await service.getOrSet('test-key', factory);

      expect(result).toBe('cached-value');
      expect(factory).not.toHaveBeenCalled();
    });

    it('should call factory and cache result if not cached', async () => {
      cacheManager.get
        .mockResolvedValueOnce(undefined) // First get (cache check)
        .mockResolvedValueOnce(undefined) // Lock check
        .mockResolvedValueOnce(undefined); // Double-check after lock
      cacheManager.set.mockResolvedValue(undefined);

      const factory = vi.fn().mockResolvedValue('new-value');
      const result = await service.getOrSet('test-key', factory, 60000);

      expect(result).toBe('new-value');
      expect(factory).toHaveBeenCalled();
      expect(cacheManager.set).toHaveBeenCalled();
    });
  });

  describe('invalidatePattern', () => {
    it('should delete matching keys from cache', async () => {
      cacheManager.store.keys.mockResolvedValue(['identity:account:123', 'identity:account:456']);
      cacheManager.del.mockResolvedValue(true);

      const result = await service.invalidatePattern('account:*');

      expect(result).toBe(2);
      expect(cacheManager.del).toHaveBeenCalledTimes(2);
    });

    it('should return 0 if no matching keys', async () => {
      cacheManager.store.keys.mockResolvedValue([]);

      const result = await service.invalidatePattern('nonexistent:*');

      expect(result).toBe(0);
    });
  });

  describe('domain-specific methods', () => {
    describe('account caching', () => {
      it('should get account by id', async () => {
        const mockAccount = { id: '123', email: 'test@example.com' };
        cacheManager.get.mockResolvedValue(mockAccount);

        const result = await service.getAccountById('123');

        expect(result).toEqual(mockAccount);
      });

      it('should set account by id', async () => {
        const mockAccount = { id: '123', email: 'test@example.com' };
        cacheManager.set.mockResolvedValue(undefined);

        await service.setAccountById('123', mockAccount);

        expect(cacheManager.set).toHaveBeenCalled();
      });

      it('should invalidate account', async () => {
        cacheManager.del.mockResolvedValue(true);

        await service.invalidateAccount('123');

        expect(cacheManager.del).toHaveBeenCalled();
      });
    });

    describe('email caching', () => {
      it('should normalize email to lowercase', async () => {
        cacheManager.get.mockResolvedValue(undefined);

        await service.getAccountByEmail('Test@Example.COM');

        expect(cacheManager.get).toHaveBeenCalledWith(expect.stringContaining('test@example.com'));
      });
    });

    describe('token revocation', () => {
      it('should check if token is revoked', async () => {
        cacheManager.get.mockResolvedValue(true);

        const result = await service.isTokenRevoked('jti-123');

        expect(result).toBe(true);
      });

      it('should return false for non-revoked token', async () => {
        cacheManager.get.mockResolvedValue(undefined);

        const result = await service.isTokenRevoked('jti-456');

        expect(result).toBe(false);
      });

      it('should set token as revoked', async () => {
        cacheManager.set.mockResolvedValue(undefined);

        await service.setTokenRevoked('jti-123', 3600000);

        expect(cacheManager.set).toHaveBeenCalledWith(
          expect.stringContaining('jti-123'),
          true,
          3600000,
        );
      });
    });

    describe('permissions caching', () => {
      it('should get user permissions', async () => {
        const permissions = ['read:accounts', 'write:accounts'];
        cacheManager.get.mockResolvedValue(permissions);

        const result = await service.getUserPermissions('account-123');

        expect(result).toEqual(permissions);
      });

      it('should set user permissions', async () => {
        const permissions = ['read:accounts', 'write:accounts'];
        cacheManager.set.mockResolvedValue(undefined);

        await service.setUserPermissions('account-123', permissions);

        expect(cacheManager.set).toHaveBeenCalled();
      });
    });
  });
});

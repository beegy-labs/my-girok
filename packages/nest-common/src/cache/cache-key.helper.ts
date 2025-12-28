/**
 * CacheKey Helper for Valkey/Redis cache key construction
 *
 * Provides environment-aware key prefixing to allow shared Valkey DB
 * across dev/release/prod environments without key collisions.
 *
 * @example
 * ```typescript
 * // Construct a cache key
 * const key = CacheKey.make('auth', 'permissions', roleId);
 * // → "dev:auth:permissions:550e8400..."
 *
 * // Construct a pattern for invalidation
 * const pattern = CacheKey.pattern('auth', 'permissions', '*');
 * // → "dev:auth:permissions:*"
 * ```
 */
export class CacheKey {
  /**
   * Environment prefix based on NODE_ENV
   * - development, dev, local → dev
   * - release, staging → release
   * - production, prod → prod
   */
  private static getEnv(): string {
    const nodeEnv = process.env.NODE_ENV?.toLowerCase() || 'dev';

    if (['development', 'dev', 'local'].includes(nodeEnv)) {
      return 'dev';
    }
    if (['release', 'staging'].includes(nodeEnv)) {
      return 'release';
    }
    if (['production', 'prod'].includes(nodeEnv)) {
      return 'prod';
    }

    // Default to dev for unknown environments
    return 'dev';
  }

  /**
   * Construct a cache key with environment prefix
   *
   * @param parts - Key parts to join with ':'
   * @returns Prefixed cache key (e.g., "dev:auth:permissions:123")
   *
   * @example
   * ```typescript
   * CacheKey.make('auth', 'permissions', roleId)
   * // → "dev:auth:permissions:550e8400-e29b-41d4-a716-446655440000"
   *
   * CacheKey.make('personal', 'resume', resumeId, userId)
   * // → "dev:personal:resume:550e8400...:550e8400..."
   * ```
   */
  static make(...parts: string[]): string {
    return [this.getEnv(), ...parts].join(':');
  }

  /**
   * Construct a pattern for cache invalidation
   *
   * Same as make() but explicitly intended for pattern matching operations
   * Typically used with wildcard (*) as the last segment
   *
   * @param parts - Pattern parts to join with ':'
   * @returns Prefixed pattern (e.g., "dev:auth:permissions:*")
   *
   * @example
   * ```typescript
   * CacheKey.pattern('auth', 'permissions', '*')
   * // → "dev:auth:permissions:*"
   *
   * CacheKey.pattern('personal', 'resume', resumeId, '*')
   * // → "dev:personal:resume:550e8400...:*"
   * ```
   */
  static pattern(...parts: string[]): string {
    return this.make(...parts);
  }

  /**
   * Parse a cache key to extract its parts
   *
   * @param key - Full cache key including env prefix
   * @returns Object with env and parts array
   *
   * @example
   * ```typescript
   * CacheKey.parse('dev:auth:permissions:123')
   * // → { env: 'dev', parts: ['auth', 'permissions', '123'] }
   * ```
   */
  static parse(key: string): { env: string; parts: string[] } {
    const segments = key.split(':');
    const env = segments[0] || 'dev';
    const parts = segments.slice(1);
    return { env, parts };
  }

  /**
   * Get the current environment prefix
   *
   * @returns Current environment string ('dev', 'release', or 'prod')
   */
  static env(): string {
    return this.getEnv();
  }
}

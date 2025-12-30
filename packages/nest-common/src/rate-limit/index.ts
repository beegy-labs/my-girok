// Rate Limit Module
export { RateLimitModule, REDIS_THROTTLER_STORAGE } from './rate-limit.module';

// Rate Limit Configuration
export {
  RateLimitTiers,
  RateLimitHeaders,
  DEFAULT_RATE_LIMIT_MESSAGE,
  createThrottlerConfig,
} from './rate-limit.config';
export type { RateLimitTier, RateLimitModuleOptions, ThrottlerConfig } from './rate-limit.config';

// Redis Throttler Storage (for distributed rate limiting)
export { RedisThrottlerStorage } from './redis-throttler-storage';
export type {
  RedisThrottlerStorageOptions,
  ThrottlerStorageRecord,
} from './redis-throttler-storage';

// Rate Limit Headers Interceptor
export { RateLimitHeadersInterceptor, RATE_LIMIT_METADATA } from './rate-limit-headers.interceptor';

// Rate Limit Guard (custom guard that sets metadata for headers interceptor)
export { RateLimitGuard } from './rate-limit.guard';

// Re-export useful decorators from @nestjs/throttler
export { Throttle, SkipThrottle } from '@nestjs/throttler';

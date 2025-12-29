// Rate Limit Module
export { RateLimitModule } from './rate-limit.module';

// Rate Limit Configuration
export {
  RateLimitTiers,
  RateLimitHeaders,
  DEFAULT_RATE_LIMIT_MESSAGE,
  createThrottlerConfig,
} from './rate-limit.config';
export type { RateLimitTier, RateLimitModuleOptions, ThrottlerConfig } from './rate-limit.config';

// Re-export useful decorators from @nestjs/throttler
export { Throttle, SkipThrottle } from '@nestjs/throttler';

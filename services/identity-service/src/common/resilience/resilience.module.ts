import { Module, Global } from '@nestjs/common';
import { CircuitBreakerService } from './circuit-breaker.service';

/**
 * Resilience Module
 *
 * Provides resilience patterns for the identity-service.
 *
 * 2026 Best Practices:
 * - Circuit breaker for external calls
 * - Bulkhead pattern for resource isolation
 * - Retry with exponential backoff
 */
@Global()
@Module({
  providers: [CircuitBreakerService],
  exports: [CircuitBreakerService],
})
export class ResilienceModule {}

import { Module, Global } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';

/**
 * Metrics Module
 * Provides Prometheus-compatible metrics for monitoring
 */
@Global()
@Module({
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}

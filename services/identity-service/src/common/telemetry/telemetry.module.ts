import { Module, Global } from '@nestjs/common';
import { TelemetryService } from './telemetry.service';

/**
 * Telemetry Module
 *
 * Provides OpenTelemetry tracing for the identity-service.
 *
 * 2026 Best Practices:
 * - Distributed tracing with OTLP export
 * - Automatic span context propagation
 * - Integration with logging for correlation
 *
 * Configuration:
 * - OTEL_ENABLED=true to enable tracing
 * - OTEL_EXPORTER_OTLP_ENDPOINT=http://collector:4318/v1/traces
 */
@Global()
@Module({
  providers: [TelemetryService],
  exports: [TelemetryService],
})
export class TelemetryModule {}

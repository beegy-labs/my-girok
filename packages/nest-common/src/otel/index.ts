// OTEL SDK initialization (MUST be imported first in main.ts)
export { initOtel, shutdownOtel, getOtelSdk } from './otel-sdk';
export type { OtelConfig } from './otel-sdk';

// NestJS Module for lifecycle management
export { OtelModule, OtelModuleOptions } from './otel.module';

// Trace Interceptor and utilities
export { TraceInterceptor, withSpan, Trace } from './trace.interceptor';

// Metrics Interceptor and utilities
export {
  MetricsInterceptor,
  createCounter,
  createHistogram,
  getMeter,
} from './metrics.interceptor';

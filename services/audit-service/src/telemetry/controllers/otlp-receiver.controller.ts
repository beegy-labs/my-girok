import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { OtlpReceiverService } from '../services/otlp-receiver.service';
import { TenantAuthGuard } from '../guards/tenant-auth.guard';
import {
  OtlpTraceFormat,
  OtlpMetricFormat,
  OtlpLogFormat,
  TelemetryContext,
} from '../types/telemetry.types';

/**
 * OTLP Receiver Controller
 * Exposes endpoints for receiving telemetry data (traces, metrics, logs)
 *
 * Features:
 * - JWT and API key authentication
 * - Rate limiting per signal type
 * - Tenant-scoped data processing
 */
@ApiTags('telemetry')
@Controller('v1/telemetry')
@UseGuards(TenantAuthGuard)
export class OtlpReceiverController {
  private readonly logger = new Logger(OtlpReceiverController.name);

  constructor(private readonly otlpService: OtlpReceiverService) {}

  /**
   * Extract telemetry context from request
   */
  private getTelemetryContext(req: Request): TelemetryContext {
    const context = (req as any).telemetryContext;
    if (!context) {
      throw new Error('Telemetry context not found in request');
    }
    return context;
  }

  @Post('traces')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 1000, ttl: 60000 } }) // 1000 requests per minute
  @ApiOperation({
    summary: 'Receive OTLP trace data',
    description: 'Accepts trace data in OTLP JSON format and forwards to internal OTEL Collector',
  })
  @ApiBearerAuth()
  @ApiHeader({
    name: 'x-api-key',
    required: false,
    description: 'API key for service-to-service authentication (alternative to JWT)',
  })
  @ApiHeader({
    name: 'x-tenant-id',
    required: false,
    description: 'Tenant ID (required when using API key authentication)',
  })
  @ApiResponse({
    status: 200,
    description: 'Traces received and forwarded successfully',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'success' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing credentials' })
  @ApiResponse({ status: 429, description: 'Too Many Requests - Rate limit exceeded' })
  async receiveTraces(@Body() data: OtlpTraceFormat, @Req() req: Request) {
    const context = this.getTelemetryContext(req);

    this.logger.debug(
      `Received ${data.resourceSpans?.length || 0} trace spans from tenant ${context.tenantId}`,
    );

    try {
      await this.otlpService.forwardTraces(data, context);
      return { status: 'success' };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to process traces for tenant ${context.tenantId}: ${message}`);
      throw error;
    }
  }

  @Post('metrics')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 2000, ttl: 60000 } }) // 2000 requests per minute
  @ApiOperation({
    summary: 'Receive OTLP metric data',
    description: 'Accepts metric data in OTLP JSON format and forwards to internal OTEL Collector',
  })
  @ApiBearerAuth()
  @ApiHeader({
    name: 'x-api-key',
    required: false,
    description: 'API key for service-to-service authentication (alternative to JWT)',
  })
  @ApiHeader({
    name: 'x-tenant-id',
    required: false,
    description: 'Tenant ID (required when using API key authentication)',
  })
  @ApiResponse({
    status: 200,
    description: 'Metrics received and forwarded successfully',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'success' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing credentials' })
  @ApiResponse({ status: 429, description: 'Too Many Requests - Rate limit exceeded' })
  async receiveMetrics(@Body() data: OtlpMetricFormat, @Req() req: Request) {
    const context = this.getTelemetryContext(req);

    this.logger.debug(
      `Received ${data.resourceMetrics?.length || 0} metrics from tenant ${context.tenantId}`,
    );

    try {
      await this.otlpService.forwardMetrics(data, context);
      return { status: 'success' };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to process metrics for tenant ${context.tenantId}: ${message}`);
      throw error;
    }
  }

  @Post('logs')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5000, ttl: 60000 } }) // 5000 requests per minute
  @ApiOperation({
    summary: 'Receive OTLP log data',
    description: 'Accepts log data in OTLP JSON format and forwards to internal OTEL Collector',
  })
  @ApiBearerAuth()
  @ApiHeader({
    name: 'x-api-key',
    required: false,
    description: 'API key for service-to-service authentication (alternative to JWT)',
  })
  @ApiHeader({
    name: 'x-tenant-id',
    required: false,
    description: 'Tenant ID (required when using API key authentication)',
  })
  @ApiResponse({
    status: 200,
    description: 'Logs received and forwarded successfully',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'success' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing credentials' })
  @ApiResponse({ status: 429, description: 'Too Many Requests - Rate limit exceeded' })
  async receiveLogs(@Body() data: OtlpLogFormat, @Req() req: Request) {
    const context = this.getTelemetryContext(req);

    this.logger.debug(
      `Received ${data.resourceLogs?.length || 0} log records from tenant ${context.tenantId}`,
    );

    try {
      await this.otlpService.forwardLogs(data, context);
      return { status: 'success' };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to process logs for tenant ${context.tenantId}: ${message}`);
      throw error;
    }
  }
}

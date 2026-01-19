import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { RedisThrottlerStorage } from '@my-girok/nest-common';
import { OtlpReceiverController } from './controllers/otlp-receiver.controller';
import { OtlpReceiverService } from './services/otlp-receiver.service';
import { TenantAuthGuard } from './guards/tenant-auth.guard';

/**
 * Telemetry Module
 * Provides OTLP receiver endpoints for traces, metrics, and logs
 *
 * Features:
 * - JWT and API key authentication
 * - Rate limiting per signal type
 * - PII redaction
 * - Tenant metadata enrichment
 * - Cost tracking
 */
@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '1h',
        },
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        // Build Redis URL from Valkey config
        const valkeyConfig = {
          host: configService.get<string>('valkey.host', 'localhost'),
          port: configService.get<number>('valkey.port', 6379),
          password: configService.get<string>('valkey.password', ''),
          db: configService.get<number>('valkey.db', 3),
        };

        const redisUrl = valkeyConfig.password
          ? `redis://:${valkeyConfig.password}@${valkeyConfig.host}:${valkeyConfig.port}/${valkeyConfig.db}`
          : `redis://${valkeyConfig.host}:${valkeyConfig.port}/${valkeyConfig.db}`;

        return {
          throttlers: [
            {
              ttl: 60000, // 1 minute
              limit: configService.get<number>('telemetry.rateLimits.traces', 1000),
            },
          ],
          // Use shared RedisThrottlerStorage from nest-common
          // Provides: circuit breaker, sliding window, health checks
          storage: new RedisThrottlerStorage({
            url: redisUrl,
            keyPrefix: 'throttle:telemetry:',
            enableFallback: true,
            circuitBreakerThreshold: 5,
            circuitBreakerResetTime: 30000,
          }),
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [OtlpReceiverController],
  providers: [OtlpReceiverService, TenantAuthGuard],
  exports: [OtlpReceiverService],
})
export class TelemetryModule {}

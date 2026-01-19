import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { OtlpReceiverController } from './controllers/otlp-receiver.controller';
import { OtlpReceiverService } from './services/otlp-receiver.service';
import { TenantAuthGuard } from './guards/tenant-auth.guard';
import { RedisThrottlerStorage } from './storage/redis-throttler-storage';

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
      useFactory: async (configService: ConfigService, cacheManager: Cache) => ({
        throttlers: [
          {
            ttl: 60000, // 1 minute
            limit: configService.get<number>('telemetry.rateLimits.traces', 1000),
          },
        ],
        // Use Valkey (Redis) for distributed rate limiting
        storage: new RedisThrottlerStorage(cacheManager),
      }),
      inject: [ConfigService, CACHE_MANAGER],
    }),
  ],
  controllers: [OtlpReceiverController],
  providers: [OtlpReceiverService, TenantAuthGuard],
  exports: [OtlpReceiverService],
})
export class TelemetryModule {}

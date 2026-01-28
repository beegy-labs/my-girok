import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GrpcClientsModule, GrpcClientsOptions } from '@my-girok/nest-common';
import { AuditService } from './audit.service';

/**
 * Factory function for audit gRPC client configuration
 */
function createAuditGrpcConfig(configService: ConfigService): GrpcClientsOptions {
  const auditEnabled = configService.get<boolean>('audit.enabled', false);
  const auditGrpcUrl = configService.get<string>('audit.grpcUrl', 'localhost:50054');

  // Parse host and port from URL
  const [host, portStr] = auditGrpcUrl.split(':');
  const port = parseInt(portStr, 10) || 50054;

  return {
    audit: auditEnabled
      ? {
          host,
          port,
        }
      : false,
  };
}

/**
 * Audit Module
 * Provides audit logging via gRPC to audit-service
 */
@Module({
  imports: [
    ConfigModule,
    GrpcClientsModule.forRootAsync({
      useFactory: (...args: unknown[]) => createAuditGrpcConfig(args[0] as ConfigService),
      inject: [ConfigService],
    }),
  ],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}

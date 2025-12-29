import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Database
import { DatabaseModule } from '../database/database.module';

// Users module for PersonalInfoService
import { UsersModule } from '../users/users.module';

// Controllers
import {
  AdminAuthController,
  TenantController,
  AdminLegalController,
  AdminAuditController,
  OperatorController,
  AuditQueryController,
  LawRegistryController,
  AdminServicesController,
  GlobalSettingsController,
  ServiceConfigController,
  ServiceFeatureController,
  ServiceTesterController,
  SanctionController,
} from './controllers';
import { UserPersonalInfoController } from './controllers/user-personal-info.controller';

// Services
import {
  AdminAuthService,
  TenantService,
  AdminLegalService,
  AdminAuditService,
  OperatorService,
  AuditQueryService,
  LawRegistryService,
  AdminServicesService,
  GlobalSettingsService,
  AuditLogService,
  ServiceConfigService,
  ServiceFeatureService,
  ServiceTesterService,
  SanctionService,
} from './services';

// Guards
import { AdminAuthGuard, PermissionGuard, TenantGuard, AdminServiceAccessGuard } from './guards';

// Interceptors
import { AuditInterceptor } from './interceptors';

@Module({
  imports: [
    DatabaseModule,
    UsersModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const expiresIn = configService.get<string>('JWT_ACCESS_EXPIRATION', '1h');
        return {
          secret: configService.get<string>('JWT_SECRET'),
          signOptions: {
            expiresIn: expiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
          },
        };
      },
    }),
  ],
  controllers: [
    AdminAuthController,
    TenantController,
    AdminLegalController,
    AdminAuditController,
    OperatorController,
    UserPersonalInfoController,
    AuditQueryController,
    LawRegistryController,
    AdminServicesController,
    GlobalSettingsController,
    ServiceConfigController,
    ServiceFeatureController,
    ServiceTesterController,
    SanctionController,
  ],
  providers: [
    // Interceptors (global for AdminModule)
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
    // Services
    AdminAuthService,
    TenantService,
    AdminLegalService,
    AdminAuditService,
    OperatorService,
    AuditQueryService,
    LawRegistryService,
    AdminServicesService,
    GlobalSettingsService,
    AuditLogService,
    ServiceConfigService,
    ServiceFeatureService,
    ServiceTesterService,
    SanctionService,
    // Guards
    AdminAuthGuard,
    PermissionGuard,
    TenantGuard,
    AdminServiceAccessGuard,
  ],
  exports: [
    AdminAuthService,
    TenantService,
    AdminLegalService,
    AdminAuditService,
    OperatorService,
    AuditQueryService,
    LawRegistryService,
    AdminServicesService,
    GlobalSettingsService,
    AuditLogService,
    ServiceConfigService,
    ServiceFeatureService,
    ServiceTesterService,
    SanctionService,
    AdminServiceAccessGuard,
  ],
})
export class AdminModule {}

import { Module } from '@nestjs/common';
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
} from './services';

// Guards
import { AdminAuthGuard, PermissionGuard, TenantGuard } from './guards';

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
  ],
  providers: [
    // Services
    AdminAuthService,
    TenantService,
    AdminLegalService,
    AdminAuditService,
    OperatorService,
    AuditQueryService,
    LawRegistryService,
    AdminServicesService,
    // Guards
    AdminAuthGuard,
    PermissionGuard,
    TenantGuard,
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
  ],
})
export class AdminModule {}

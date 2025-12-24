import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Database
import { DatabaseModule } from '../database/database.module';

// Controllers
import {
  AdminAuthController,
  TenantController,
  AdminLegalController,
  AdminAuditController,
} from './controllers';

// Services
import { AdminAuthService, TenantService, AdminLegalService, AdminAuditService } from './services';

// Guards
import { AdminAuthGuard, PermissionGuard, TenantGuard } from './guards';

@Module({
  imports: [
    DatabaseModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const expiresIn = configService.get<string>('JWT_ACCESS_EXPIRATION', '15m');
        return {
          secret: configService.get<string>('JWT_SECRET'),
          signOptions: {
            expiresIn: expiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
          },
        };
      },
    }),
  ],
  controllers: [AdminAuthController, TenantController, AdminLegalController, AdminAuditController],
  providers: [
    // Services
    AdminAuthService,
    TenantService,
    AdminLegalService,
    AdminAuditService,
    // Guards
    AdminAuthGuard,
    PermissionGuard,
    TenantGuard,
  ],
  exports: [AdminAuthService, TenantService, AdminLegalService, AdminAuditService],
})
export class AdminModule {}

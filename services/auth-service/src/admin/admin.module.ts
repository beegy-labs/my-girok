import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Database
import { DatabaseModule } from '../database/database.module';

// Controllers
import { AdminAuthController, TenantController, AdminLegalController } from './controllers';

// Services
import { AdminAuthService, TenantService, AdminLegalService } from './services';

// Guards
import { AdminAuthGuard, PermissionGuard, TenantGuard } from './guards';

@Module({
  imports: [
    DatabaseModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_ACCESS_EXPIRATION', '15m') as string,
        },
      }),
    }),
  ],
  controllers: [AdminAuthController, TenantController, AdminLegalController],
  providers: [
    // Services
    AdminAuthService,
    TenantService,
    AdminLegalService,
    // Guards
    AdminAuthGuard,
    PermissionGuard,
    TenantGuard,
  ],
  exports: [AdminAuthService, TenantService, AdminLegalService],
})
export class AdminModule {}

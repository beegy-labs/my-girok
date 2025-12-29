import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ClickHouseModule } from '@my-girok/nest-common/clickhouse';
import { AdminAuditController } from './controllers/admin-audit.controller';
import { AdminAuditService } from './services/admin-audit.service';
import { AdminAuthGuard } from './guards/admin-auth.guard';

@Module({
  imports: [
    ClickHouseModule,
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AdminAuditController],
  providers: [AdminAuditService, AdminAuthGuard],
  exports: [AdminAuditService],
})
export class AdminAuditModule {}

import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ClickHouseModule } from '@my-girok/nest-common/clickhouse';
import { AdminAuditController } from './controllers/admin-audit.controller';
import { IntegrityController } from './controllers/integrity.controller';
import { AdminAuditService } from './services/admin-audit.service';
import { IntegrityService } from './services/integrity.service';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { AdminEventsConsumer } from './consumers/admin-events.consumer';
import {
  AdminCreatedHandler,
  AdminUpdatedHandler,
  AdminDeactivatedHandler,
  AdminReactivatedHandler,
  AdminInvitedHandler,
  AdminRoleChangedHandler,
} from './handlers';
import { AdminEventMapper } from './mappers/admin-event.mapper';

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
  controllers: [AdminAuditController, IntegrityController, AdminEventsConsumer],
  providers: [
    AdminAuditService,
    IntegrityService,
    AdminAuthGuard,
    AdminEventMapper,
    AdminCreatedHandler,
    AdminUpdatedHandler,
    AdminDeactivatedHandler,
    AdminReactivatedHandler,
    AdminInvitedHandler,
    AdminRoleChangedHandler,
  ],
  exports: [AdminAuditService, IntegrityService],
})
export class AdminAuditModule {}

import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { AuditService } from './services/audit.service';
import { AuditEventEmitterService } from './services/audit-event-emitter.service';
import { PermissionAuditService } from './guards/permission-audit.service';
import { OutboxModule } from './outbox/outbox.module';
import { CryptoService } from './crypto/crypto.service';

@Global()
@Module({
  imports: [ConfigModule, DatabaseModule, OutboxModule],
  providers: [AuditService, AuditEventEmitterService, PermissionAuditService, CryptoService],
  exports: [
    AuditService,
    AuditEventEmitterService,
    PermissionAuditService,
    OutboxModule,
    CryptoService,
  ],
})
export class CommonModule {}

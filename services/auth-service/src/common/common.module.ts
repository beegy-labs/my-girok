import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { AuditService } from './services/audit.service';
import { PermissionAuditService } from './guards/permission-audit.service';
import { OutboxModule } from './outbox/outbox.module';

@Global()
@Module({
  imports: [ConfigModule, DatabaseModule, OutboxModule],
  providers: [AuditService, PermissionAuditService],
  exports: [AuditService, PermissionAuditService, OutboxModule],
})
export class CommonModule {}

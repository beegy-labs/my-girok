import { Module } from '@nestjs/common';
import { AdminAuditController } from './controllers/admin-audit.controller';
import { AdminAuditService } from './services/admin-audit.service';

@Module({
  controllers: [AdminAuditController],
  providers: [AdminAuditService],
  exports: [AdminAuditService],
})
export class AdminAuditModule {}

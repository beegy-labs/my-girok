import { Module } from '@nestjs/common';
import {
  AuditLogController,
  ConsentHistoryController,
  AdminActionController,
  ExportController,
} from './controllers';
import {
  AuditQueryService,
  ConsentHistoryService,
  AdminActionService,
  ExportService,
} from './services';

@Module({
  controllers: [
    AuditLogController,
    ConsentHistoryController,
    AdminActionController,
    ExportController,
  ],
  providers: [AuditQueryService, ConsentHistoryService, AdminActionService, ExportService],
  exports: [AuditQueryService, ConsentHistoryService, AdminActionService, ExportService],
})
export class AuditModule {}

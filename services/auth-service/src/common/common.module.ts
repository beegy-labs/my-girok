import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { AuditService } from './services/audit.service';

@Global()
@Module({
  imports: [ConfigModule, DatabaseModule],
  providers: [AuditService],
  exports: [AuditService],
})
export class CommonModule {}

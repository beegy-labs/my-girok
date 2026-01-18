import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { OrganizationHistoryService } from './services/organization-history.service';
import { OrganizationHistoryController } from './controllers/organization-history.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [OrganizationHistoryController],
  providers: [OrganizationHistoryService],
  exports: [OrganizationHistoryService],
})
export class OrganizationHistoryModule {}

import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { GlobalAssignmentService } from './services/global-assignment.service';
import { WorkAuthorizationService } from './services/work-authorization.service';
import { GlobalMobilityController } from './controllers/global-mobility.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [GlobalMobilityController],
  providers: [GlobalAssignmentService, WorkAuthorizationService],
  exports: [GlobalAssignmentService, WorkAuthorizationService],
})
export class GlobalMobilityModule {}

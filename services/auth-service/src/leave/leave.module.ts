import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { LeaveService } from './services/leave.service';
import { LeaveBalanceService } from './services/leave-balance.service';
import { LeaveController } from './controllers/leave.controller';
import { LeaveBalanceController } from './controllers/leave-balance.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [LeaveController, LeaveBalanceController],
  providers: [LeaveService, LeaveBalanceService],
  exports: [LeaveService, LeaveBalanceService],
})
export class LeaveModule {}

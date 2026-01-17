import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LeaveService } from './services/leave.service';
import { LeaveBalanceService } from './services/leave-balance.service';
import { LeaveController } from './controllers/leave.controller';
import { LeaveBalanceController } from './controllers/leave-balance.controller';

@Module({
  imports: [PrismaModule],
  controllers: [LeaveController, LeaveBalanceController],
  providers: [LeaveService, LeaveBalanceService],
  exports: [LeaveService, LeaveBalanceService],
})
export class LeaveModule {}

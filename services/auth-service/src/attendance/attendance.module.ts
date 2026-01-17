import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AttendanceService } from './services/attendance.service';
import { WorkScheduleService } from './services/work-schedule.service';
import { AttendanceController } from './controllers/attendance.controller';
import { WorkScheduleController } from './controllers/work-schedule.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AttendanceController, WorkScheduleController],
  providers: [AttendanceService, WorkScheduleService],
  exports: [AttendanceService, WorkScheduleService],
})
export class AttendanceModule {}

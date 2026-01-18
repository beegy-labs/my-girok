import { Module } from '@nestjs/common';
import { EmployeeProfileModule } from './profile/employee-profile.module';
import { EmployeeAttendanceModule } from './attendance/employee-attendance.module';
import { EmployeeLeaveModule } from './leave/employee-leave.module';
import { EmployeeDelegationModule } from './delegation/employee-delegation.module';

/**
 * Employee Module (Phase 5)
 * Self-service portal for employees to manage their own data
 */
@Module({
  imports: [
    EmployeeProfileModule,
    EmployeeAttendanceModule,
    EmployeeLeaveModule,
    EmployeeDelegationModule,
  ],
  exports: [
    EmployeeProfileModule,
    EmployeeAttendanceModule,
    EmployeeLeaveModule,
    EmployeeDelegationModule,
  ],
})
export class EmployeeModule {}

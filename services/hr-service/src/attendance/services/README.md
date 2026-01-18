# Attendance Services

> **Status**: Structure Backup Only

## Planned Services

### AttendanceService

- `clockIn(userId, dto)` - Record clock in
- `clockOut(userId, dto)` - Record clock out
- `getStats(userId, dateRange)` - Get attendance statistics
- `findAll(query)` - List attendance records
- `findOne(id)` - Get attendance record by ID

### WorkScheduleService

- `create(dto)` - Create work schedule
- `findAll(query)` - List work schedules
- `findOne(id)` - Get work schedule by ID
- `update(id, dto)` - Update work schedule
- `remove(id)` - Delete work schedule

## Source Files

From `auth-service/attendance/services`:

- `attendance.service.ts`
- `attendance.service.spec.ts`
- `work-schedule.service.ts`
- `work-schedule.service.spec.ts`

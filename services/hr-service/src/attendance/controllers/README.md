# Attendance Controllers

> **Status**: Structure Backup Only

## Planned Controllers

### AttendanceController

- `POST /clock-in` - Clock in with IP/location
- `POST /clock-out` - Clock out with IP/location
- `GET /me/stats` - Get my attendance statistics
- `GET /records` - List attendance records (admin)
- `GET /records/:id` - Get attendance record details

### WorkScheduleController

- `GET /schedules` - List work schedules
- `POST /schedules` - Create work schedule
- `PATCH /schedules/:id` - Update work schedule
- `DELETE /schedules/:id` - Delete work schedule

## Source Files

From `auth-service/attendance/controllers`:

- `attendance.controller.ts`
- `work-schedule.controller.ts`

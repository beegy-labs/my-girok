# Attendance Module

> **Status**: Structure Backup Only
> **Source**: `services/auth-service/src/attendance`

## Planned Features

- Clock in/out tracking with IP/location logging
- Overtime request & approval workflow
- Work schedule management (STANDARD/SHIFT/FLEXIBLE)
- Attendance statistics & reporting

## Source Files to Migrate

From `auth-service/attendance`:

- `attendance.module.ts`
- `controllers/attendance.controller.ts`
- `controllers/work-schedule.controller.ts`
- `dto/attendance.dto.ts`
- `dto/work-schedule.dto.ts`
- `services/attendance.service.ts`
- `services/work-schedule.service.ts`

## API Endpoints (Planned)

| Method | Endpoint                         | Description       |
| ------ | -------------------------------- | ----------------- |
| POST   | /attendance/clock-in             | Clock in          |
| POST   | /attendance/clock-out            | Clock out         |
| GET    | /attendance/me/stats             | Get my statistics |
| PATCH  | /attendance/:id/approve-overtime | Approve overtime  |

## Database Tables (Planned)

- `attendance_records`
- `work_schedules`
- `overtime_requests`

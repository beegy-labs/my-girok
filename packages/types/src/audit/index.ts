// packages/types/src/audit/index.ts
// Re-export proto-generated audit types for SSOT

export {
  AuthEventType,
  AccountType,
  AuthEventResult,
  SecurityEventType,
  SecurityEventSeverity,
  AdminActionType,
  ReportType,
  ReportFormat,
} from '../generated/proto/audit/v1/audit_pb.js';

export type {
  AuthEvent,
  LogAuthEventRequest,
  LogAuthEventResponse,
  GetAuthEventsRequest,
  GetAuthEventsResponse,
  SecurityEvent,
  LogSecurityEventRequest,
  LogSecurityEventResponse,
  AdminAuditLog,
  LogAdminActionRequest,
  LogAdminActionResponse,
} from '../generated/proto/audit/v1/audit_pb.js';

export * from './session-recording.enums.js';

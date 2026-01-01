/**
 * Events Module Exports
 */

// Common base types
export * from './common/index.js';

// Identity Platform events (includes ConsentGrantedEvent, ConsentWithdrawnEvent)
export * from './identity/index.js';

// Auth Service events
export * from './auth/index.js';

// Legal Service events - explicitly re-export to avoid conflicts with identity events
export {
  LegalDocumentPublishedEvent,
  LegalDocumentArchivedEvent,
  // ConsentGrantedEvent - already exported from identity (skip to avoid duplicate)
  // ConsentWithdrawnEvent - already exported from identity (skip to avoid duplicate)
  ConsentExpiredEvent,
  ConsentExpiringSoonEvent,
  DsrRequestSubmittedEvent,
  DsrRequestCompletedEvent,
  DsrDeadlineWarningEvent,
  DsrDeadlineCriticalEvent,
  DsrDeadlineOverdueEvent,
  LEGAL_EVENT_TYPES,
  type LegalEventType,
  type LegalEvent,
} from './legal/index.js';

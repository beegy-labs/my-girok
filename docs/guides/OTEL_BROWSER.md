# Browser OTEL Integration Guide

> Complete guide for integrating OpenTelemetry in web-admin for admin audit tracking

## Overview

The Admin Audit System uses OpenTelemetry Browser SDK to track:

- **UI Events**: Button clicks, page views, form submissions, modal interactions
- **Performance**: Page load times, time to interaction
- **Errors**: JavaScript errors, network failures
- **Sessions**: User sessions with activity metrics

All data is sent to OTEL Collector and stored in ClickHouse `audit_db` with 7-year retention.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (web-admin)                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ AuditContext │  │ TraceProvider│  │ LoggerProvider       │   │
│  │ (React)      │  │ (OTEL)       │  │ (OTEL)               │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│          │                │                    │                 │
│          └────────────────┼────────────────────┘                 │
│                           ▼                                      │
│                    BatchProcessor                                │
│                           │                                      │
└───────────────────────────┼──────────────────────────────────────┘
                            │ OTLP/HTTP
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     OTEL Collector                               │
├─────────────────────────────────────────────────────────────────┤
│  receivers:                                                      │
│    otlp/http (CORS enabled)                                      │
│                                                                  │
│  processors:                                                     │
│    memory_limiter                                                │
│    filter/admin_audit (audit.type = "admin")                     │
│    attributes/sanitize_admin (remove sensitive data)             │
│    batch                                                         │
│                                                                  │
│  exporters:                                                      │
│    clickhouse/audit (7yr TTL)                                    │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     ClickHouse (audit_db)                        │
├─────────────────────────────────────────────────────────────────┤
│  admin_ui_events     - UI interactions                           │
│  admin_api_logs      - API request tracking                      │
│  admin_audit_logs    - Data changes                              │
│  admin_sessions      - Session management                        │
└─────────────────────────────────────────────────────────────────┘
```

## Installation

```bash
pnpm add @opentelemetry/api \
  @opentelemetry/sdk-trace-web \
  @opentelemetry/sdk-logs \
  @opentelemetry/exporter-trace-otlp-http \
  @opentelemetry/exporter-logs-otlp-http \
  @opentelemetry/instrumentation-fetch \
  @opentelemetry/instrumentation-document-load \
  @opentelemetry/instrumentation-user-interaction \
  @opentelemetry/context-zone \
  @opentelemetry/resources \
  @opentelemetry/semantic-conventions
```

## Configuration

### 1. OTEL Provider Setup

```typescript
// src/lib/otel/provider.ts
import { WebTracerProvider, BatchSpanProcessor } from '@opentelemetry/sdk-trace-web';
import { LoggerProvider, BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { UserInteractionInstrumentation } from '@opentelemetry/instrumentation-user-interaction';

const OTEL_ENDPOINT = import.meta.env.VITE_OTEL_ENDPOINT || 'https://otel.girok.dev';

export const initOtel = () => {
  // Common resource attributes
  const resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'web-admin',
    [SemanticResourceAttributes.SERVICE_VERSION]: import.meta.env.VITE_APP_VERSION || '0.0.0',
    'audit.type': 'admin', // Routes to audit_db pipeline
    'deployment.environment': import.meta.env.MODE,
  });

  // Trace provider
  const tracerProvider = new WebTracerProvider({ resource });
  tracerProvider.addSpanProcessor(
    new BatchSpanProcessor(
      new OTLPTraceExporter({
        url: `${OTEL_ENDPOINT}/v1/traces`,
      }),
    ),
  );
  tracerProvider.register({
    contextManager: new ZoneContextManager(),
  });

  // Logger provider
  const loggerProvider = new LoggerProvider({ resource });
  loggerProvider.addLogRecordProcessor(
    new BatchLogRecordProcessor(
      new OTLPLogExporter({
        url: `${OTEL_ENDPOINT}/v1/logs`,
      }),
    ),
  );

  // Auto-instrumentation
  registerInstrumentations({
    tracerProvider,
    instrumentations: [
      new FetchInstrumentation({
        propagateTraceHeaderCorsUrls: [/girok\.(dev|com)/],
        clearTimingResources: true,
      }),
      new DocumentLoadInstrumentation(),
      new UserInteractionInstrumentation({
        eventNames: ['click', 'submit'],
      }),
    ],
  });

  return { tracerProvider, loggerProvider };
};
```

### 2. Session Management

```typescript
// src/lib/otel/session.ts

export interface AuditSession {
  id: string;
  startedAt: string;
  sequence: number;
}

const SESSION_KEY = 'otel_audit_session';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export const getSession = (): AuditSession => {
  const stored = sessionStorage.getItem(SESSION_KEY);

  if (stored) {
    const session = JSON.parse(stored) as AuditSession;
    const elapsed = Date.now() - new Date(session.startedAt).getTime();

    // Check if session is still valid
    if (elapsed < SESSION_TIMEOUT_MS) {
      return session;
    }
  }

  // Create new session
  const newSession: AuditSession = {
    id: crypto.randomUUID(),
    startedAt: new Date().toISOString(),
    sequence: 0,
  };

  sessionStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
  return newSession;
};

export const incrementSequence = (): number => {
  const session = getSession();
  session.sequence += 1;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session.sequence;
};

export const endSession = (reason: 'logout' | 'timeout' | 'forced' | 'error') => {
  const session = getSession();
  // Log session end event
  logSessionEnd(session, reason);
  sessionStorage.removeItem(SESSION_KEY);
};
```

### 3. Audit Context (React)

```typescript
// src/contexts/AuditContext.tsx
import { createContext, useContext, useCallback, useEffect, ReactNode } from 'react';
import { trace, context, SpanKind } from '@opentelemetry/api';
import { getSession, incrementSequence } from '@/lib/otel/session';

interface AuditContextValue {
  trackPageView: (path: string, title: string) => void;
  trackClick: (event: ClickEvent) => void;
  trackFormSubmit: (event: FormEvent) => void;
  trackModalOpen: (event: ModalEvent) => void;
  trackModalClose: (event: ModalEvent) => void;
  trackError: (error: Error, context?: Record<string, unknown>) => void;
}

interface ClickEvent {
  eventName: string;
  eventCategory: string;
  componentId?: string;
  componentType?: string;
  buttonText?: string;
  serviceId?: string;
}

interface FormEvent {
  eventName: string;
  eventCategory: string;
  formId: string;
  formFields: string[];
  serviceId?: string;
}

interface ModalEvent {
  eventName: string;
  eventCategory: string;
  modalId: string;
  serviceId?: string;
}

const AuditContext = createContext<AuditContextValue | null>(null);

export const AuditProvider = ({ children, user }: { children: ReactNode; user: User }) => {
  const tracer = trace.getTracer('web-admin');

  const getCommonAttributes = useCallback(() => {
    const session = getSession();
    return {
      'session.id': session.id,
      'session.start': session.startedAt,
      'session.sequence': incrementSequence(),
      'actor.id': user.sub,
      'actor.email': user.email,
      'actor.scope': user.scope,
      'actor.role': user.roleName,
      'ui.viewport_width': window.innerWidth,
      'ui.viewport_height': window.innerHeight,
      'ui.page_path': window.location.pathname,
      'device.user_agent': navigator.userAgent,
      'device.language': navigator.language,
      'device.timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }, [user]);

  const trackPageView = useCallback((path: string, title: string) => {
    const span = tracer.startSpan('page_view', { kind: SpanKind.CLIENT });
    span.setAttributes({
      ...getCommonAttributes(),
      'event.type': 'page_view',
      'event.name': path,
      'event.category': 'navigation',
      'ui.page_path': path,
      'ui.page_title': title,
      'ui.page_referrer': document.referrer,
    });
    span.end();
  }, [tracer, getCommonAttributes]);

  const trackClick = useCallback((event: ClickEvent) => {
    const span = tracer.startSpan('click', { kind: SpanKind.CLIENT });
    span.setAttributes({
      ...getCommonAttributes(),
      'event.type': 'click',
      'event.name': event.eventName,
      'event.category': event.eventCategory,
      'event.action': 'click',
      'ui.component_id': event.componentId,
      'ui.component_type': event.componentType || 'button',
      'ui.button_text': event.buttonText,
      'service.id': event.serviceId,
    });
    span.end();
  }, [tracer, getCommonAttributes]);

  const trackFormSubmit = useCallback((event: FormEvent) => {
    const span = tracer.startSpan('form_submit', { kind: SpanKind.CLIENT });
    span.setAttributes({
      ...getCommonAttributes(),
      'event.type': 'form_submit',
      'event.name': event.eventName,
      'event.category': event.eventCategory,
      'event.action': 'submit',
      'ui.form_id': event.formId,
      'ui.form_fields': event.formFields.join(','),
      'service.id': event.serviceId,
    });
    span.end();
  }, [tracer, getCommonAttributes]);

  const trackModalOpen = useCallback((event: ModalEvent) => {
    const span = tracer.startSpan('modal_open', { kind: SpanKind.CLIENT });
    span.setAttributes({
      ...getCommonAttributes(),
      'event.type': 'modal_open',
      'event.name': event.eventName,
      'event.category': event.eventCategory,
      'event.action': 'open',
      'ui.component_id': event.modalId,
      'ui.component_type': 'modal',
      'service.id': event.serviceId,
    });
    span.end();
  }, [tracer, getCommonAttributes]);

  const trackModalClose = useCallback((event: ModalEvent) => {
    const span = tracer.startSpan('modal_close', { kind: SpanKind.CLIENT });
    span.setAttributes({
      ...getCommonAttributes(),
      'event.type': 'modal_close',
      'event.name': event.eventName,
      'event.category': event.eventCategory,
      'event.action': 'close',
      'ui.component_id': event.modalId,
      'ui.component_type': 'modal',
      'service.id': event.serviceId,
    });
    span.end();
  }, [tracer, getCommonAttributes]);

  const trackError = useCallback((error: Error, ctx?: Record<string, unknown>) => {
    const span = tracer.startSpan('error', { kind: SpanKind.CLIENT });
    span.setAttributes({
      ...getCommonAttributes(),
      'event.type': 'error',
      'event.name': error.name,
      'event.category': 'system',
      'event.action': 'error',
      'error.type': error.name,
      'error.message': error.message,
      'error.stack': error.stack?.slice(0, 1000),
      ...ctx,
    });
    span.recordException(error);
    span.end();
  }, [tracer, getCommonAttributes]);

  // Global error handler
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      trackError(event.error || new Error(event.message), {
        'error.filename': event.filename,
        'error.lineno': event.lineno,
        'error.colno': event.colno,
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      trackError(
        event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        { 'error.type': 'unhandledrejection' }
      );
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [trackError]);

  return (
    <AuditContext.Provider
      value={{
        trackPageView,
        trackClick,
        trackFormSubmit,
        trackModalOpen,
        trackModalClose,
        trackError,
      }}
    >
      {children}
    </AuditContext.Provider>
  );
};

export const useAudit = () => {
  const context = useContext(AuditContext);
  if (!context) {
    throw new Error('useAudit must be used within AuditProvider');
  }
  return context;
};
```

### 4. Page View Tracking Hook

```typescript
// src/hooks/usePageTracking.ts
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAudit } from '@/contexts/AuditContext';

export const usePageTracking = () => {
  const location = useLocation();
  const { trackPageView } = useAudit();

  useEffect(() => {
    trackPageView(location.pathname, document.title);
  }, [location.pathname, trackPageView]);
};
```

### 5. Audited Components

```typescript
// src/components/AuditedButton.tsx
import { Button, ButtonProps } from '@my-girok/ui-components';
import { useAudit } from '@/contexts/AuditContext';

interface AuditedButtonProps extends ButtonProps {
  eventName: string;
  eventCategory: string;
  serviceId?: string;
}

export const AuditedButton = ({
  eventName,
  eventCategory,
  serviceId,
  onClick,
  children,
  ...props
}: AuditedButtonProps) => {
  const { trackClick } = useAudit();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    trackClick({
      eventName,
      eventCategory,
      componentId: props.id,
      componentType: 'button',
      buttonText: typeof children === 'string' ? children : undefined,
      serviceId,
    });
    onClick?.(e);
  };

  return (
    <Button {...props} onClick={handleClick}>
      {children}
    </Button>
  );
};
```

## Event Naming Conventions

### Event Names

Format: `{resource}_{action}_{component}`

Examples:

- `sanction_create_btn`
- `sanction_revoke_confirm`
- `tester_add_modal`
- `config_save_form`

### Event Categories

| Category   | Use For                 |
| ---------- | ----------------------- |
| sanction   | Sanction management     |
| tester     | Tester management       |
| config     | Service configuration   |
| feature    | Feature management      |
| navigation | Page views, menu clicks |
| system     | Login, logout, errors   |

### Component Types

| Type   | Description               |
| ------ | ------------------------- |
| button | Clickable buttons         |
| form   | Form submissions          |
| modal  | Dialog/modal interactions |
| table  | Table row actions         |
| menu   | Navigation menu items     |
| link   | Hyperlinks                |

## Environment Variables

```bash
# .env
VITE_OTEL_ENDPOINT=https://otel.girok.dev
VITE_APP_VERSION=1.0.0
```

## Testing

### Local Development

1. Start OTEL Collector with debug exporter:

```yaml
# docker-compose.otel.yaml
services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:0.138.0
    ports:
      - '4317:4317'
      - '4318:4318'
    volumes:
      - ./otel-config.yaml:/etc/otelcol-contrib/config.yaml
```

2. Verify events in browser DevTools Network tab

3. Check ClickHouse:

```sql
SELECT * FROM audit_db.admin_ui_events
WHERE date = today()
ORDER BY timestamp DESC
LIMIT 10;
```

## Security Considerations

### Data Sanitization

OTEL Collector removes sensitive attributes:

- password
- token
- secret
- refresh_token
- authorization
- api_key
- credentials

### IP Anonymization

Last octet of IP addresses is zeroed for GDPR compliance:

```
192.168.1.123 → 192.168.1.0
```

### CORS

Only allowed origins can send OTLP requests:

- `https://*.girok.dev`
- `https://*.girok.com`
- `http://localhost:*` (dev only)

## Troubleshooting

### Events Not Appearing

1. Check browser console for OTEL errors
2. Verify CORS headers in Network tab
3. Check OTEL Collector logs
4. Query ClickHouse directly

### High Memory Usage

1. Reduce batch size in BatchSpanProcessor
2. Increase flush interval
3. Check for memory leaks in event handlers

### Session Issues

1. Verify sessionStorage is not disabled
2. Check for multiple tabs creating duplicate sessions
3. Monitor session timeout behavior

## Related Documentation

- **LLM Guide**: `.ai/otel.md`
- **Audit Service**: `.ai/services/audit-service.md`
- **ClickHouse Schema**: `infrastructure/clickhouse/schemas/01-audit_db.sql`
- **OTEL Collector Config**: `platform-gitops/clusters/home/values/opentelemetry-values.yaml`

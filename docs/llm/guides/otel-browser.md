# Browser OTEL Integration

```
Browser (web-admin) -> OTEL Collector -> ClickHouse (audit_db, 7yr TTL)
                    OTLP/HTTP
```

## Install

```bash
pnpm add @opentelemetry/api @opentelemetry/sdk-trace-web @opentelemetry/sdk-logs \
  @opentelemetry/exporter-trace-otlp-http @opentelemetry/exporter-logs-otlp-http \
  @opentelemetry/instrumentation-fetch @opentelemetry/instrumentation-document-load \
  @opentelemetry/instrumentation-user-interaction @opentelemetry/context-zone \
  @opentelemetry/resources @opentelemetry/semantic-conventions
```

## Provider Setup

```typescript
// src/lib/otel/provider.ts
import { WebTracerProvider, BatchSpanProcessor } from '@opentelemetry/sdk-trace-web';
import { LoggerProvider, BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { UserInteractionInstrumentation } from '@opentelemetry/instrumentation-user-interaction';

const OTEL_ENDPOINT = import.meta.env.VITE_OTEL_ENDPOINT || 'https://otel.girok.dev';

export const initOtel = () => {
  const resource = new Resource({
    'service.name': 'web-admin',
    'service.version': import.meta.env.VITE_APP_VERSION || '0.0.0',
    'audit.type': 'admin',
    'deployment.environment': import.meta.env.MODE,
  });

  const tracerProvider = new WebTracerProvider({ resource });
  tracerProvider.addSpanProcessor(
    new BatchSpanProcessor(new OTLPTraceExporter({ url: `${OTEL_ENDPOINT}/v1/traces` })),
  );
  tracerProvider.register({ contextManager: new ZoneContextManager() });

  const loggerProvider = new LoggerProvider({ resource });
  loggerProvider.addLogRecordProcessor(
    new BatchLogRecordProcessor(new OTLPLogExporter({ url: `${OTEL_ENDPOINT}/v1/logs` })),
  );

  registerInstrumentations({
    tracerProvider,
    instrumentations: [
      new FetchInstrumentation({
        propagateTraceHeaderCorsUrls: [/girok\.(dev|com)/],
        clearTimingResources: true,
      }),
      new DocumentLoadInstrumentation(),
      new UserInteractionInstrumentation({ eventNames: ['click', 'submit'] }),
    ],
  });

  return { tracerProvider, loggerProvider };
};
```

## Session Management

```typescript
// src/lib/otel/session.ts
const SESSION_KEY = 'otel_audit_session';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

interface AuditSession {
  id: string;
  startedAt: string;
  sequence: number;
}

export const getSession = (): AuditSession => {
  const stored = sessionStorage.getItem(SESSION_KEY);
  if (stored) {
    const session = JSON.parse(stored);
    if (Date.now() - new Date(session.startedAt).getTime() < SESSION_TIMEOUT_MS) return session;
  }
  const newSession = { id: crypto.randomUUID(), startedAt: new Date().toISOString(), sequence: 0 };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
  return newSession;
};

export const incrementSequence = (): number => {
  const session = getSession();
  session.sequence += 1;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session.sequence;
};
```

## AuditContext

```typescript
// src/contexts/AuditContext.tsx
const AuditContext = createContext<AuditContextValue | null>(null);

export const AuditProvider = ({ children, user }) => {
  const tracer = trace.getTracer('web-admin');

  const getCommonAttributes = useCallback(() => ({
    'session.id': getSession().id,
    'session.sequence': incrementSequence(),
    'actor.id': user.sub,
    'actor.email': user.email,
    'actor.role': user.roleName,
    'ui.page_path': window.location.pathname,
    'device.user_agent': navigator.userAgent
  }), [user]);

  const trackPageView = useCallback((path, title) => {
    const span = tracer.startSpan('page_view', { kind: SpanKind.CLIENT });
    span.setAttributes({ ...getCommonAttributes(), 'event.type': 'page_view', 'ui.page_path': path, 'ui.page_title': title });
    span.end();
  }, [tracer, getCommonAttributes]);

  const trackClick = useCallback((event) => {
    const span = tracer.startSpan('click', { kind: SpanKind.CLIENT });
    span.setAttributes({ ...getCommonAttributes(), 'event.type': 'click', 'event.name': event.eventName, 'event.category': event.eventCategory });
    span.end();
  }, [tracer, getCommonAttributes]);

  // trackFormSubmit, trackModalOpen, trackModalClose, trackError similar pattern

  return <AuditContext.Provider value={{ trackPageView, trackClick, ... }}>{children}</AuditContext.Provider>;
};

export const useAudit = () => { const ctx = useContext(AuditContext); if (!ctx) throw new Error('useAudit must be within AuditProvider'); return ctx; };
```

## Page Tracking Hook

```typescript
export const usePageTracking = () => {
  const location = useLocation();
  const { trackPageView } = useAudit();
  useEffect(() => {
    trackPageView(location.pathname, document.title);
  }, [location.pathname, trackPageView]);
};
```

## AuditedButton

```typescript
export const AuditedButton = ({ eventName, eventCategory, serviceId, onClick, children, ...props }) => {
  const { trackClick } = useAudit();
  const handleClick = (e) => {
    trackClick({ eventName, eventCategory, componentId: props.id, componentType: 'button', buttonText: typeof children === 'string' ? children : undefined, serviceId });
    onClick?.(e);
  };
  return <Button {...props} onClick={handleClick}>{children}</Button>;
};
```

## Event Naming

Format: `{resource}_{action}_{component}`

Examples: `sanction_create_btn`, `config_save_form`, `tester_add_modal`

### Categories

| Category   | Use                   |
| ---------- | --------------------- |
| sanction   | Sanction management   |
| tester     | Tester management     |
| config     | Service configuration |
| feature    | Feature management    |
| navigation | Page views, menus     |
| system     | Login, logout, errors |

### Component Types

| Type   | Description       |
| ------ | ----------------- |
| button | Clickable buttons |
| form   | Form submissions  |
| modal  | Dialogs           |
| table  | Table row actions |
| menu   | Navigation items  |
| link   | Hyperlinks        |

## Environment

```bash
VITE_OTEL_ENDPOINT=https://otel.girok.dev
VITE_APP_VERSION=1.0.0
```

## Security

### Sanitized Attributes

password, token, secret, refresh_token, authorization, api_key, credentials

### IP Anonymization

`192.168.1.123` -> `192.168.1.0` (GDPR)

### CORS Origins

- `https://*.girok.dev`
- `https://*.girok.com`
- `http://localhost:*` (dev only)

## Troubleshooting

| Issue                | Check                                                    |
| -------------------- | -------------------------------------------------------- |
| Events not appearing | Console errors, CORS headers, Collector logs, ClickHouse |
| High memory          | Reduce batch size, increase flush interval               |
| Session issues       | sessionStorage enabled, multiple tabs                    |

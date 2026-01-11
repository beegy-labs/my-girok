# 브라우저 OpenTelemetry 통합 가이드

> 클라이언트 측에서 OTEL을 사용한 web-admin용 감사 로깅

## 아키텍처 개요

```
Browser (web-admin) -> OTEL Collector -> ClickHouse (audit_db, 7yr TTL)
                    OTLP/HTTP
```

브라우저 OTEL 통합은 사용자 상호작용, 페이지 뷰 및 오류를 캡처하여 포괄적인 관리자 활동 감사를 수행합니다.

## 설치

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

## 프로바이더 설정

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

  // Trace provider for spans
  const tracerProvider = new WebTracerProvider({ resource });
  tracerProvider.addSpanProcessor(
    new BatchSpanProcessor(new OTLPTraceExporter({ url: `${OTEL_ENDPOINT}/v1/traces` })),
  );
  tracerProvider.register({ contextManager: new ZoneContextManager() });

  // Logger provider for logs
  const loggerProvider = new LoggerProvider({ resource });
  loggerProvider.addLogRecordProcessor(
    new BatchLogRecordProcessor(new OTLPLogExporter({ url: `${OTEL_ENDPOINT}/v1/logs` })),
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

## 세션 관리

```typescript
// src/lib/otel/session.ts
const SESSION_KEY = 'otel_audit_session';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

interface AuditSession {
  id: string;
  startedAt: string;
  sequence: number;
}

export const getSession = (): AuditSession => {
  const stored = sessionStorage.getItem(SESSION_KEY);
  if (stored) {
    const session = JSON.parse(stored);
    if (Date.now() - new Date(session.startedAt).getTime() < SESSION_TIMEOUT_MS) {
      return session;
    }
  }
  const newSession = {
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
```

## AuditContext 프로바이더

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
    span.setAttributes({
      ...getCommonAttributes(),
      'event.type': 'page_view',
      'ui.page_path': path,
      'ui.page_title': title
    });
    span.end();
  }, [tracer, getCommonAttributes]);

  const trackClick = useCallback((event) => {
    const span = tracer.startSpan('click', { kind: SpanKind.CLIENT });
    span.setAttributes({
      ...getCommonAttributes(),
      'event.type': 'click',
      'event.name': event.eventName,
      'event.category': event.eventCategory
    });
    span.end();
  }, [tracer, getCommonAttributes]);

  return (
    <AuditContext.Provider value={{ trackPageView, trackClick, ... }}>
      {children}
    </AuditContext.Provider>
  );
};

export const useAudit = () => {
  const ctx = useContext(AuditContext);
  if (!ctx) throw new Error('useAudit must be within AuditProvider');
  return ctx;
};
```

## 페이지 추적 훅

```typescript
export const usePageTracking = () => {
  const location = useLocation();
  const { trackPageView } = useAudit();

  useEffect(() => {
    trackPageView(location.pathname, document.title);
  }, [location.pathname, trackPageView]);
};
```

## AuditedButton 컴포넌트

```typescript
export const AuditedButton = ({
  eventName,
  eventCategory,
  serviceId,
  onClick,
  children,
  ...props
}) => {
  const { trackClick } = useAudit();

  const handleClick = (e) => {
    trackClick({
      eventName,
      eventCategory,
      componentId: props.id,
      componentType: 'button',
      buttonText: typeof children === 'string' ? children : undefined,
      serviceId
    });
    onClick?.(e);
  };

  return <Button {...props} onClick={handleClick}>{children}</Button>;
};
```

## 이벤트 명명 규칙

### 형식

`{resource}_{action}_{component}`

### 예시

- `sanction_create_btn` - Create sanction button click
- `config_save_form` - Save configuration form submission
- `tester_add_modal` - Add tester modal open

### 이벤트 카테고리

| Category   | Use Case                      |
| ---------- | ----------------------------- |
| sanction   | Sanction management actions   |
| tester     | Test user management          |
| config     | Service configuration changes |
| feature    | Feature flag management       |
| navigation | Page views and menu clicks    |
| system     | Login, logout, errors         |

### 컴포넌트 타입

| Type   | Description           |
| ------ | --------------------- |
| button | Clickable buttons     |
| form   | Form submissions      |
| modal  | Dialog interactions   |
| table  | Table row actions     |
| menu   | Navigation menu items |
| link   | Hyperlink clicks      |

## 환경 설정

```bash
VITE_OTEL_ENDPOINT=https://otel.girok.dev
VITE_APP_VERSION=1.0.0
```

## 보안 조치

### 정제된 속성

다음 속성 이름은 자동으로 redacted 됩니다:

- password
- token
- secret
- refresh_token
- authorization
- api_key
- credentials

### IP 익명화

IP 주소는 GDPR 준수를 위해 익명화됩니다:

`192.168.1.123` → `192.168.1.0`

### CORS 출처

OTEL 엔드포인트에 허용된 출처:

- `https://*.girok.dev`
- `https://*.girok.com`
- `http://localhost:*` (개발 전용)

## 문제 해결

| Issue                | What to Check                                                              |
| -------------------- | -------------------------------------------------------------------------- |
| Events not appearing | Browser console errors, CORS headers, Collector logs, ClickHouse ingestion |
| High memory usage    | Reduce batch size, increase flush interval                                 |
| Session issues       | sessionStorage enabled? Multiple tabs open?                                |

---

**LLM Reference**: `docs/llm/guides/OTEL_BROWSER.md`

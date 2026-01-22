# Browser OTEL Patterns

> AuditContext, event naming, environment, security, and troubleshooting

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

---

_Main: `otel-browser.md`_

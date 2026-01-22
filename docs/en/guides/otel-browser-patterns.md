# Browser OpenTelemetry Patterns Guide

This guide covers the AuditContext implementation, event naming conventions, environment configuration, security considerations, and troubleshooting for browser-side OpenTelemetry instrumentation.

## Overview

Browser-side telemetry captures user interactions, page views, and errors for analytics and debugging purposes. The implementation uses OpenTelemetry with custom context providers to ensure consistent event tracking across the application.

## AuditContext Implementation

The AuditContext provides a React context for tracking user interactions throughout the application:

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

  // Additional tracking methods follow the same pattern

  return <AuditContext.Provider value={{ trackPageView, trackClick, ... }}>{children}</AuditContext.Provider>;
};

export const useAudit = () => {
  const ctx = useContext(AuditContext);
  if (!ctx) throw new Error('useAudit must be within AuditProvider');
  return ctx;
};
```

Every tracked event includes common attributes like session ID, actor information, and current page path for consistent correlation.

## AuditedButton Component

For convenient button tracking, use the AuditedButton component:

```typescript
export const AuditedButton = ({ eventName, eventCategory, serviceId, onClick, children, ...props }) => {
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

This component automatically tracks click events while preserving the normal button behavior.

## Event Naming Conventions

### Format

Events should follow the format: `{resource}_{action}_{component}`

Examples:

- `sanction_create_btn` - Creating a sanction via button click
- `config_save_form` - Saving configuration via form submission
- `tester_add_modal` - Adding a tester via modal dialog

### Event Categories

| Category   | Description                      |
| ---------- | -------------------------------- |
| sanction   | Sanction management operations   |
| tester     | Tester management operations     |
| config     | Service configuration changes    |
| feature    | Feature flag management          |
| navigation | Page views and menu interactions |
| system     | Login, logout, and error events  |

### Component Types

| Type   | Description                 |
| ------ | --------------------------- |
| button | Clickable button elements   |
| form   | Form submission events      |
| modal  | Dialog open/close events    |
| table  | Table row action events     |
| menu   | Navigation menu item clicks |
| link   | Hyperlink navigation events |

## Environment Configuration

Configure the OpenTelemetry endpoint and application version via environment variables:

```bash
VITE_OTEL_ENDPOINT=https://otel.girok.dev
VITE_APP_VERSION=1.0.0
```

The endpoint should point to your OpenTelemetry Collector instance.

## Security Considerations

### Attribute Sanitization

Sensitive attributes are automatically removed before transmission. The following patterns are sanitized:

- password
- token
- secret
- refresh_token
- authorization
- api_key
- credentials

Never include these values in event attributes.

### IP Address Anonymization

To comply with GDPR requirements, IP addresses are anonymized:

- Original: `192.168.1.123`
- Anonymized: `192.168.1.0`

The last octet is zeroed out to prevent individual identification while preserving geographic information.

### CORS Configuration

The OpenTelemetry Collector accepts requests from the following origins:

- `https://*.girok.dev` - Development and staging environments
- `https://*.girok.com` - Production environment
- `http://localhost:*` - Local development only

## Troubleshooting

### Events Not Appearing

If events are not showing up in your analytics dashboard:

1. **Check browser console**: Look for JavaScript errors or failed network requests
2. **Verify CORS headers**: Ensure the Collector returns appropriate CORS headers
3. **Check Collector logs**: Look for ingestion errors or dropped spans
4. **Query ClickHouse directly**: Verify data is reaching the storage layer

### High Memory Usage

If the browser is consuming excessive memory:

- Reduce the batch size for span export
- Increase the flush interval to batch more spans together
- Consider sampling high-frequency events

### Session Tracking Issues

If session IDs are inconsistent or missing:

- Verify sessionStorage is enabled in the browser
- Check for issues with multiple tabs sharing the same session
- Ensure the session ID is generated before any events are tracked

---

_This document is auto-generated from `docs/llm/guides/otel-browser-patterns.md`_

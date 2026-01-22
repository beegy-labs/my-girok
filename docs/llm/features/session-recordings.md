# Session Recording Features

```yaml
updated: 2026-01-12
scope: Tasks #4, #5, #6
status: Implemented
pr: '#542'
```

## Features Overview

| Feature                  | Location               | Purpose                               |
| ------------------------ | ---------------------- | ------------------------------------- |
| Real-time Monitoring     | `LiveSessionsPage.tsx` | Monitor active sessions via WebSocket |
| Session Heatmaps         | `SessionHeatmap.tsx`   | Visualize clicks and scroll depth     |
| Privacy Controls         | `PrivacyControls.tsx`  | Configure data masking rules          |
| Session Export           | `SessionExport.tsx`    | Export and share session recordings   |
| Authorization Versioning | `PoliciesTab.tsx`      | Compare/rollback authorization models |

## 1. Real-time Session Monitoring

**Location**: `apps/web-admin/src/pages/system/session-recordings/LiveSessionsPage.tsx`

### Configuration

```yaml
websocket:
  url_env: VITE_WS_URL
  url_default: ws://localhost:3000/admin/sessions/live

reconnection:
  base_delay: 1000ms
  max_delay: 30000ms
  max_attempts: 10
  strategy: Exponential backoff with jitter
```

### Capabilities

- Live session statistics (total, by service, by device)
- Filtering: service (web-app, web-admin), device (desktop, mobile, tablet)
- Connection status with manual reconnect

## 2. Session Heatmaps

**Location**: `apps/web-admin/src/components/SessionHeatmap.tsx`

```typescript
<ClickHeatmap
  points={[{ x: 50, y: 50, intensity: 10 }]}
  backgroundImage="/screenshot.png"
/>

<ScrollDepthHeatmap
  depths={[10, 25, 50, 75, 90, 100]}
  pageHeight={2000}
/>
```

## 3. Privacy Controls

**Config**: `apps/web-admin/src/config/privacy-rules.config.ts`

| Type     | Effect                  | Use Case              |
| -------- | ----------------------- | --------------------- |
| `block`  | Completely hide element | Passwords, SSN        |
| `blur`   | Obscure content         | General PII           |
| `redact` | Replace with asterisks  | Emails, phone numbers |

## 4. Session Export

| Format | Status         | Description                 |
| ------ | -------------- | --------------------------- |
| JSON   | ✅ Implemented | Complete session + metadata |
| MP4    | 🚧 Planned     | Rendered video replay       |
| PDF    | 🚧 Planned     | Summary report              |

## Testing

| Area                    | Test Count |
| ----------------------- | ---------- |
| PrivacyControls         | 15+        |
| SessionExport           | 30+        |
| SessionHeatmap          | 30+        |
| useRealTimeSessions     | 20+        |
| SessionRecordingService | 110+       |

**Total**: 220+ test cases

## Related Documentation

- **Implementation Details**: `session-recordings-impl.md`
- [Privacy Rules](../packages/privacy-rules.md)
- [Caching Policy](../policies/caching.md)

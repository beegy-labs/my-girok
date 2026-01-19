# Session Recording Features

```yaml
updated: 2026-01-12
scope: Tasks #4, #5, #6
status: Implemented
pr: '#542'
```

## Features Overview

| Feature                  | Location                                    | Purpose                               |
| ------------------------ | ------------------------------------------- | ------------------------------------- |
| Real-time Monitoring     | `LiveSessionsPage.tsx`                      | Monitor active sessions via WebSocket |
| Session Heatmaps         | `SessionHeatmap.tsx`                        | Visualize clicks and scroll depth     |
| Privacy Controls         | `PrivacyControls.tsx`                       | Configure data masking rules          |
| Session Export           | `SessionExport.tsx`, `export.controller.ts` | Export and share session recordings   |
| Authorization Versioning | `PoliciesTab.tsx`, `ModelDiff.tsx`          | Compare/rollback authorization models |

## 1. Real-time Session Monitoring

**Location**: `apps/web-admin/src/pages/system/session-recordings/LiveSessionsPage.tsx`

### Configuration

```yaml
websocket:
  url_env: VITE_WS_URL
  url_default: ws://localhost:3000/admin/sessions/live

reconnection:
  base_delay: 1000ms # VITE_WS_RECONNECT_BASE_DELAY
  max_delay: 30000ms # VITE_WS_RECONNECT_MAX_DELAY
  max_attempts: 10 # VITE_WS_RECONNECT_MAX_ATTEMPTS
  strategy: Exponential backoff with jitter
```

### WebSocket Events

| Event               | Trigger               |
| ------------------- | --------------------- |
| `session_started`   | New session initiated |
| `session_updated`   | Session info updated  |
| `session_ended`     | Session terminated    |
| `sessions_snapshot` | Complete session list |

### Capabilities

- Live session statistics (total, by service, by device)
- Filtering: service (web-app, web-admin), device (desktop, mobile, tablet)
- Connection status with manual reconnect
- Session details: actor, location, device, browser, activity

## 2. Session Heatmaps

**Location**: `apps/web-admin/src/components/SessionHeatmap.tsx`

### Click Heatmap

```typescript
<ClickHeatmap
  points={[{ x: 50, y: 50, intensity: 10 }]}  // x, y as % of viewport
  backgroundImage="/screenshot.png"
  width={1024}
  height={768}
/>
```

**Features**:

- Canvas-based rendering with radial gradients
- Intensity normalization
- Statistics: total clicks, max clicks/point, avg clicks

### Scroll Depth Heatmap

```typescript
<ScrollDepthHeatmap
  depths={[10, 25, 50, 75, 90, 100]}  // Percentages
  pageHeight={2000}
/>
```

**Features**:

- 20-bucket visualization
- Average scroll depth
- Hover tooltips

## 3. Privacy Controls

**Config**: `apps/web-admin/src/config/privacy-rules.config.ts`

### Masking Types

| Type     | Effect                  | Use Case              |
| -------- | ----------------------- | --------------------- |
| `block`  | Completely hide element | Passwords, SSN        |
| `blur`   | Obscure content         | General PII           |
| `redact` | Replace with asterisks  | Emails, phone numbers |

### Preset Rules

```yaml
passwords: { selector: 'input[type="password"]', maskType: block }
emails: { selector: 'input[type="email"]', maskType: redact }
credit_cards: { selector: 'input[data-card]', maskType: block }
ssn: { selector: 'input[data-ssn]', maskType: block }
phone: { selector: 'input[type="tel"]', maskType: redact }
```

### PII Detection Patterns

| Type        | Regex                                                     |
| ----------- | --------------------------------------------------------- |
| Email       | `/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z\|a-z]{2,}\b/g` |
| Phone       | `/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g`                        |
| Credit Card | `/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g`           |
| SSN         | `/\b\d{3}-\d{2}-\d{4}\b/g`                                |

## 4. Session Export & Sharing

### Export Formats

| Format | Status         | Description                     |
| ------ | -------------- | ------------------------------- |
| JSON   | ✅ Implemented | Complete session + metadata     |
| MP4    | 🚧 Planned     | Rendered video replay           |
| PDF    | 🚧 Planned     | Summary report with screenshots |

### Share Links

**Configuration** (auth-bff):

```yaml
redis_prefix: SESSION_SHARE_LINK_PREFIX (default: session_share_link)
max_ttl: SESSION_SHARE_LINK_MAX_TTL (default: 2592000000ms = 30 days)

expiration_options:
  - 1h
  - 24h
  - 7d
  - 30d
  - never (up to max TTL)

storage: Redis/Valkey with TTL-based expiration
```

**Endpoints**:

```yaml
create: POST /admin/session-recordings/share/:sessionId { expiresIn: "24h" }
access: GET /admin/session-recordings/shared/:token
```

## 5. Authorization Model Versioning

**Location**: `apps/web-admin/src/components/ModelDiff.tsx`

### ModelDiff Component

```typescript
<ModelDiff
  oldContent={v1.content}
  newContent={v2.content}
  oldLabel="v1.0 (2026-01-10)"
  newLabel="v2.0 - Active (2026-01-12)"
/>
```

**Features**:

- Line-by-line diff using `diff` library
- Color-coded: green (additions), red (deletions)
- Statistics: total additions/deletions
- Theme-aware styling

### Workflow

1. View version history
2. Click "View Diff" on any version
3. Review changes
4. Click "Rollback" to revert
5. Confirm action → Version becomes active

## 6. Audit Service Refactoring

**Location**: `services/audit-service/src/session-recordings/services/session-recording.service.ts`

**Purpose**: Move enum conversion logic from controller to service layer

### Enum Conversion Methods

```typescript
convertDeviceTypeToNumber(deviceType: string): number
convertDeviceTypeToString(deviceType: number): string
convertActorTypeToNumber(actorType: string): number
convertActorTypeToString(actorType: number): string
convertStatusToNumber(status: string): number
```

**Benefits**: Better separation, testability, reusability

## Architecture

```yaml
frontend:
  stack: React 19.2, TypeScript 5.9, Canvas API, WebSocket, Vite

backend:
  stack: NestJS 11, Redis/Valkey, gRPC, ClickHouse

data_flow: User Browser → (WebSocket) → LiveSessionsPage → useRealTimeSessionsWebSocket
  → (gRPC) → Auth-BFF → Audit Service → ClickHouse
  → (Redis) → Share Links (TTL expiration)
```

## Testing

| Area                    | Test Count | Focus                                    |
| ----------------------- | ---------- | ---------------------------------------- |
| PrivacyControls         | 15+        | Rules, masking, PII detection            |
| SessionExport           | 30+        | Export formats, share links, expiration  |
| SessionHeatmap          | 30+        | Canvas rendering, click/scroll analytics |
| useRealTimeSessions     | 20+        | WebSocket, reconnection, state           |
| SessionRecordingService | 110+       | Enum conversion, service logic           |
| ExportController        | 15+        | API integration, error handling          |

**Total**: 220+ test cases

## Security

```yaml
privacy_masking:
  defaults: block for highly sensitive data
  patterns: Centralized PII configuration
  customization: Per-service rules

share_links:
  token: Cryptographically secure (32 bytes)
  expiration: Automatic via Redis TTL
  access: Token-based, no permanent public access

websocket:
  auth: Required
  source: Admin panel only
  rate_limit: Connection attempts
  reconnect: Automatic with backoff
```

## Performance

```yaml
canvas:
  - Memoized generation
  - Point intensity normalization
  - Efficient radial gradients

websocket:
  - Exponential backoff prevents thundering herd
  - Configurable limits
  - State management

redis:
  - TTL-based automatic cleanup
  - No manual garbage collection
  - Distributed cache
```

## Troubleshooting

| Issue                  | Solutions                                                     |
| ---------------------- | ------------------------------------------------------------- |
| WebSocket disconnected | Verify URL, check server, verify network allows WS            |
| Share link expired     | Verify Redis running, check TTL, verify prefix matches        |
| Heatmap not rendering  | Verify points array, check coordinates (0-100%), check canvas |

## Future Enhancements

- Video export (MP4 rendering via headless browser)
- PDF reports with screenshots and analysis
- Advanced heatmaps (rage click, attention)
- Real-time alerts for suspicious patterns
- Interactive replay player with timeline

## References

- [Privacy Rules](../packages/privacy-rules.md)
- [WebSocket Architecture](../architecture/websocket.md)
- [Caching Policy](../policies/caching.md)
- [Testing Standards](../policies/testing.md)

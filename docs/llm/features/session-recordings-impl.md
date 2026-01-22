# Session Recordings - Implementation Details

> WebSocket events, share links, authorization versioning, and architecture

## WebSocket Events

| Event               | Trigger               |
| ------------------- | --------------------- |
| `session_started`   | New session initiated |
| `session_updated`   | Session info updated  |
| `session_ended`     | Session terminated    |
| `sessions_snapshot` | Complete session list |

## Preset Privacy Rules

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

## Share Links

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
```

**Endpoints**:

```yaml
create: POST /admin/session-recordings/share/:sessionId { expiresIn: "24h" }
access: GET /admin/session-recordings/shared/:token
```

## Authorization Model Versioning

**Location**: `apps/web-admin/src/components/ModelDiff.tsx`

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

### Workflow

1. View version history
2. Click "View Diff" on any version
3. Review changes
4. Click "Rollback" to revert
5. Confirm action → Version becomes active

## Audit Service Enum Conversion

**Location**: `services/audit-service/src/session-recordings/services/session-recording.service.ts`

```typescript
convertDeviceTypeToNumber(deviceType: string): number
convertDeviceTypeToString(deviceType: number): string
convertActorTypeToNumber(actorType: string): number
convertActorTypeToString(actorType: number): string
convertStatusToNumber(status: string): number
```

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

## Security

```yaml
privacy_masking:
  defaults: block for highly sensitive data
  patterns: Centralized PII configuration

share_links:
  token: Cryptographically secure (32 bytes)
  expiration: Automatic via Redis TTL
  access: Token-based, no permanent public access

websocket:
  auth: Required
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

redis:
  - TTL-based automatic cleanup
  - Distributed cache
```

## Troubleshooting

| Issue                  | Solutions                                              |
| ---------------------- | ------------------------------------------------------ |
| WebSocket disconnected | Verify URL, check server, verify network allows WS     |
| Share link expired     | Verify Redis running, check TTL, verify prefix matches |
| Heatmap not rendering  | Verify points array, check coordinates (0-100%)        |

## Future Enhancements

- Video export (MP4 rendering via headless browser)
- PDF reports with screenshots and analysis
- Advanced heatmaps (rage click, attention)
- Real-time alerts for suspicious patterns

---

_Main: `session-recordings.md`_

# Session Recordings - Architecture

> Enum conversion, architecture, security, and troubleshooting

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

_Main: `session-recordings-impl.md`_

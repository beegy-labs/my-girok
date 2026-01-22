# Session Recordings - Architecture

This document covers the architecture, enum conversion, security considerations, and troubleshooting for session recordings.

## Overview

Session recordings capture user interactions for replay and analysis. This document details the technical implementation including enum handling, system architecture, security measures, and common troubleshooting scenarios.

## Audit Service Enum Conversion

The audit service handles conversion between string and numeric enum representations for storage efficiency.

### Location

`services/audit-service/src/session-recordings/services/session-recording.service.ts`

### Available Methods

| Method                        | Description                           |
| ----------------------------- | ------------------------------------- |
| `convertDeviceTypeToNumber()` | Converts device type string to number |
| `convertDeviceTypeToString()` | Converts device type number to string |
| `convertActorTypeToNumber()`  | Converts actor type string to number  |
| `convertActorTypeToString()`  | Converts actor type number to string  |
| `convertStatusToNumber()`     | Converts status string to number      |

## Architecture

### Frontend Stack

- React 19.2
- TypeScript 5.9
- Canvas API (for heatmap visualization)
- WebSocket (for real-time updates)
- Vite (build tool)

### Backend Stack

- NestJS 11
- Redis/Valkey (for share links and caching)
- gRPC (for inter-service communication)
- ClickHouse (for analytics storage)

### Data Flow

```
User Browser
    |
    v (WebSocket)
LiveSessionsPage → useRealTimeSessionsWebSocket
    |
    v (gRPC)
Auth-BFF → Audit Service → ClickHouse
    |
    v (Redis)
Share Links (TTL expiration)
```

## Security

### Privacy Masking

| Aspect   | Implementation                  |
| -------- | ------------------------------- |
| Defaults | Block for highly sensitive data |
| Patterns | Centralized PII configuration   |

### Share Links

| Aspect     | Implementation                          |
| ---------- | --------------------------------------- |
| Token      | Cryptographically secure (32 bytes)     |
| Expiration | Automatic via Redis TTL                 |
| Access     | Token-based, no permanent public access |

### WebSocket Security

| Aspect     | Implementation                     |
| ---------- | ---------------------------------- |
| Auth       | Required for all connections       |
| Rate Limit | Connection attempts are limited    |
| Reconnect  | Automatic with exponential backoff |

## Performance Optimizations

### Canvas Rendering

- Memoized generation to prevent unnecessary re-renders
- Point intensity normalization for consistent visualization
- Efficient radial gradients for heatmap rendering

### WebSocket

- Exponential backoff prevents thundering herd on reconnection
- Configurable limits for connection management

### Redis

- TTL-based automatic cleanup for share links
- Distributed cache for session data

## Troubleshooting

| Issue                  | Possible Solutions                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------ |
| WebSocket disconnected | 1. Verify WebSocket URL is correct<br>2. Check server is running<br>3. Verify network allows WebSocket connections |
| Share link expired     | 1. Verify Redis is running<br>2. Check TTL configuration<br>3. Verify prefix matches environment                   |
| Heatmap not rendering  | 1. Verify points array is populated<br>2. Check coordinates are in 0-100% range                                    |

## Future Enhancements

The following features are planned for future releases:

- **Video Export**: MP4 rendering via headless browser
- **PDF Reports**: Screenshots and analysis in PDF format
- **Advanced Heatmaps**: Rage click detection, attention mapping
- **Real-time Alerts**: Notifications for suspicious patterns

## Related Documentation

- **Implementation Details**: See `session-recordings-impl.md`
- **Main Overview**: See `session-recordings.md`

---

_This document is auto-generated from `docs/llm/features/session-recordings-impl-arch.md`_

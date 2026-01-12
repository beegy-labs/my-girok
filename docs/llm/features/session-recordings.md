# Session Recording Features

**Last Updated**: 2026-01-12

## Overview

Session recording features provide comprehensive monitoring, analysis, and management capabilities for user sessions across the my-girok platform. This document describes the newly implemented features in Tasks #4, #5, and #6.

## Features

### 1. Real-time Session Monitoring

**Location**: `apps/web-admin/src/pages/system/session-recordings/LiveSessionsPage.tsx`

**Purpose**: Monitor active user sessions in real-time with live statistics and filtering capabilities.

**Key Capabilities**:

- Real-time WebSocket connection to session events
- Live session statistics (total sessions, by service, by device type)
- Filtering by service (web-app, web-admin) and device type (desktop, mobile, tablet)
- Connection status indicator with reconnection support
- Session details including actor, location, device, browser, and activity

**WebSocket Configuration**:

```typescript
// Environment variable for WebSocket URL
VITE_WS_URL=ws://localhost:3000/admin/sessions/live

// Reconnection configuration (optional)
VITE_WS_RECONNECT_BASE_DELAY=1000      // Base delay: 1 second
VITE_WS_RECONNECT_MAX_DELAY=30000      // Max delay: 30 seconds
VITE_WS_RECONNECT_MAX_ATTEMPTS=10      // Max attempts: 10
```

**WebSocket Events**:

- `session_started`: New session initiated
- `session_updated`: Session information updated
- `session_ended`: Session terminated
- `sessions_snapshot`: Complete session list

**Reconnection Strategy**:

- Exponential backoff with jitter to prevent thundering herd
- Automatic reconnection with configurable retry limits
- Manual reconnection trigger available

---

### 2. Session Heatmaps and Analytics

**Location**: `apps/web-admin/src/components/SessionHeatmap.tsx`

**Purpose**: Visualize user interaction patterns through click tracking and scroll depth analysis.

#### 2.1 Click Heatmap

**Purpose**: Visualize click intensity across page elements.

**Features**:

- Canvas-based rendering with radial gradients
- Configurable dimensions and radius
- Intensity normalization
- Background image overlay support
- Statistics: total clicks, max clicks per point, average clicks

**Usage**:

```typescript
<ClickHeatmap
  points={[
    { x: 50, y: 50, intensity: 10 },  // x, y as percentage of viewport
    { x: 75, y: 25, intensity: 5 },
  ]}
  backgroundImage="/screenshot.png"
  width={1024}
  height={768}
/>
```

#### 2.2 Scroll Depth Heatmap

**Purpose**: Analyze how far users scroll through pages.

**Features**:

- 20-bucket visualization of scroll depth distribution
- Average scroll depth calculation
- Total sessions count
- Hover tooltips for detailed bucket information

**Usage**:

```typescript
<ScrollDepthHeatmap
  depths={[10, 25, 50, 75, 90, 100]}  // Scroll depths as percentages
  pageHeight={2000}
/>
```

---

### 3. Privacy Controls for Session Recordings

**Location**: `apps/web-admin/src/components/PrivacyControls.tsx`
**Config**: `apps/web-admin/src/config/privacy-rules.config.ts`

**Purpose**: Configure privacy masking rules to protect sensitive data in session recordings.

#### 3.1 Privacy Masking Types

| Type     | Description             | Use Case                       |
| -------- | ----------------------- | ------------------------------ |
| `block`  | Completely hide element | Passwords, credit cards, SSN   |
| `blur`   | Obscure element content | General PII                    |
| `redact` | Replace with asterisks  | Email addresses, phone numbers |

#### 3.2 Preset Rules

Centralized in `privacy-rules.config.ts`:

```typescript
PRIVACY_PRESET_RULES = [
  { label: 'Passwords', selector: 'input[type="password"]', maskType: 'block' },
  { label: 'Email Fields', selector: 'input[type="email"]', maskType: 'redact' },
  { label: 'Credit Card Fields', selector: 'input[data-card]', maskType: 'block' },
  { label: 'SSN Fields', selector: 'input[data-ssn]', maskType: 'block' },
  { label: 'Phone Numbers', selector: 'input[type="tel"]', maskType: 'redact' },
];
```

#### 3.3 PII Detection

Automatic pattern-based detection for:

- Email addresses: `/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g`
- Phone numbers: `/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g`
- Credit cards: `/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g`
- SSN: `/\b\d{3}-\d{2}-\d{4}\b/g`

---

### 4. Session Export and Sharing

**Location**:

- Frontend: `apps/web-admin/src/components/SessionExport.tsx`
- Backend: `services/auth-bff/src/admin/session-recordings/export.controller.ts`

**Purpose**: Export session recordings in various formats and generate shareable links.

#### 4.1 Export Formats

| Format      | Status         | Description                                    |
| ----------- | -------------- | ---------------------------------------------- |
| JSON        | ✅ Implemented | Complete session data with metadata and events |
| Video (MP4) | 🚧 Planned     | Rendered video replay of session               |
| PDF         | 🚧 Planned     | Summary report with screenshots and timeline   |

#### 4.2 JSON Export Options

- Include/exclude session metadata
- Include/exclude event data
- Configurable output file name

#### 4.3 Share Links

**Purpose**: Generate temporary shareable links for session recordings.

**Configuration**:

```bash
# Backend configuration (auth-bff)
SESSION_SHARE_LINK_PREFIX=session_share_link   # Redis key prefix
SESSION_SHARE_LINK_MAX_TTL=2592000000         # 30 days in milliseconds
```

**Expiration Options**:

- 1 hour
- 24 hours
- 7 days
- 30 days
- Never (up to max TTL)

**Storage**: Redis/Valkey with automatic TTL-based expiration

**API Endpoints**:

```typescript
POST /admin/session-recordings/share/:sessionId
{
  "expiresIn": "24h" | "7d" | "30d" | "never"
}

GET /admin/session-recordings/shared/:token
// Returns session data if token is valid and not expired
```

---

### 5. Authorization Model Versioning UI

**Location**: `apps/web-admin/src/pages/authorization/tabs/PoliciesTab.tsx`
**Component**: `apps/web-admin/src/components/ModelDiff.tsx`

**Purpose**: Compare and manage authorization model versions with rollback capability.

#### 5.1 ModelDiff Component

**Features**:

- Line-by-line diff visualization using `diff` library
- Color-coded additions (green) and deletions (red)
- Side-by-side comparison with labels
- Statistics showing total additions and deletions
- Theme-aware styling

**Usage**:

```typescript
<ModelDiff
  oldContent={previousVersion.content}
  newContent={currentVersion.content}
  oldLabel="v1.0 (2026-01-10)"
  newLabel="v2.0 - Active (2026-01-12)"
/>
```

#### 5.2 Version Management

**Capabilities**:

- View all model versions with timestamps and authors
- Compare any version against active version
- Rollback to previous versions
- Confirmation dialogs for critical actions
- Active version indicator

**Workflow**:

1. View version history
2. Click "View Diff" on any version
3. Review changes in diff viewer
4. Click "Rollback" if changes need to be reverted
5. Confirm rollback action
6. Selected version becomes active

---

### 6. Audit Service Refactoring (Task #5)

**Location**: `services/audit-service/src/session-recordings/services/session-recording.service.ts`

**Purpose**: Improve code organization by moving enum conversion logic from controller to service layer.

**Enum Conversion Methods**:

```typescript
// Device type conversions
convertDeviceTypeToNumber(deviceType: string): number
convertDeviceTypeToString(deviceType: number): string

// Actor type conversions
convertActorTypeToNumber(actorType: string): number
convertActorTypeToString(actorType: number): string

// Status conversions
convertStatusToNumber(status: string): number
```

**Benefits**:

- Better separation of concerns
- Improved testability
- Reusable conversion logic
- Cleaner controller code

---

## Architecture

### Frontend Stack

- React 19.2 with TypeScript 5.9
- Real-time updates via WebSocket
- Canvas API for heatmap rendering
- Vite for build tooling

### Backend Stack

- NestJS 11 with TypeScript
- Redis/Valkey for share link storage
- gRPC for internal service communication
- ConfigService for centralized configuration

### Data Flow

```
User Browser
    ↓ (WebSocket)
LiveSessionsPage ← useRealTimeSessionsWebSocket
    ↓ (gRPC)
Auth-BFF → Audit Service → ClickHouse
    ↓ (Redis)
Share Links (TTL-based expiration)
```

---

## Testing

### Frontend Tests

- Component tests with @testing-library/react
- Hook tests with renderHook
- WebSocket mock testing
- Canvas rendering validation
- User interaction testing

### Backend Tests

- Service unit tests with Vitest
- Controller integration tests
- Redis mock testing
- gRPC communication tests

### Test Coverage

- PrivacyControls: 15+ test cases
- SessionExport: 30+ test cases
- SessionHeatmap: 30+ test cases
- useRealTimeSessions: 20+ test cases
- SessionRecordingService: 110+ test cases
- ExportController: 15+ test cases

**Total**: 220+ test cases across all features

---

## Security Considerations

### Privacy Masking

- All preset rules use secure defaults (block for highly sensitive data)
- PII patterns configured centrally
- User can customize rules per service

### Share Links

- Cryptographically secure tokens (32 bytes)
- Automatic expiration via Redis TTL
- Token-based access control
- No permanent public access

### WebSocket Security

- Authentication required
- Connection from admin panel only
- Rate limiting on connection attempts
- Automatic reconnection with backoff

---

## Performance Optimizations

### Canvas Rendering

- Memoized canvas generation
- Point intensity normalization
- Efficient radial gradient rendering

### WebSocket

- Exponential backoff prevents thundering herd
- Configurable reconnection limits
- Connection state management

### Redis Caching

- TTL-based automatic cleanup
- No manual garbage collection required
- Distributed cache for multi-instance deployments

---

## Configuration Reference

### Environment Variables

#### Frontend (web-admin)

```bash
# WebSocket connection
VITE_WS_URL=ws://localhost:3000/admin/sessions/live

# Reconnection configuration
VITE_WS_RECONNECT_BASE_DELAY=1000      # 1 second
VITE_WS_RECONNECT_MAX_DELAY=30000      # 30 seconds
VITE_WS_RECONNECT_MAX_ATTEMPTS=10
```

#### Backend (auth-bff)

```bash
# Share link configuration
SESSION_SHARE_LINK_PREFIX=session_share_link
SESSION_SHARE_LINK_MAX_TTL=2592000000  # 30 days in ms

# Auth BFF URL for share link generation
AUTH_BFF_URL=https://auth.girok.dev
```

---

## Future Enhancements

### Planned Features

1. **Video Export**: Render session replay as MP4 video using headless browser
2. **PDF Reports**: Generate comprehensive PDF reports with screenshots and analysis
3. **Advanced Heatmap Types**: Rage click detection, attention heatmaps
4. **Real-time Alerts**: Notify admins of suspicious session patterns
5. **Session Replay Player**: Interactive playback with timeline controls

### Performance Improvements

1. WebSocket message compression
2. Heatmap data aggregation on server
3. Progressive loading for large sessions
4. Canvas offloading to Web Workers

---

## Troubleshooting

### WebSocket Connection Issues

**Symptom**: "Disconnected" status with connection error

**Solutions**:

1. Verify `VITE_WS_URL` is correctly configured
2. Check WebSocket server is running
3. Verify network allows WebSocket connections
4. Check browser console for detailed errors
5. Try manual reconnection

### Share Link Not Working

**Symptom**: "Share link not found or expired"

**Solutions**:

1. Verify Redis/Valkey is running and accessible
2. Check link hasn't exceeded expiration time
3. Verify `SESSION_SHARE_LINK_PREFIX` matches on both ends
4. Check Redis DB configuration

### Heatmap Not Rendering

**Symptom**: "No data" message or blank canvas

**Solutions**:

1. Verify points array is not empty
2. Check point coordinates are valid percentages (0-100)
3. Verify canvas context is available (not SSR)
4. Check browser supports canvas API

---

## Related Documentation

- [Privacy Rules Configuration](../packages/privacy-rules.md)
- [WebSocket Architecture](../architecture/websocket.md)
- [Redis/Valkey Caching](../policies/caching.md)
- [Testing Standards](../policies/testing.md)

---

## Contributors

Implementation by Claude Sonnet 4.5 for Tasks #4, #5, #6 (PR #542)

**Review Status**: Approved pending documentation

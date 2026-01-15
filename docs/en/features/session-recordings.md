# Session Recording Features

> Comprehensive monitoring, analytics, and privacy controls for user session management

## Overview

Session recording features provide administrators with powerful tools to monitor, analyze, and manage user sessions across the my-girok platform. This document covers the complete feature set including real-time monitoring, heatmap analytics, privacy controls, and session export capabilities.

## Real-time Session Monitoring

Real-time monitoring allows administrators to observe active user sessions as they happen, providing immediate visibility into platform usage.

**Location**: `apps/web-admin/src/pages/system/session-recordings/LiveSessionsPage.tsx`

### Capabilities

- Live WebSocket connection to session events with automatic reconnection
- Real-time statistics showing total sessions, breakdowns by service, and device type distribution
- Filtering by service (web-app, web-admin) and device type (desktop, mobile, tablet)
- Connection status indicator with manual reconnection option
- Detailed session information including actor identity, geographic location, device specs, browser, and activity status

### WebSocket Configuration

Configure the WebSocket connection through environment variables:

```bash
# WebSocket endpoint
VITE_WS_URL=ws://localhost:3000/admin/sessions/live

# Reconnection behavior
VITE_WS_RECONNECT_BASE_DELAY=1000      # Initial retry delay (1 second)
VITE_WS_RECONNECT_MAX_DELAY=30000      # Maximum delay between retries (30 seconds)
VITE_WS_RECONNECT_MAX_ATTEMPTS=10      # Stop retrying after this many failures
```

### Event Types

The WebSocket connection handles four event types:

| Event               | Description                          |
| ------------------- | ------------------------------------ |
| `session_started`   | New session initiated by a user      |
| `session_updated`   | Existing session information changed |
| `session_ended`     | User session terminated              |
| `sessions_snapshot` | Complete list of all active sessions |

### Reconnection Strategy

The system uses exponential backoff with jitter to handle disconnections gracefully. This approach prevents the "thundering herd" problem where many clients reconnect simultaneously after an outage. Administrators can also trigger manual reconnection when needed.

## Session Heatmaps and Analytics

Heatmap visualization helps understand user interaction patterns through click tracking and scroll depth analysis.

**Location**: `apps/web-admin/src/components/SessionHeatmap.tsx`

### Click Heatmap

The click heatmap visualizes where users click most frequently on a page, using color intensity to indicate click concentration.

Features:

- Canvas-based rendering with smooth radial gradients
- Configurable dimensions and click radius
- Automatic intensity normalization across varying data ranges
- Optional background image overlay for context
- Statistics showing total clicks, maximum clicks per point, and average clicks

```typescript
<ClickHeatmap
  points={[
    { x: 50, y: 50, intensity: 10 },  // Coordinates as viewport percentages
    { x: 75, y: 25, intensity: 5 },
  ]}
  backgroundImage="/screenshot.png"
  width={1024}
  height={768}
/>
```

### Scroll Depth Heatmap

The scroll depth heatmap reveals how far users typically scroll through pages, helping identify content that may not be seen.

Features:

- 20-bucket visualization showing scroll depth distribution
- Average scroll depth calculation across all sessions
- Total session count for context
- Interactive tooltips with detailed bucket information

```typescript
<ScrollDepthHeatmap
  depths={[10, 25, 50, 75, 90, 100]}  // Depths as percentages
  pageHeight={2000}
/>
```

## Privacy Controls

Privacy controls allow administrators to configure masking rules that protect sensitive information in session recordings.

**Location**: `apps/web-admin/src/components/PrivacyControls.tsx`
**Config**: `apps/web-admin/src/config/privacy-rules.config.ts`

### Masking Types

Three masking types are available, each suited for different sensitivity levels:

| Type     | Visual Effect           | Recommended For                      |
| -------- | ----------------------- | ------------------------------------ |
| `block`  | Completely hidden       | Passwords, credit card numbers, SSN  |
| `blur`   | Content obscured        | General personally identifiable info |
| `redact` | Replaced with asterisks | Email addresses, phone numbers       |

### Preset Rules

The system includes preset rules for common sensitive fields:

```typescript
PRIVACY_PRESET_RULES = [
  { label: 'Passwords', selector: 'input[type="password"]', maskType: 'block' },
  { label: 'Email Fields', selector: 'input[type="email"]', maskType: 'redact' },
  { label: 'Credit Card Fields', selector: 'input[data-card]', maskType: 'block' },
  { label: 'SSN Fields', selector: 'input[data-ssn]', maskType: 'block' },
  { label: 'Phone Numbers', selector: 'input[type="tel"]', maskType: 'redact' },
];
```

### Automatic PII Detection

The system can automatically detect common PII patterns in recorded content:

- Email addresses
- Phone numbers (US format)
- Credit card numbers (16 digits)
- Social Security Numbers

## Session Export and Sharing

Export functionality allows administrators to download session recordings or generate shareable links for collaboration.

**Frontend**: `apps/web-admin/src/components/SessionExport.tsx`
**Backend**: `services/auth-bff/src/admin/session-recordings/export.controller.ts`

### Export Formats

| Format | Status    | Contents                                       |
| ------ | --------- | ---------------------------------------------- |
| JSON   | Available | Complete session data with metadata and events |
| MP4    | Planned   | Rendered video replay of the session           |
| PDF    | Planned   | Summary report with screenshots and timeline   |

JSON export options include toggles for metadata and event data, with configurable output filenames.

### Shareable Links

Generate temporary links to share session recordings with team members or external parties.

**Configuration**:

```bash
SESSION_SHARE_LINK_PREFIX=session_share_link   # Redis key prefix
SESSION_SHARE_LINK_MAX_TTL=2592000000          # Maximum expiration: 30 days
```

**Expiration Options**: 1 hour, 24 hours, 7 days, 30 days, or no expiration (up to maximum TTL)

**API Endpoints**:

```typescript
// Create a share link
POST /admin/session-recordings/share/:sessionId
{ "expiresIn": "24h" | "7d" | "30d" | "never" }

// Access a shared session
GET /admin/session-recordings/shared/:token
```

Links are stored in Redis/Valkey with automatic TTL-based expiration, ensuring no permanent public access exists without explicit configuration.

## Authorization Model Versioning

Compare and manage authorization model versions with visual diff and rollback capability.

**Location**: `apps/web-admin/src/pages/authorization/tabs/PoliciesTab.tsx`
**Component**: `apps/web-admin/src/components/ModelDiff.tsx`

### ModelDiff Component

The diff viewer provides clear visualization of changes between model versions:

- Line-by-line comparison using the `diff` library
- Color-coded additions (green) and deletions (red)
- Side-by-side layout with customizable labels
- Statistics showing total additions and deletions
- Theme-aware styling for light and dark modes

```typescript
<ModelDiff
  oldContent={previousVersion.content}
  newContent={currentVersion.content}
  oldLabel="v1.0 (2026-01-10)"
  newLabel="v2.0 - Active (2026-01-12)"
/>
```

### Version Management Workflow

1. View the complete version history with timestamps and authors
2. Select any version and click "View Diff" to compare against the active version
3. Review changes in the diff viewer
4. Click "Rollback" if reverting is necessary
5. Confirm the rollback action in the confirmation dialog
6. The selected version becomes the new active model

## Architecture

### Frontend Stack

- React 19.2 with TypeScript 5.9
- Real-time updates via WebSocket connections
- Canvas API for heatmap rendering
- Vite for build tooling

### Backend Stack

- NestJS 11 with TypeScript
- Redis/Valkey for share link storage with TTL
- gRPC for internal service communication
- ConfigService for centralized configuration

### Data Flow

```
User Browser
    | (WebSocket)
    v
LiveSessionsPage <- useRealTimeSessionsWebSocket
    | (gRPC)
    v
Auth-BFF -> Audit Service -> ClickHouse
    | (Redis)
    v
Share Links (TTL-based expiration)
```

## Testing Coverage

All features include comprehensive test coverage:

| Component               | Test Cases |
| ----------------------- | ---------- |
| PrivacyControls         | 15+        |
| SessionExport           | 30+        |
| SessionHeatmap          | 30+        |
| useRealTimeSessions     | 20+        |
| SessionRecordingService | 110+       |
| ExportController        | 15+        |
| **Total**               | **220+**   |

## Security Considerations

### Privacy Masking

- Preset rules default to `block` for highly sensitive data
- PII patterns are configured centrally for consistency
- Custom rules can be defined per service

### Share Links

- Tokens are cryptographically secure (32 bytes)
- Automatic expiration via Redis TTL
- Token-based access control with no permanent public URLs

### WebSocket Security

- Authentication required for all connections
- Access restricted to admin panel only
- Rate limiting on connection attempts
- Exponential backoff prevents connection flooding

## Troubleshooting

### WebSocket Connection Issues

If the status shows "Disconnected" with a connection error:

1. Verify `VITE_WS_URL` environment variable is correctly set
2. Confirm the WebSocket server is running
3. Check that network policies allow WebSocket connections
4. Review browser console for detailed error messages
5. Try the manual reconnection button

### Share Link Not Working

If you see "Share link not found or expired":

1. Verify Redis/Valkey is running and accessible
2. Confirm the link has not exceeded its expiration time
3. Check that `SESSION_SHARE_LINK_PREFIX` matches on frontend and backend
4. Verify the correct Redis database is configured

### Heatmap Not Rendering

If you see "No data" or a blank canvas:

1. Verify the points array contains data
2. Check that coordinates are valid percentages (0-100)
3. Ensure you are not in a server-side rendering context
4. Confirm the browser supports the Canvas API

## Future Enhancements

### Planned Features

- Video export rendering sessions as MP4 files
- PDF reports with screenshots and analysis
- Advanced heatmap types including rage click detection
- Real-time alerts for suspicious session patterns
- Interactive session replay player with timeline controls

### Performance Improvements

- WebSocket message compression
- Server-side heatmap data aggregation
- Progressive loading for large sessions
- Canvas offloading to Web Workers

---

**LLM Reference**: `docs/llm/features/session-recordings.md`

# SSOT: Session Replay

> **Last Updated**: 2026-01-12

This document defines the technical specifications for the session replay feature, which is based on the `rrweb` library.

## 1. Feature Overview

The session replay feature allows administrators to watch pixel-perfect recordings of user sessions for debugging and user behavior analysis.

- **Recording Mechanism**: The `@my-girok/tracking-sdk` package captures DOM events using `rrweb`.
- **Playback**: The `@my-girok/tracking-sdk/react` package provides a `SessionPlayer` component to replay recorded events.
- **Storage**: Event data is stored in the `analytics_db` ClickHouse database.

## 2. Technical Stack

- **Client-side Recording**: `rrweb` via `@my-girok/tracking-sdk`
- **Client-side Playback**: `rrweb-player` via `@my-girok/tracking-sdk/react`
- **Data Ingestion**: `auth-bff` -> `audit-service` (gRPC) -> ClickHouse
- **Database**: ClickHouse (`analytics_db`)

## 3. Data Storage

Session data is stored in two main tables within ClickHouse. For detailed schema, partitioning, and TTL policies, refer to the [ClickHouse Infrastructure documentation](../infrastructure/clickhouse.md).

- `analytics_db.session_recordings`: Stores compressed batches of `rrweb` events.
- `analytics_db.session_recording_metadata`: Stores aggregated metadata for each session, such as duration, page views, and user information.

## 4. Privacy Controls

To protect user privacy, the following controls are enabled by default in the tracking SDK:

- **Input Masking**: All text within input fields is masked (replaced with `***`).
- **Block Selectors**: Elements with the `.rr-block` class are excluded from recordings entirely.
- **IP Anonymization**: The last octet of user IP addresses is zeroed out on the server-side before storage.

## 5. SDK Public API

The core logic is encapsulated in the `@my-girok/tracking-sdk`. Key functionalities include:

- `getTracker()`: Returns a singleton instance of the `Tracker`.
- `tracker.init(config)`: Initializes the tracker with configuration.
- `tracker.startRecording()`: Begins a recording session.
- `tracker.stopRecording()`: Stops the session and flushes remaining events.
- `tracker.trackEvent(event)`: Tracks custom user-defined events.
- `tracker.trackPageView()`: Tracks a page view event.

## 6. React Component

The `@my-girok/tracking-sdk/react` package provides a React component for playback:

```tsx
import { SessionPlayer } from '@my-girok/tracking-sdk/react';

<SessionPlayer events={events} width={1024} height={576} autoPlay={false} showController={true} />;
```

## 7. Admin UI

Session recordings can be viewed and managed through the web-admin interface:

- **Session Recordings Page**: `/system/session-recordings` - Lists all recorded sessions with filtering options
- **Session Detail Page**: `/system/session-recordings/:sessionId` - Detailed view with player and event timeline

Key features:

- Session playback with timeline scrubbing
- Event timeline with click-to-seek
- Metadata display (device, location, user, timing)
- Session filtering by device type and date range

## 8. Related Services

- **audit-service**: Stores session recordings in ClickHouse
- **auth-bff**: Provides REST API for querying session recordings
- **tracking-sdk**: Client-side recording and playback library

## 9. Future Enhancements

- Real-time session monitoring
- Advanced privacy controls (custom masking rules)
- Session analytics and heatmaps
- Session search by user actions
- Export session recordings

For implementation details on privacy controls, see [Privacy Controls section](../policies/privacy.md).

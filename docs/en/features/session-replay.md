# Session Replay

> Pixel-perfect session recordings using rrweb for debugging and user behavior analysis

## Overview

The session replay feature enables administrators to watch recordings of user sessions, providing valuable insights for debugging issues and understanding user behavior patterns. The system uses the industry-standard `rrweb` library to capture and replay DOM events.

## How It Works

Session replay operates through three main components:

1. **Recording**: The `@my-girok/tracking-sdk` package captures DOM events on the client side using rrweb. This includes user interactions, page navigations, and visual changes.

2. **Storage**: Captured event data flows through the auth-bff gateway to the audit-service, which stores everything in the ClickHouse analytics database.

3. **Playback**: The `@my-girok/tracking-sdk/react` package provides a `SessionPlayer` component that reconstructs and replays the recorded events.

## Technical Architecture

| Component          | Technology                       | Purpose                  |
| ------------------ | -------------------------------- | ------------------------ |
| Client Recording   | rrweb via @my-girok/tracking-sdk | Capture DOM events       |
| Client Playback    | rrweb-player via tracking-sdk    | Replay recorded sessions |
| API Gateway        | auth-bff (REST)                  | Query session recordings |
| Internal Transport | audit-service (gRPC)             | Process and store events |
| Database           | ClickHouse (analytics_db)        | Persist session data     |

## Data Storage

Session data is stored in two ClickHouse tables:

- **session_recordings**: Contains compressed batches of rrweb events, representing the actual recording data
- **session_recording_metadata**: Stores aggregated information about each session including duration, page views, and user details

For detailed schema information, partitioning strategies, and TTL policies, refer to the [ClickHouse Infrastructure documentation](../infrastructure/clickhouse.md).

## Privacy Controls

To ensure user privacy is protected, the tracking SDK enables several safeguards by default:

- **Input Masking**: All text entered into input fields is automatically replaced with asterisks (`***`), preventing sensitive data from being recorded
- **Block Selectors**: Any element with the `.rr-block` CSS class is completely excluded from recordings, allowing developers to mark sensitive UI sections
- **IP Anonymization**: The server zeros out the last octet of user IP addresses before storing them, providing anonymization while preserving geographic information

For detailed privacy configuration options, see the [Privacy Controls documentation](../policies/privacy.md).

## Using the SDK

The tracking SDK provides a simple API for controlling session recordings:

```typescript
import { getTracker } from '@my-girok/tracking-sdk';

// Get the singleton tracker instance
const tracker = getTracker();

// Initialize with configuration
tracker.init(config);

// Control recording
tracker.startRecording(); // Begin capturing
tracker.stopRecording(); // End and flush events

// Track additional events
tracker.trackPageView(); // Record page navigation
tracker.trackEvent(customEvent); // Record custom events
```

## React Playback Component

For displaying recorded sessions, use the SessionPlayer component:

```tsx
import { SessionPlayer } from '@my-girok/tracking-sdk/react';

<SessionPlayer events={events} width={1024} height={576} autoPlay={false} showController={true} />;
```

The component provides a video-like interface with timeline scrubbing, play/pause controls, and playback speed adjustment.

## Admin Interface

Session recordings are managed through the web-admin application:

| Page                                    | Purpose                                          |
| --------------------------------------- | ------------------------------------------------ |
| `/system/session-recordings`            | Browse and filter all recorded sessions          |
| `/system/session-recordings/:sessionId` | View individual session with player and timeline |

The admin interface provides:

- Session playback with timeline scrubbing for precise navigation
- Event timeline showing clicks, scrolls, and other interactions
- Metadata display including device type, location, user identity, and timing
- Filtering options by device type and date range

## Related Services

| Service       | Role                                       |
| ------------- | ------------------------------------------ |
| audit-service | Primary storage in ClickHouse              |
| auth-bff      | REST API for querying session data         |
| tracking-sdk  | Client-side recording and playback library |

## Future Enhancements

The following features are planned for future releases:

- Real-time session monitoring for live support scenarios
- Advanced privacy controls with custom masking rules
- Session analytics and heatmap visualizations
- Search functionality based on user actions
- Export capabilities for session recordings

---

**LLM Reference**: `docs/llm/features/session-replay.md`

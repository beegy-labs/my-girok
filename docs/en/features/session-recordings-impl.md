# Session Recordings - Implementation Details

This document provides implementation details for session recordings, including WebSocket events, share links, and authorization model versioning.

## WebSocket Events

The session recordings feature uses WebSocket for real-time updates. The following events are available:

| Event               | Trigger               | Description                               |
| ------------------- | --------------------- | ----------------------------------------- |
| `session_started`   | New session initiated | Fired when a new recording session begins |
| `session_updated`   | Session info updated  | Fired when session metadata changes       |
| `session_ended`     | Session terminated    | Fired when recording session completes    |
| `sessions_snapshot` | Complete session list | Provides the full list of active sessions |

## Privacy Masking

### Preset Privacy Rules

Session recordings include built-in privacy masking to protect sensitive user data:

```yaml
passwords: { selector: 'input[type="password"]', maskType: block }
emails: { selector: 'input[type="email"]', maskType: redact }
credit_cards: { selector: 'input[data-card]', maskType: block }
ssn: { selector: 'input[data-ssn]', maskType: block }
phone: { selector: 'input[type="tel"]', maskType: redact }
```

### PII Detection Patterns

The system automatically detects and masks personally identifiable information (PII) using the following regex patterns:

| Type        | Pattern                                                   | Description               |
| ----------- | --------------------------------------------------------- | ------------------------- |
| Email       | `/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z\|a-z]{2,}\b/g` | Standard email format     |
| Phone       | `/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g`                        | US phone number format    |
| Credit Card | `/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g`           | 16-digit card numbers     |
| SSN         | `/\b\d{3}-\d{2}-\d{4}\b/g`                                | US Social Security Number |

## Share Links

Session recordings can be shared via time-limited share links.

### Configuration

Share links are configured in the auth-bff service:

| Setting      | Environment Variable         | Default Value          |
| ------------ | ---------------------------- | ---------------------- |
| Redis Prefix | `SESSION_SHARE_LINK_PREFIX`  | `session_share_link`   |
| Maximum TTL  | `SESSION_SHARE_LINK_MAX_TTL` | 2592000000ms (30 days) |

Available expiration options: `1h`, `24h`, `7d`, `30d`, `never` (up to max TTL)

### Endpoints

| Operation | Endpoint                                          | Request Body           |
| --------- | ------------------------------------------------- | ---------------------- |
| Create    | `POST /admin/session-recordings/share/:sessionId` | `{ expiresIn: "24h" }` |
| Access    | `GET /admin/session-recordings/shared/:token`     | -                      |

## Authorization Model Versioning

The authorization model supports version history and diff comparison.

### Component Location

The diff viewer component is located at: `apps/web-admin/src/components/ModelDiff.tsx`

### Usage Example

```typescript
<ModelDiff
  oldContent={v1.content}
  newContent={v2.content}
  oldLabel="v1.0 (2026-01-10)"
  newLabel="v2.0 - Active (2026-01-12)"
/>
```

### Features

- Line-by-line diff comparison using the `diff` library
- Color-coded changes: green for additions, red for deletions
- Statistics showing number of additions and deletions

### Workflow

1. View version history in the authorization model settings
2. Click "View Diff" on any version to compare with the current version
3. Review the changes in the diff viewer
4. Click "Rollback" to revert to a previous version
5. Confirm the action - the selected version becomes the active version

## Related Documentation

- **Architecture and Troubleshooting**: See `session-recordings-impl-arch.md`
- **Main Overview**: See `session-recordings.md`

---

_This document is auto-generated from `docs/llm/features/session-recordings-impl.md`_

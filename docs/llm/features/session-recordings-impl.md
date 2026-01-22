# Session Recordings - Implementation Details

> WebSocket events, share links, and authorization versioning

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

expiration_options: [1h, 24h, 7d, 30d, never (up to max TTL)]
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

**Features**: Line-by-line diff using `diff` library, color-coded (green additions, red deletions), statistics

### Workflow

1. View version history
2. Click "View Diff" on any version
3. Review changes
4. Click "Rollback" to revert
5. Confirm action → Version becomes active

## Related Documentation

- **Architecture & Troubleshooting**: `session-recordings-impl-arch.md`
- Main: `session-recordings.md`

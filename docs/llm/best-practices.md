# 2026 Best Practices

Monthly review checklist

## Database

| Do                   | Don't            |
| -------------------- | ---------------- |
| goose for migrations | `prisma migrate` |
| TEXT for IDs         | UUID type        |
| TIMESTAMPTZ(6)       | TIMESTAMP        |

## React 19+

| Do                   | Don't               |
| -------------------- | ------------------- |
| React Compiler       | Manual memo/useMemo |
| `use()` for async    | useEffect fetch     |
| Design tokens (SSOT) | Inline styles       |

## Backend

| Do                 | Don't               |
| ------------------ | ------------------- |
| `@Transactional()` | Manual transactions |
| gRPC internal      | REST everywhere     |
| class-validator    | Manual validation   |

## Testing

| Do            | Don't          |
| ------------- | -------------- |
| 80% coverage  | Skip tests     |
| Test fixtures | Hardcoded data |

## Git

| Do                      | Don't             |
| ----------------------- | ----------------- |
| Squash: feat -> develop | Merge on features |
| Merge: develop -> main  | Squash on release |

## Anti-Patterns

```
- Over-engineering
- Abstractions for one-time ops
- Features beyond requirements
```

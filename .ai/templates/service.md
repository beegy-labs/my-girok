# {Service} Service

> One-line description

## Service Info

| Property | Value                          |
| -------- | ------------------------------ |
| REST     | :{port}                        |
| gRPC     | :{port} or N/A                 |
| Database | {db_name} ({type})             |
| Cache    | Valkey DB {n}                  |
| Events   | `{prefix}.*` (Redpanda) or N/A |
| Codebase | `services/{name}/`             |

## Domain Boundaries

| This Service | NOT This Service |
| ------------ | ---------------- |
| ...          | ... (service)    |

## REST API

```
METHOD  /endpoint
```

## gRPC Server (:{port})

> If no gRPC, replace with: `N/A - REST only`

| Method | Description |
| ------ | ----------- |

**Proto**: `packages/proto/{service}/v1/{service}.proto`

## Database Tables

| Table | Purpose |
| ----- | ------- |

## Events

> If no events, replace with: `N/A`

```typescript
'EVENT_TYPE_1' | 'EVENT_TYPE_2';
```

## Caching

| Key Pattern | TTL |
| ----------- | --- |

## Environment

```bash
PORT=
DATABASE_URL=
```

---

**Full docs**: `docs/services/{SERVICE}_SERVICE.md`

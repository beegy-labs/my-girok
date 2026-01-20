# OTLP ClickHouse Parsing Issue - Analysis & Solution

**Date**: 2026-01-20
**Status**: Solution created, pending application
**Impact**: Kafka consumer connected but materialized views not inserting data

---

## Problem Summary

ClickHouse Kafka consumer successfully connects to Redpanda (kafka.girok.dev:9094) and reads messages (2917 messages), but the materialized views are not populating the target tables (`otel_audit_logs`, `otel_audit_traces`, `otel_audit_metrics`).

## Root Cause Analysis

### Issue 1: Attribute Extraction Method Mismatch

**Migration 007 approach:**

```sql
-- Assumes attributes are accessed by position
JSONExtractString(raw, 'resourceLogs', 1, 'resource', 'attributes', 1, 'value', 'stringValue') as service_name,
JSONExtractString(raw, 'resourceLogs', 1, 'resource', 'attributes', 2, 'value', 'stringValue') as tenant_id,
JSONExtractString(raw, 'resourceLogs', 1, 'resource', 'attributes', 3, 'value', 'stringValue') as environment
```

**Actual OTLP JSON structure:**

```json
{
  "resourceLogs": [{
    "resource": {
      "attributes": [
        {"key": "k8s.namespace.name", "value": {"stringValue": "storage"}},
        {"key": "k8s.pod.name", "value": {"stringValue": "platform-redpanda-0"}},
        {"key": "environment", "value": {"stringValue": "production"}},
        ...
      ]
    }
  }]
}
```

**Problem**: Attributes are an array of key-value objects, not positional values. The migration tries to extract `attributes[1]` expecting it to be `service.name`, but it's actually `k8s.namespace.name`.

### Issue 2: Missing Expected Attributes

OTEL Collector sends K8s metadata attributes:

- `k8s.namespace.name`
- `k8s.pod.name`
- `k8s.container.name`
- `k8s.node.name`
- `environment` ✓

**Missing attributes** that migration 007 expects:

- `service.name` - not present
- `tenant.id` - not present

## Solution: Migration 008

Created `/home/beegy/workspace/labs/my-girok/infrastructure/clickhouse/migrations/008_fix_otlp_attributes.sql`

### Key Changes

1. **Parse attributes into key-value tuples:**

```sql
WITH parsed_attributes AS (
    SELECT
        raw,
        arrayMap(
            x -> (JSONExtractString(x, 'key'), JSONExtractString(x, 'value', 'stringValue')),
            JSONExtractArrayRaw(JSONExtractRaw(raw, 'resourceLogs', 1, 'resource', 'attributes'))
        ) AS resource_attrs
    FROM audit_db.audit_logs_queue
    WHERE length(raw) > 0
)
```

2. **Extract attributes by key using arrayFirst:**

```sql
-- Service name with fallback to k8s.pod.name
coalesce(
    arrayFirst(x -> x.1 = 'service.name', resource_attrs).2,
    arrayFirst(x -> x.1 = 'k8s.pod.name', resource_attrs).2,
    'unknown-service'
) as service_name,

-- Tenant ID with fallback
coalesce(
    arrayFirst(x -> x.1 = 'tenant.id', resource_attrs).2,
    'system'
) as tenant_id,

-- Environment (now properly extracted by key)
coalesce(
    arrayFirst(x -> x.1 = 'environment', resource_attrs).2,
    'development'
) as environment,

-- K8s context
arrayFirst(x -> x.1 = 'k8s.namespace.name', resource_attrs).2 as k8s_namespace,
arrayFirst(x -> x.1 = 'k8s.pod.name', resource_attrs).2 as k8s_pod_name,
arrayFirst(x -> x.1 = 'k8s.container.name', resource_attrs).2 as k8s_container_name
```

3. **Fallback strategy:**
   - `service.name`: Try `service.name` → fallback to `k8s.pod.name` → fallback to `'unknown-service'`
   - `tenant.id`: Try `tenant.id` → fallback to `'system'`
   - `environment`: Try `environment` → fallback to `'development'`

## Current Status

✅ **Completed:**

1. Redpanda configured with standard architecture (internal: 9093, external: 9094)
2. Cilium LoadBalancer IP allocated correctly (192.168.1.253)
3. ClickHouse Kafka consumer connected with SASL authentication
4. Root cause identified for parsing failure
5. Migration 008 created with proper attribute extraction

⏳ **Pending:**

1. ClickHouse server network access (192.168.1.50 currently unreachable)
2. Apply migration 008
3. Verify data flow: Kafka → ClickHouse → Tables

## Next Steps

### When ClickHouse access is restored:

1. **Copy migration to server:**

```bash
scp infrastructure/clickhouse/migrations/008_fix_otlp_attributes.sql beegy@192.168.1.50:/tmp/
```

2. **Apply migration:**

```bash
ssh beegy@192.168.1.50
cd /path/to/clickhouse/migrations
goose -dir . clickhouse "tcp://127.0.0.1:9000?database=audit_db" up
```

3. **Verify data flow:**

```sql
-- Check if data is now being inserted
SELECT count(*) as total_logs,
       min(timestamp) as first_log,
       max(timestamp) as last_log,
       service_name,
       environment
FROM otel_audit_logs
GROUP BY service_name, environment;

-- Check Kafka consumer stats
SELECT
    database,
    table,
    consumer_group,
    num_messages_read,
    last_exception
FROM system.kafka_consumers
WHERE database = 'audit_db';
```

4. **Verify all three signal types:**

```sql
-- Logs
SELECT count(*) FROM otel_audit_logs;

-- Traces
SELECT count(*) FROM otel_audit_traces;

-- Metrics
SELECT count(*) FROM otel_audit_metrics;
```

## Network Troubleshooting

**Current issue**: 192.168.1.50 unreachable from:

- Local workstation (192.168.1.10)
- Kubernetes cluster pods

**Diagnostics performed:**

```bash
# From local workstation
ping 192.168.1.50
# Result: 100% packet loss

# From cluster pod
kubectl run test-network --rm -i --image=alpine -- ping 192.168.1.50
# Result: Host is unreachable
```

**Possible causes:**

1. ClickHouse server is down
2. Firewall blocking traffic
3. Network configuration changed
4. IP address changed

**Resolution needed:**

- Verify ClickHouse server status at physical location
- Check firewall rules on 192.168.1.50
- Verify IP address hasn't changed

## References

- **ClickHouse OTLP Parsing**: [Altinity JSONExtract Guide](https://kb.altinity.com/altinity-kb-queries-and-syntax/jsonextract-to-parse-many-attributes-at-a-time/)
- **JSON Functions**: [ClickHouse Docs](https://clickhouse.com/docs/sql-reference/functions/json-functions)
- **Migration Files**:
  - `/infrastructure/clickhouse/migrations/007_otlp_json_parsing.sql` (old, positional indexing)
  - `/infrastructure/clickhouse/migrations/008_fix_otlp_attributes.sql` (new, key-based extraction)

## Expected Outcome

After applying migration 008, the materialized views should:

1. Successfully parse OTLP JSON messages from Kafka
2. Extract attributes by key name (not position)
3. Insert data into `otel_audit_logs`, `otel_audit_traces`, `otel_audit_metrics` tables
4. Properly handle missing attributes with fallback values
5. Map K8s metadata to appropriate columns

The data pipeline should then be: **OTEL Collector → Redpanda (kafka.girok.dev:9094) → ClickHouse Kafka Engine → Materialized Views → Target Tables** ✅

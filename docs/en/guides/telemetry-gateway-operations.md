# Telemetry Gateway Operations

> Features, monitoring, troubleshooting, and security

## Features

### 1. Authentication

- **JWT Mode**: For frontend clients, extracts tenantId from token payload
- **API Key Mode**: For backend services, requires x-api-key + x-tenant-id headers

### 2. PII Redaction

Automatically redacts sensitive data:

- Email addresses
- Social Security Numbers (SSN)
- Phone numbers
- IPv4 addresses
- Credit card numbers

### 3. Tenant Enrichment

Adds metadata to all telemetry:

- `tenant.id`: Tenant identifier
- `user.id`: User identifier (if available)
- `telemetry.source`: Authentication source (jwt or api-key)

### 4. Cost Tracking

Tracks telemetry usage per tenant:

- Request counts per signal type
- Data size in bytes
- Accessible via service methods

### 5. Rate Limiting

Per-tenant, per-signal-type rate limits:

- Traces: 1000 req/min
- Metrics: 2000 req/min
- Logs: 5000 req/min

## OTEL Collector Configuration

```yaml
exporters:
  kafka:
    brokers:
      - redpanda.redpanda.svc.cluster.local:9093
    protocol_version: 2.8.0
    topic: otel-telemetry
    encoding: otlp_proto
    auth:
      sasl:
        username: ${env:REDPANDA_USERNAME}
        password: ${env:REDPANDA_PASSWORD}
        mechanism: SCRAM-SHA-256

service:
  pipelines:
    traces:
      exporters: [clickhouse, kafka, debug]
    metrics:
      exporters: [prometheus, clickhouse, kafka, debug]
    logs:
      exporters: [clickhouse, kafka, debug]
```

## Monitoring

### Health Checks

```bash
curl http://$AUDIT_SERVICE:3004/health
curl http://platform-monitoring-opentelemetry-opentelemetry-collector.monitoring:13133
```

### Logs

```bash
kubectl logs -n dev-my-girok -l app=audit-service --tail=100
kubectl logs -n monitoring -l app.kubernetes.io/name=opentelemetry-collector --tail=100
```

## Troubleshooting

| Issue                         | Solution                                        |
| ----------------------------- | ----------------------------------------------- |
| No data flowing to ClickHouse | Check OTEL Collector logs, verify Kafka running |
| Rate limit errors (429)       | Check tenant rates, adjust limits if needed     |
| Authentication failures (401) | Verify JWT_SECRET, check API keys configured    |
| PII not being redacted        | Check service logs, verify patterns match data  |

## Security Considerations

1. **API Keys**: Store in Kubernetes secrets or Vault
2. **JWT Secret**: Use strong secret, rotate regularly
3. **Rate Limiting**: Monitor and adjust based on usage
4. **Network Policy**: OTEL Collector only accessible from audit-service
5. **TLS**: Enable for production OTEL Collector endpoint

## Next Steps

1. Create Kafka consumers to process telemetry from `otel-telemetry` topic
2. Build Grafana dashboards using ClickHouse data
3. Set up alerts for rate limit violations
4. Scale OTEL Collector as needed

## Related Documentation

- Deployment: `docs/en/guides/telemetry-gateway-deployment.md`

---

_This document is auto-generated from `docs/llm/guides/telemetry-gateway-operations.md`_

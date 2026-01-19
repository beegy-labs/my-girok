# Telemetry Gateway Deployment Guide

## Overview

The Audit Service now includes a Telemetry Gateway that receives external telemetry data (traces, metrics, logs) and securely forwards it to the internal OTEL Collector.

## Architecture

```
External Clients → Audit Service (Gateway) → OTEL Collector → Kafka → ClickHouse
                   ↓
                   - JWT/API Key Auth
                   - Rate Limiting
                   - PII Redaction
                   - Tenant Enrichment
```

## Deployment Steps

### 1. Deploy OTEL Collector with Kafka Exporter

The OTEL Collector has been updated in `platform-gitops` to include Kafka exporter:

```bash
# Apply OTEL Collector updates
kubectl apply -k platform-gitops/platform/monitoring/opentelemetry

# Verify deployment
kubectl get pods -n monitoring -l app.kubernetes.io/name=opentelemetry-collector
```

**Configuration Changes:**

- Added Kafka exporter to send data to Redpanda
- Added ExternalSecret for Redpanda credentials
- Updated pipelines to include Kafka exporter

### 2. Deploy Audit Service

The audit-service has been updated with telemetry gateway functionality:

```bash
# Dev environment
kubectl apply -f platform-gitops/clusters/home/values/platform-audit-service-dev.yaml

# Verify deployment
kubectl get pods -n dev-my-girok -l app=audit-service
```

### 3. Create Telemetry API Keys Secret

Create a Kubernetes secret for telemetry API keys:

```bash
# Generate API keys (example)
API_KEY_1=$(openssl rand -base64 32)
API_KEY_2=$(openssl rand -base64 32)

# Create secret
kubectl create secret generic audit-service-telemetry-secret \
  --from-literal=api-keys="$API_KEY_1,$API_KEY_2" \
  -n dev-my-girok

# For production, use Vault/ExternalSecret
```

### 4. Verify Endpoints

```bash
# Get service endpoint
AUDIT_SERVICE=$(kubectl get svc -n dev-my-girok audit-service -o jsonpath='{.spec.clusterIP}')

# Test with JWT (requires valid JWT token)
curl -X POST http://$AUDIT_SERVICE:3004/v1/telemetry/traces \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"resourceSpans": []}'

# Test with API key
curl -X POST http://$AUDIT_SERVICE:3004/v1/telemetry/traces \
  -H "x-api-key: $API_KEY_1" \
  -H "x-tenant-id: test-tenant" \
  -H "Content-Type: application/json" \
  -d '{"resourceSpans": []}'
```

## Configuration

### Environment Variables (audit-service)

| Variable                  | Description                  | Default                                                                     |
| ------------------------- | ---------------------------- | --------------------------------------------------------------------------- |
| `OTEL_COLLECTOR_ENDPOINT` | OTEL Collector gRPC endpoint | `platform-monitoring-opentelemetry-opentelemetry-collector.monitoring:4317` |
| `OTEL_GATEWAY_ENABLED`    | Enable telemetry gateway     | `true`                                                                      |
| `OTEL_FORWARD_TIMEOUT`    | Forwarding timeout (ms)      | `30000`                                                                     |
| `TELEMETRY_API_KEYS`      | Comma-separated API keys     | (from secret)                                                               |
| `RATE_LIMIT_TRACES`       | Traces rate limit (req/min)  | `1000`                                                                      |
| `RATE_LIMIT_METRICS`      | Metrics rate limit (req/min) | `2000`                                                                      |
| `RATE_LIMIT_LOGS`         | Logs rate limit (req/min)    | `5000`                                                                      |

### Helm Values (audit-service)

```yaml
telemetryGateway:
  enabled: true
  collectorEndpoint: 'platform-monitoring-opentelemetry-opentelemetry-collector.monitoring:4317'
  forwardTimeout: 30000
  rateLimits:
    traces: 1000
    metrics: 2000
    logs: 5000
```

### OTEL Collector Configuration

The OTEL Collector now includes:

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

## API Endpoints

### POST /v1/telemetry/traces

Receive OTLP trace data

**Rate Limit:** 1000 requests/min per tenant

**Auth:** JWT (Bearer token) OR API Key (x-api-key + x-tenant-id)

**Example:**

```bash
curl -X POST https://audit-api-dev.girok.dev/v1/telemetry/traces \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "resourceSpans": [{
      "resource": {
        "attributes": [
          {"key": "service.name", "value": {"stringValue": "my-app"}}
        ]
      },
      "scopeSpans": [{
        "spans": [{
          "traceId": "...",
          "spanId": "...",
          "name": "HTTP GET /api/users"
        }]
      }]
    }]
  }'
```

### POST /v1/telemetry/metrics

Receive OTLP metric data

**Rate Limit:** 2000 requests/min per tenant

### POST /v1/telemetry/logs

Receive OTLP log data

**Rate Limit:** 5000 requests/min per tenant

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

## Monitoring

### Health Checks

```bash
# Audit service health
curl http://$AUDIT_SERVICE:3004/health

# OTEL Collector health
curl http://platform-monitoring-opentelemetry-opentelemetry-collector.monitoring:13133
```

### Metrics

OTEL Collector exposes metrics on port 8888:

```bash
# Collector metrics
curl http://platform-monitoring-opentelemetry-opentelemetry-collector.monitoring:8888/metrics
```

### Logs

```bash
# Audit service logs
kubectl logs -n dev-my-girok -l app=audit-service --tail=100

# OTEL Collector logs
kubectl logs -n monitoring -l app.kubernetes.io/name=opentelemetry-collector --tail=100
```

## Troubleshooting

### No data flowing to ClickHouse

1. Check OTEL Collector logs for connection errors
2. Verify Kafka (Redpanda) is running and accessible
3. Check OTEL Collector Kafka exporter configuration

### Rate limit errors (429)

- Check tenant request rates
- Adjust rate limits in values.yaml if needed
- Verify rate limiting is using correct tenant IDs

### Authentication failures (401)

- Verify JWT_SECRET is correct
- Check API keys are properly configured
- Ensure x-tenant-id header is provided for API key auth

### PII not being redacted

- Check service logs for redaction errors
- Verify PII patterns match your data format
- File issue if new PII patterns needed

## Security Considerations

1. **API Keys**: Store in Kubernetes secrets or Vault, never commit to git
2. **JWT Secret**: Use strong secret, rotate regularly
3. **Rate Limiting**: Monitor and adjust based on usage patterns
4. **Network Policy**: Ensure OTEL Collector is only accessible from audit-service
5. **TLS**: Consider enabling TLS for production OTEL Collector endpoint

## Next Steps

1. **Consumer Services**: Create Kafka consumers to process telemetry from `otel-telemetry` topic
2. **Dashboards**: Build Grafana dashboards using ClickHouse data
3. **Alerting**: Set up alerts for rate limit violations and authentication failures
4. **Scaling**: Monitor resource usage and scale OTEL Collector as needed

## References

- Audit Service Documentation: `docs/llm/services/audit-service.md`
- OTEL Collector Documentation: https://opentelemetry.io/docs/collector/
- Redpanda Documentation: https://docs.redpanda.com/

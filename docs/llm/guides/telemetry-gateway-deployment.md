# Telemetry Gateway Deployment Guide

## Overview

The Audit Service includes a Telemetry Gateway that receives external telemetry data (traces, metrics, logs) and securely forwards it to the internal OTEL Collector.

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

```bash
kubectl apply -k platform-gitops/platform/monitoring/opentelemetry
kubectl get pods -n monitoring -l app.kubernetes.io/name=opentelemetry-collector
```

### 2. Deploy Audit Service

```bash
kubectl apply -f platform-gitops/clusters/home/values/platform-audit-service-dev.yaml
kubectl get pods -n dev-my-girok -l app=audit-service
```

### 3. Create Telemetry API Keys Secret

```bash
API_KEY_1=$(openssl rand -base64 32)
kubectl create secret generic audit-service-telemetry-secret \
  --from-literal=api-keys="$API_KEY_1" \
  -n dev-my-girok
```

### 4. Verify Endpoints

```bash
AUDIT_SERVICE=$(kubectl get svc -n dev-my-girok audit-service -o jsonpath='{.spec.clusterIP}')

# Test with API key
curl -X POST http://$AUDIT_SERVICE:3004/v1/telemetry/traces \
  -H "x-api-key: $API_KEY_1" \
  -H "x-tenant-id: test-tenant" \
  -H "Content-Type: application/json" \
  -d '{"resourceSpans": []}'
```

## Configuration

### Environment Variables

| Variable                  | Description                  | Default                                      |
| ------------------------- | ---------------------------- | -------------------------------------------- |
| `OTEL_COLLECTOR_ENDPOINT` | OTEL Collector gRPC endpoint | `...opentelemetry-collector.monitoring:4317` |
| `OTEL_GATEWAY_ENABLED`    | Enable telemetry gateway     | `true`                                       |
| `OTEL_FORWARD_TIMEOUT`    | Forwarding timeout (ms)      | `30000`                                      |
| `TELEMETRY_API_KEYS`      | Comma-separated API keys     | (from secret)                                |
| `RATE_LIMIT_TRACES`       | Traces rate limit (req/min)  | `1000`                                       |
| `RATE_LIMIT_METRICS`      | Metrics rate limit (req/min) | `2000`                                       |
| `RATE_LIMIT_LOGS`         | Logs rate limit (req/min)    | `5000`                                       |

### Helm Values

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

## API Endpoints

| Endpoint                   | Rate Limit   | Auth                       |
| -------------------------- | ------------ | -------------------------- |
| POST /v1/telemetry/traces  | 1000 req/min | JWT or API Key + tenant-id |
| POST /v1/telemetry/metrics | 2000 req/min | JWT or API Key + tenant-id |
| POST /v1/telemetry/logs    | 5000 req/min | JWT or API Key + tenant-id |

## Related Documentation

- **Features & Troubleshooting**: `telemetry-gateway-operations.md`
- Audit Service: `../services/audit-service.md`

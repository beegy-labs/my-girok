# Deployment Guide

> Kubernetes-based deployment with Cilium Gateway API

## Deployment Environment

**IMPORTANT**: All deployments except app development are performed on Kubernetes.

```
Development Environment:
- Local: Docker Compose (for rapid development)
- All apps: Run directly on local machine

Deployment Environment (Kubernetes):
- Staging: Kubernetes cluster
- Production: Kubernetes cluster
```

## Architecture Overview

### 2025 Architecture Components

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Cilium Gateway API                           │
│  api.girok.dev    ws.girok.dev    auth.girok.dev    s3.girok.dev   │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
        ▼                        ▼                        ▼
┌───────────────┐      ┌─────────────────┐      ┌────────────────┐
│  GraphQL BFF  │      │   WS Gateway    │      │  Auth Service  │
│ (Apollo Fed)  │      │  (Socket.io)    │      │  (REST+gRPC)   │
└───────┬───────┘      └────────┬────────┘      └────────────────┘
        │ gRPC                  │ NATS
        ▼                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Domain Services (gRPC)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │Personal  │  │  Feed    │  │  Chat    │  │ Matching │           │
│  │PostgreSQL│  │ MongoDB  │  │ MongoDB  │  │ Valkey   │           │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘           │
└─────────────────────────────────────────────────────────────────────┘
```

## Kubernetes Structure

### Namespace Strategy

```yaml
# Functional namespace separation
apiVersion: v1
kind: Namespace
metadata:
  name: gateway # Cilium Gateway, GraphQL BFF, WS Gateway
---
apiVersion: v1
kind: Namespace
metadata:
  name: services # Domain services (auth, personal, feed, etc.)
---
apiVersion: v1
kind: Namespace
metadata:
  name: data # PostgreSQL, MongoDB, Valkey, NATS
---
apiVersion: v1
kind: Namespace
metadata:
  name: realtime # LiveKit, additional WebSocket services
---
apiVersion: v1
kind: Namespace
metadata:
  name: observability # Prometheus, Grafana, Jaeger
```

**Namespace Rules:**

- `gateway`: Edge routing and BFF layer
- `services`: All domain microservices
- `data`: Databases and message brokers
- `realtime`: Video/audio communication
- `observability`: Monitoring and tracing

### Project Structure

```
my-girok/
├── k8s/
│   ├── base/                          # Common Kustomize base
│   │   ├── kustomization.yaml
│   │   ├── namespaces.yaml
│   │   └── services/
│   │       ├── gateway/
│   │       │   ├── graphql-bff/
│   │       │   │   ├── deployment.yaml
│   │       │   │   ├── service.yaml
│   │       │   │   └── hpa.yaml
│   │       │   └── ws-gateway/
│   │       │       ├── deployment.yaml
│   │       │       ├── service.yaml
│   │       │       └── hpa.yaml
│   │       ├── auth-service/
│   │       │   ├── deployment.yaml
│   │       │   ├── service.yaml
│   │       │   └── hpa.yaml
│   │       ├── personal-service/
│   │       ├── feed-service/
│   │       ├── chat-service/
│   │       ├── matching-service/
│   │       └── media-service/
│   │
│   ├── overlays/
│   │   ├── staging/
│   │   │   ├── kustomization.yaml
│   │   │   ├── configmap.yaml
│   │   │   └── httproute.yaml
│   │   └── production/
│   │       ├── kustomization.yaml
│   │       ├── configmap.yaml
│   │       ├── httproute.yaml
│   │       └── hpa-overrides.yaml
│   │
│   ├── gateway/                       # Cilium Gateway API
│   │   ├── gateway.yaml
│   │   ├── httproute-graphql.yaml
│   │   ├── httproute-websocket.yaml
│   │   ├── httproute-auth.yaml
│   │   └── ratelimit.yaml
│   │
│   ├── secrets/                       # Sealed Secrets (encrypted)
│   │   ├── staging/
│   │   │   └── sealed-secrets.yaml
│   │   └── production/
│   │       └── sealed-secrets.yaml
│   │
│   └── databases/
│       ├── postgres/
│       │   ├── statefulset.yaml
│       │   ├── service.yaml
│       │   └── pvc.yaml
│       ├── mongodb/
│       │   ├── statefulset.yaml
│       │   └── service.yaml
│       ├── valkey/
│       │   ├── deployment.yaml
│       │   └── service.yaml
│       └── nats/
│           ├── statefulset.yaml
│           └── service.yaml
│
├── apps/
├── services/
└── packages/
```

## Cilium Gateway API

### Gateway Definition

```yaml
# k8s/gateway/gateway.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: mygirok-gateway
  namespace: gateway
spec:
  gatewayClassName: cilium
  listeners:
    - name: https
      protocol: HTTPS
      port: 443
      hostname: '*.girok.dev'
      tls:
        mode: Terminate
        certificateRefs:
          - kind: Secret
            name: girok-tls-cert
      allowedRoutes:
        namespaces:
          from: All
    - name: websocket
      protocol: HTTPS
      port: 443
      hostname: 'ws.girok.dev'
      tls:
        mode: Terminate
        certificateRefs:
          - kind: Secret
            name: girok-tls-cert
```

### HTTPRoute for GraphQL BFF

```yaml
# k8s/gateway/httproute-graphql.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: graphql-route
  namespace: gateway
spec:
  parentRefs:
    - name: mygirok-gateway
      namespace: gateway
  hostnames:
    - 'api.girok.dev'
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /graphql
      backendRefs:
        - name: graphql-bff
          port: 4000
    - matches:
        - path:
            type: PathPrefix
            value: /
      backendRefs:
        - name: graphql-bff
          port: 4000
```

### HTTPRoute for WebSocket Gateway

```yaml
# k8s/gateway/httproute-websocket.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: websocket-route
  namespace: gateway
spec:
  parentRefs:
    - name: mygirok-gateway
      namespace: gateway
  hostnames:
    - 'ws.girok.dev'
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /socket.io
      backendRefs:
        - name: ws-gateway
          port: 3001
```

### HTTPRoute for Auth Service (Direct REST)

```yaml
# k8s/gateway/httproute-auth.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: auth-route
  namespace: gateway
spec:
  parentRefs:
    - name: mygirok-gateway
      namespace: gateway
  hostnames:
    - 'auth.girok.dev'
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /v1/auth
      backendRefs:
        - name: auth-service
          namespace: services
          port: 3002
```

### Rate Limiting

```yaml
# k8s/gateway/ratelimit.yaml
apiVersion: cilium.io/v2
kind: CiliumEnvoyConfig
metadata:
  name: rate-limit-config
  namespace: gateway
spec:
  services:
    - name: graphql-bff
      namespace: gateway
  backendServices:
    - name: graphql-bff
      namespace: gateway
  resources:
    - '@type': type.googleapis.com/envoy.config.listener.v3.Listener
      name: rate_limit_listener
      filter_chains:
        - filters:
            - name: envoy.filters.network.http_connection_manager
              typed_config:
                '@type': type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                http_filters:
                  - name: envoy.filters.http.local_ratelimit
                    typed_config:
                      '@type': type.googleapis.com/envoy.extensions.filters.http.local_ratelimit.v3.LocalRateLimit
                      stat_prefix: http_local_rate_limiter
                      token_bucket:
                        max_tokens: 100
                        tokens_per_fill: 100
                        fill_interval: 60s
```

## Secrets Management (CRITICAL)

### Kubernetes Secrets Strategy

Kubernetes provides various secret management methods:

#### 1. Sealed Secrets (Recommended)

**Using Bitnami Sealed Secrets:**

```bash
# Install Sealed Secrets controller
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.0/controller.yaml

# Install kubeseal CLI
brew install kubeseal  # macOS
```

**Create and seal secrets:**

```bash
# 1. Create regular Secret (to file)
kubectl create secret generic auth-secrets \
  --from-literal=JWT_SECRET=your-jwt-secret \
  --from-literal=GOOGLE_CLIENT_ID=your-client-id \
  --from-literal=GOOGLE_CLIENT_SECRET=your-client-secret \
  --dry-run=client -o yaml > /tmp/secret.yaml

# 2. Encrypt as Sealed Secret
kubeseal --format yaml < /tmp/secret.yaml > k8s/secrets/production/auth-sealed-secret.yaml

# 3. Delete original
rm /tmp/secret.yaml

# 4. Sealed Secret can be committed to Git (encrypted)
git add k8s/secrets/production/auth-sealed-secret.yaml
git commit -m "chore(k8s): add sealed secrets for auth service"
```

**Sealed Secret Example:**

```yaml
# k8s/secrets/production/auth-sealed-secret.yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: auth-secrets
  namespace: services
spec:
  encryptedData:
    JWT_SECRET: AgBg8F7X... # Encrypted data
    GOOGLE_CLIENT_ID: AgCx9K2... # Encrypted data
    GOOGLE_CLIENT_SECRET: AgDp3L4... # Encrypted data
  template:
    metadata:
      name: auth-secrets
      namespace: services
```

#### 2. HashiCorp Vault (Alternative)

```yaml
# External Secrets with Vault
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: vault-secretstore
  namespace: services
spec:
  provider:
    vault:
      server: 'https://vault.girok.dev'
      path: 'secret'
      version: 'v2'
      auth:
        kubernetes:
          mountPath: 'kubernetes'
          role: 'mygirok-services'
```

### Secrets Management Best Practices

**DO:**

- Use Sealed Secrets or External Secrets Operator
- Use different secrets per environment (staging/production)
- Automate secret rotation (every 90 days)
- Control secret access with RBAC
- Enable audit logging

**DON'T:**

- Commit plain text Secrets to Git
- Store sensitive info in ConfigMap
- Share same secrets across environments
- Output secrets to logs
- Include secrets in container images

## Deployment Examples

### GraphQL BFF Deployment

```yaml
# k8s/base/services/gateway/graphql-bff/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: graphql-bff
  namespace: gateway
  labels:
    app: graphql-bff
    version: v1
spec:
  replicas: 3
  selector:
    matchLabels:
      app: graphql-bff
  template:
    metadata:
      labels:
        app: graphql-bff
        version: v1
    spec:
      containers:
        - name: graphql-bff
          image: mygirok/graphql-bff:latest
          ports:
            - containerPort: 4000
              name: http
          env:
            # From ConfigMap
            - name: NODE_ENV
              valueFrom:
                configMapKeyRef:
                  name: app-config
                  key: NODE_ENV
            # From Secret
            - name: SESSION_SECRET
              valueFrom:
                secretKeyRef:
                  name: bff-secrets
                  key: SESSION_SECRET
            # gRPC endpoints
            - name: AUTH_GRPC_URL
              value: 'auth-service.services.svc.cluster.local:50051'
            - name: PERSONAL_GRPC_URL
              value: 'personal-service.services.svc.cluster.local:50052'
            - name: FEED_GRPC_URL
              value: 'feed-service.services.svc.cluster.local:50053'
          resources:
            requests:
              memory: '256Mi'
              cpu: '100m'
            limits:
              memory: '512Mi'
              cpu: '500m'
          livenessProbe:
            httpGet:
              path: /health
              port: 4000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 4000
            initialDelaySeconds: 5
            periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: graphql-bff
  namespace: gateway
spec:
  selector:
    app: graphql-bff
  ports:
    - port: 4000
      targetPort: 4000
      name: http
  type: ClusterIP
```

### WebSocket Gateway Deployment

```yaml
# k8s/base/services/gateway/ws-gateway/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ws-gateway
  namespace: gateway
  labels:
    app: ws-gateway
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ws-gateway
  template:
    metadata:
      labels:
        app: ws-gateway
    spec:
      containers:
        - name: ws-gateway
          image: mygirok/ws-gateway:latest
          ports:
            - containerPort: 3001
              name: http
          env:
            - name: VALKEY_URL
              value: 'redis://valkey-adapter.data.svc.cluster.local:6379'
            - name: NATS_URL
              value: 'nats://nats.data.svc.cluster.local:4222'
            - name: AUTH_GRPC_URL
              value: 'auth-service.services.svc.cluster.local:50051'
          resources:
            requests:
              memory: '256Mi'
              cpu: '100m'
            limits:
              memory: '512Mi'
              cpu: '500m'
---
apiVersion: v1
kind: Service
metadata:
  name: ws-gateway
  namespace: gateway
spec:
  selector:
    app: ws-gateway
  ports:
    - port: 3001
      targetPort: 3001
      name: http
  type: ClusterIP
```

### Domain Service Deployment (Auth)

```yaml
# k8s/base/services/auth-service/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
  namespace: services
  labels:
    app: auth-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: auth-service
  template:
    metadata:
      labels:
        app: auth-service
    spec:
      containers:
        - name: auth-service
          image: mygirok/auth-service:latest
          ports:
            - containerPort: 3002
              name: http
            - containerPort: 50051
              name: grpc
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: auth-secrets
                  key: DATABASE_URL
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: auth-secrets
                  key: JWT_SECRET
            - name: NATS_URL
              value: 'nats://nats.data.svc.cluster.local:4222'
          resources:
            requests:
              memory: '256Mi'
              cpu: '100m'
            limits:
              memory: '512Mi'
              cpu: '500m'
          livenessProbe:
            httpGet:
              path: /health
              port: 3002
            initialDelaySeconds: 30
            periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: auth-service
  namespace: services
spec:
  selector:
    app: auth-service
  ports:
    - port: 3002
      targetPort: 3002
      name: http
    - port: 50051
      targetPort: 50051
      name: grpc
  type: ClusterIP
```

### Horizontal Pod Autoscaler

```yaml
# k8s/base/services/gateway/graphql-bff/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: graphql-bff-hpa
  namespace: gateway
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: graphql-bff
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

## Database Deployments

### PostgreSQL StatefulSet

```yaml
# k8s/databases/postgres/statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: data
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:16-alpine
          ports:
            - containerPort: 5432
              name: postgres
          env:
            - name: POSTGRES_DB
              value: mygirok
            - name: POSTGRES_USER
              valueFrom:
                secretKeyRef:
                  name: database-credentials
                  key: POSTGRES_USER
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: database-credentials
                  key: POSTGRES_PASSWORD
          volumeMounts:
            - name: postgres-storage
              mountPath: /var/lib/postgresql/data
          resources:
            requests:
              memory: '1Gi'
              cpu: '500m'
            limits:
              memory: '2Gi'
              cpu: '1000m'
  volumeClaimTemplates:
    - metadata:
        name: postgres-storage
      spec:
        accessModes: ['ReadWriteOnce']
        resources:
          requests:
            storage: 20Gi
```

### MongoDB StatefulSet

```yaml
# k8s/databases/mongodb/statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mongodb
  namespace: data
spec:
  serviceName: mongodb
  replicas: 3
  selector:
    matchLabels:
      app: mongodb
  template:
    metadata:
      labels:
        app: mongodb
    spec:
      containers:
        - name: mongodb
          image: mongo:8.0
          ports:
            - containerPort: 27017
              name: mongodb
          env:
            - name: MONGO_INITDB_ROOT_USERNAME
              valueFrom:
                secretKeyRef:
                  name: mongodb-credentials
                  key: MONGO_USER
            - name: MONGO_INITDB_ROOT_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: mongodb-credentials
                  key: MONGO_PASSWORD
          volumeMounts:
            - name: mongodb-storage
              mountPath: /data/db
  volumeClaimTemplates:
    - metadata:
        name: mongodb-storage
      spec:
        accessModes: ['ReadWriteOnce']
        resources:
          requests:
            storage: 50Gi
```

### NATS JetStream

```yaml
# k8s/databases/nats/statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: nats
  namespace: data
spec:
  serviceName: nats
  replicas: 3
  selector:
    matchLabels:
      app: nats
  template:
    metadata:
      labels:
        app: nats
    spec:
      containers:
        - name: nats
          image: nats:2.10-alpine
          args:
            - '--jetstream'
            - '--cluster_name=mygirok-nats'
            - '--cluster=nats://0.0.0.0:6222'
            - '--routes=nats://nats-0.nats:6222,nats://nats-1.nats:6222,nats://nats-2.nats:6222'
          ports:
            - containerPort: 4222
              name: client
            - containerPort: 6222
              name: cluster
            - containerPort: 8222
              name: monitor
          volumeMounts:
            - name: nats-storage
              mountPath: /data
  volumeClaimTemplates:
    - metadata:
        name: nats-storage
      spec:
        accessModes: ['ReadWriteOnce']
        resources:
          requests:
            storage: 10Gi
```

## Using Kustomize

### Base Configuration

```yaml
# k8s/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - namespaces.yaml
  - services/gateway/graphql-bff/deployment.yaml
  - services/gateway/graphql-bff/service.yaml
  - services/gateway/graphql-bff/hpa.yaml
  - services/gateway/ws-gateway/deployment.yaml
  - services/gateway/ws-gateway/service.yaml
  - services/auth-service/deployment.yaml
  - services/auth-service/service.yaml
  - services/personal-service/deployment.yaml
  - services/feed-service/deployment.yaml
  - services/chat-service/deployment.yaml
  - services/matching-service/deployment.yaml

commonLabels:
  app.kubernetes.io/name: mygirok
  app.kubernetes.io/managed-by: kustomize
```

### Production Overlay

```yaml
# k8s/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base
  - ../../gateway/gateway.yaml
  - ../../gateway/httproute-graphql.yaml
  - ../../gateway/httproute-websocket.yaml
  - ../../gateway/httproute-auth.yaml
  - sealed-secrets.yaml

configMapGenerator:
  - name: app-config
    literals:
      - NODE_ENV=production
      - LOG_LEVEL=info

patchesStrategicMerge:
  - hpa-overrides.yaml

images:
  - name: mygirok/graphql-bff
    newTag: v1.2.3
  - name: mygirok/ws-gateway
    newTag: v1.2.3
  - name: mygirok/auth-service
    newTag: v1.2.3
```

### Deployment Commands

```bash
# Deploy to staging
kubectl apply -k k8s/overlays/staging

# Deploy to production
kubectl apply -k k8s/overlays/production

# Restart specific service
kubectl rollout restart deployment/graphql-bff -n gateway

# Check deployment status
kubectl rollout status deployment/graphql-bff -n gateway

# Rollback
kubectl rollout undo deployment/graphql-bff -n gateway
```

## CI/CD Pipeline

### GitHub Actions Example

```yaml
# .github/workflows/deploy-production.yml
name: Deploy to Production

on:
  push:
    branches:
      - main
    paths:
      - 'services/**'
      - 'k8s/**'

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push GraphQL BFF
        uses: docker/build-push-action@v5
        with:
          context: ./services/gateway/graphql-bff
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/graphql-bff:latest
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/graphql-bff:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Install kubectl
        uses: azure/setup-kubectl@v3

      - name: Configure kubectl
        run: |
          echo "${{ secrets.KUBECONFIG }}" | base64 -d > kubeconfig
          export KUBECONFIG=kubeconfig

      - name: Deploy to Kubernetes
        run: |
          export KUBECONFIG=kubeconfig
          kubectl apply -k k8s/overlays/production
          kubectl rollout status deployment/graphql-bff -n gateway
          kubectl rollout status deployment/ws-gateway -n gateway

      - name: Verify deployment
        run: |
          export KUBECONFIG=kubeconfig
          kubectl get pods -n gateway
          kubectl get pods -n services
```

## Monitoring & Logging

### Prometheus ServiceMonitor

```yaml
# Service monitoring
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: graphql-bff-monitor
  namespace: observability
spec:
  selector:
    matchLabels:
      app: graphql-bff
  namespaceSelector:
    matchNames:
      - gateway
  endpoints:
    - port: http
      path: /metrics
      interval: 30s
```

### Distributed Tracing (Jaeger)

```yaml
# Jaeger for distributed tracing
apiVersion: jaegertracing.io/v1
kind: Jaeger
metadata:
  name: mygirok-jaeger
  namespace: observability
spec:
  strategy: production
  storage:
    type: elasticsearch
    options:
      es:
        server-urls: http://elasticsearch:9200
```

## Deployment Checklist

### Before Deployment

- [ ] Build Docker images and push to registry
- [ ] Verify goose migrations are in Docker image
- [ ] Create and encrypt Sealed Secrets
- [ ] Verify Kustomize overlays
- [ ] Test goose migrations locally (`goose up/down`)
- [ ] Validate ConfigMap values
- [ ] Verify resource limits
- [ ] Configure Cilium Gateway routes
- [ ] Enable `migration.enabled: true` in values (platform-gitops)

### During Deployment

- [ ] Use **Manual Sync** for DB changes (not auto-sync)
- [ ] Monitor PreSync Job (migration-job) in ArgoCD
- [ ] Check migration Job logs: `kubectl logs job/<service>-migrate`
- [ ] Monitor rollout status
- [ ] Check pod status across namespaces
- [ ] Test GraphQL endpoint
- [ ] Test WebSocket connection
- [ ] Verify health checks pass

### After Deployment

- [ ] Verify `goose_db_version` table updated
- [ ] Verify application functionality
- [ ] Check logs (no errors)
- [ ] Monitor metrics (CPU, memory)
- [ ] Test gRPC connections between services
- [ ] Verify NATS event flow
- [ ] Prepare rollback plan

## Database Migration Deployment

### goose + ArgoCD PreSync Strategy

```
services/<service>/migrations/  <- SSOT
            ↓
      Docker Image (baked in)
            ↓
   ArgoCD PreSync Hook Job (goose up)
            ↓
        App Deployment
```

### Key Files

| File                                  | Purpose                            |
| ------------------------------------- | ---------------------------------- |
| `services/<service>/migrations/*.sql` | goose SQL migrations               |
| `services/<service>/Dockerfile`       | Includes goose binary + migrations |
| `helm/templates/migration-job.yaml`   | ArgoCD PreSync Job                 |

### Verify Migration

```bash
# Check Job status
kubectl get jobs -n dev-my-girok | grep migrate

# Check Job logs
kubectl logs job/auth-service-migrate -n dev-my-girok

# Verify in database
psql "$DATABASE_URL" -c "SELECT * FROM goose_db_version ORDER BY version_id DESC LIMIT 5;"
```

**Full guide**: `docs/DATABASE.md`

## Troubleshooting

### When Pods Won't Start

```bash
# Check pod status
kubectl get pods -n gateway
kubectl get pods -n services

# Get detailed info
kubectl describe pod <pod-name> -n gateway

# Check logs
kubectl logs <pod-name> -n gateway

# Check previous container logs (if restarted)
kubectl logs <pod-name> -n gateway --previous
```

### gRPC Connection Issues

```bash
# Test gRPC connectivity from within cluster
kubectl run -it --rm grpc-debug --image=fullstorydev/grpcurl --restart=Never -- \
  -plaintext auth-service.services.svc.cluster.local:50051 list

# Check service endpoints
kubectl get endpoints -n services
```

### Cilium Gateway Issues

```bash
# Check Gateway status
kubectl get gateway -n gateway

# Check HTTPRoute status
kubectl get httproute -n gateway

# Check Cilium envoy config
kubectl get ciliumenvoyconfig -n gateway
```

### NATS Connection Issues

```bash
# Check NATS cluster status
kubectl exec -it nats-0 -n data -- nats server info

# Check JetStream status
kubectl exec -it nats-0 -n data -- nats stream list
```

## References

- [Kubernetes Official Docs](https://kubernetes.io/docs/)
- [Cilium Gateway API](https://docs.cilium.io/en/stable/network/servicemesh/gateway-api/)
- [Sealed Secrets](https://github.com/bitnami-labs/sealed-secrets)
- [Kustomize](https://kustomize.io/)
- [NATS JetStream](https://docs.nats.io/nats-concepts/jetstream)
- [SECURITY.md](SECURITY.md) - Security policies

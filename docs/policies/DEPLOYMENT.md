# Deployment Guide

> Kubernetes-based deployment guidelines

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

## Kubernetes Structure

### Namespace Strategy

```yaml
# Separate namespaces by environment
apiVersion: v1
kind: Namespace
metadata:
  name: mygirok-staging
---
apiVersion: v1
kind: Namespace
metadata:
  name: mygirok-production
```

**Namespace Rules:**
- `mygirok-staging`: Staging environment
- `mygirok-production`: Production environment
- Additional service-specific namespaces possible (optional)

### Project Structure

```
my-girok/
├── k8s/
│   ├── base/                          # Common Kustomize base
│   │   ├── kustomization.yaml
│   │   ├── namespace.yaml
│   │   └── services/
│   │       ├── auth-service/
│   │       │   ├── deployment.yaml
│   │       │   ├── service.yaml
│   │       │   └── hpa.yaml           # Horizontal Pod Autoscaler
│   │       ├── content-api/
│   │       ├── web-bff/
│   │       ├── mobile-bff/
│   │       └── api-gateway/
│   │
│   ├── overlays/
│   │   ├── staging/
│   │   │   ├── kustomization.yaml
│   │   │   ├── configmap.yaml
│   │   │   └── ingress.yaml
│   │   └── production/
│   │       ├── kustomization.yaml
│   │       ├── configmap.yaml
│   │       ├── ingress.yaml
│   │       └── hpa-overrides.yaml
│   │
│   ├── secrets/                       # ⚠️ DO NOT commit to Git
│   │   ├── staging/
│   │   │   └── sealed-secrets.yaml   # Use Sealed Secrets
│   │   └── production/
│   │       └── sealed-secrets.yaml
│   │
│   └── databases/
│       ├── postgres/
│       │   ├── statefulset.yaml
│       │   ├── service.yaml
│       │   └── pvc.yaml               # Persistent Volume Claim
│       └── redis/
│           ├── deployment.yaml
│           └── service.yaml
│
├── apps/
├── services/
└── packages/
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
# or
wget https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.0/kubeseal-linux-amd64
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
  namespace: mygirok-production
spec:
  encryptedData:
    JWT_SECRET: AgBg8F7X... # Encrypted data
    GOOGLE_CLIENT_ID: AgCx9K2... # Encrypted data
    GOOGLE_CLIENT_SECRET: AgDp3L4... # Encrypted data
  template:
    metadata:
      name: auth-secrets
      namespace: mygirok-production
```

**Usage in Deployment:**

```yaml
# k8s/base/services/auth-service/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
spec:
  template:
    spec:
      containers:
      - name: auth-service
        image: mygirok/auth-service:latest
        env:
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: auth-secrets
              key: JWT_SECRET
        - name: GOOGLE_CLIENT_ID
          valueFrom:
            secretKeyRef:
              name: auth-secrets
              key: GOOGLE_CLIENT_ID
        - name: GOOGLE_CLIENT_SECRET
          valueFrom:
            secretKeyRef:
              name: auth-secrets
              key: GOOGLE_CLIENT_SECRET
```

#### 2. External Secrets Operator (Alternative)

**Integration with AWS Secrets Manager, Google Secret Manager, HashiCorp Vault:**

```yaml
# Install External Secrets
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets -n external-secrets-system --create-namespace

# SecretStore definition (AWS Secrets Manager example)
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secretstore
  namespace: mygirok-production
spec:
  provider:
    aws:
      service: SecretsManager
      region: ap-northeast-2
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets-sa

# ExternalSecret definition
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: auth-secrets
  namespace: mygirok-production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secretstore
    kind: SecretStore
  target:
    name: auth-secrets
    creationPolicy: Owner
  data:
  - secretKey: JWT_SECRET
    remoteRef:
      key: mygirok/production/auth
      property: jwt_secret
  - secretKey: GOOGLE_CLIENT_ID
    remoteRef:
      key: mygirok/production/auth
      property: google_client_id
```

#### 3. ConfigMap vs Secret

**ConfigMap**: Non-sensitive configuration
**Secret**: Sensitive information (encrypted)

```yaml
# ConfigMap - Public configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: mygirok-production
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  API_VERSION: "v1"
  REDIS_HOST: "redis-service"
  DATABASE_HOST: "postgres-service"

---
# Secret - Sensitive information (managed with Sealed Secrets)
apiVersion: v1
kind: Secret
metadata:
  name: database-credentials
  namespace: mygirok-production
type: Opaque
stringData:
  DATABASE_URL: "postgresql://user:password@postgres-service:5432/mygirok"
  REDIS_PASSWORD: "redis-secret-password"
```

### Secrets Management Best Practices

**DO:**
- ✅ Use Sealed Secrets or External Secrets Operator
- ✅ Use different secrets per environment (staging/production)
- ✅ Automate secret rotation (every 90 days)
- ✅ Control secret access with RBAC
- ✅ Enable audit logging

**DON'T:**
- ❌ Commit plain text Secrets to Git
- ❌ Store sensitive info in ConfigMap
- ❌ Share same secrets across environments
- ❌ Output secrets to logs
- ❌ Include secrets in container images

## Deployment Examples

### Service Deployment

```yaml
# k8s/base/services/auth-service/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
  labels:
    app: auth-service
    version: v1
spec:
  replicas: 3
  selector:
    matchLabels:
      app: auth-service
  template:
    metadata:
      labels:
        app: auth-service
        version: v1
    spec:
      containers:
      - name: auth-service
        image: mygirok/auth-service:latest
        ports:
        - containerPort: 3000
          name: http
        env:
        # From ConfigMap
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: NODE_ENV
        # From Secret
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-credentials
              key: DATABASE_URL
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: auth-secrets
              key: JWT_SECRET
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: auth-service
spec:
  selector:
    app: auth-service
  ports:
  - port: 80
    targetPort: 3000
    name: http
  type: ClusterIP
```

### Horizontal Pod Autoscaler

```yaml
# k8s/base/services/auth-service/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: auth-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: auth-service
  minReplicas: 3
  maxReplicas: 10
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

### Ingress

```yaml
# k8s/overlays/production/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: mygirok-ingress
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/rate-limit: "100"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - api.mygirok.dev
    - mygirok.dev
    secretName: mygirok-tls
  rules:
  - host: api.mygirok.dev
    http:
      paths:
      - path: /api/auth
        pathType: Prefix
        backend:
          service:
            name: auth-service
            port:
              number: 80
      - path: /api/content
        pathType: Prefix
        backend:
          service:
            name: content-api
            port:
              number: 80
  - host: mygirok.dev
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web-app
            port:
              number: 80
```

## Using Kustomize

### Base Configuration

```yaml
# k8s/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: mygirok-production

resources:
- namespace.yaml
- services/auth-service/deployment.yaml
- services/auth-service/service.yaml
- services/auth-service/hpa.yaml
- services/content-api/deployment.yaml
- services/content-api/service.yaml
- services/web-bff/deployment.yaml
- services/web-bff/service.yaml
- databases/postgres/statefulset.yaml
- databases/redis/deployment.yaml

commonLabels:
  app.kubernetes.io/name: mygirok
  app.kubernetes.io/managed-by: kustomize
```

### Production Overlay

```yaml
# k8s/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: mygirok-production

bases:
- ../../base

resources:
- ingress.yaml
- sealed-secrets.yaml

configMapGenerator:
- name: app-config
  literals:
  - NODE_ENV=production
  - LOG_LEVEL=info
  - API_VERSION=v1

patchesStrategicMerge:
- hpa-overrides.yaml

images:
- name: mygirok/auth-service
  newTag: v1.2.3
- name: mygirok/content-api
  newTag: v1.2.3
```

### Deployment Commands

```bash
# Deploy to staging
kubectl apply -k k8s/overlays/staging

# Deploy to production
kubectl apply -k k8s/overlays/production

# Restart specific service
kubectl rollout restart deployment/auth-service -n mygirok-production

# Check deployment status
kubectl rollout status deployment/auth-service -n mygirok-production

# Rollback
kubectl rollout undo deployment/auth-service -n mygirok-production
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

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: ./services/auth-service
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/auth-service:latest
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/auth-service:${{ github.sha }}
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
          kubectl rollout status deployment/auth-service -n mygirok-production

      - name: Verify deployment
        run: |
          export KUBECONFIG=kubeconfig
          kubectl get pods -n mygirok-production
          kubectl get services -n mygirok-production
```

## Database Management

### PostgreSQL StatefulSet

```yaml
# k8s/databases/postgres/statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
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
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 20Gi
```

### Migration Job

```yaml
# k8s/jobs/migration.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: prisma-migrate
spec:
  template:
    spec:
      containers:
      - name: migrate
        image: mygirok/auth-service:latest
        command: ["pnpm", "prisma", "migrate", "deploy"]
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-credentials
              key: DATABASE_URL
      restartPolicy: OnFailure
  backoffLimit: 3
```

## Monitoring & Logging

### Prometheus & Grafana

```yaml
# Prometheus ServiceMonitor
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: auth-service-monitor
spec:
  selector:
    matchLabels:
      app: auth-service
  endpoints:
  - port: http
    path: /metrics
    interval: 30s
```

### Fluentd for Logging

```yaml
# Log collection for all Pods
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-config
data:
  fluent.conf: |
    <source>
      @type tail
      path /var/log/containers/*.log
      pos_file /var/log/fluentd-containers.log.pos
      tag kubernetes.*
      format json
    </source>
```

## Deployment Checklist

### Before Deployment
- [ ] Build Docker images and push to registry
- [ ] Create and encrypt Sealed Secrets
- [ ] Verify Kustomize overlays
- [ ] Prepare database migrations
- [ ] Validate ConfigMap values
- [ ] Verify resource limits

### During Deployment
- [ ] Run kubectl apply -k
- [ ] Monitor rollout status
- [ ] Check pod status
- [ ] Test service endpoints
- [ ] Verify health checks pass

### After Deployment
- [ ] Verify application functionality
- [ ] Check logs (no errors)
- [ ] Monitor metrics (CPU, memory)
- [ ] Test API responses
- [ ] Prepare rollback plan

## Troubleshooting

### When Pods Won't Start

```bash
# Check pod status
kubectl get pods -n mygirok-production

# Get detailed info
kubectl describe pod <pod-name> -n mygirok-production

# Check logs
kubectl logs <pod-name> -n mygirok-production

# Check previous container logs (if restarted)
kubectl logs <pod-name> -n mygirok-production --previous
```

### Secret-Related Issues

```bash
# Check if secret exists
kubectl get secrets -n mygirok-production

# View secret contents (base64 decoded)
kubectl get secret auth-secrets -n mygirok-production -o jsonpath='{.data.JWT_SECRET}' | base64 -d

# Recreate Sealed Secret
kubeseal --format yaml < secret.yaml > sealed-secret.yaml
```

### Networking Issues

```bash
# Check services
kubectl get svc -n mygirok-production

# Check endpoints
kubectl get endpoints -n mygirok-production

# Check ingress
kubectl describe ingress mygirok-ingress -n mygirok-production

# Test DNS (create temporary pod)
kubectl run -it --rm debug --image=alpine --restart=Never -- sh
# Inside: apk add curl && curl http://auth-service.mygirok-production.svc.cluster.local
```

## References

- [Kubernetes Official Docs](https://kubernetes.io/docs/)
- [Sealed Secrets](https://github.com/bitnami-labs/sealed-secrets)
- [External Secrets Operator](https://external-secrets.io/)
- [Kustomize](https://kustomize.io/)
- [SECURITY.md](SECURITY.md) - Security policies

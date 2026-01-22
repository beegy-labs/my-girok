# Kubernetes - 2026 Best Practices

> Container orchestration, Helm, security | **Updated**: 2026-01-22

## Kubernetes Adoption (2026)

- **93%** of organizations using or evaluating
- **80%** running in production
- **31%** of backend developers (~5.6M) use regularly

## Core Concepts

### Declarative Configuration

```yaml
# Desired state, not imperative commands
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    spec:
      containers:
        - name: app
          image: my-app:v1.0.0
          resources:
            requests:
              memory: '128Mi'
              cpu: '100m'
            limits:
              memory: '256Mi'
              cpu: '200m'
```

## Resource Management

### Requests vs Limits

| Setting  | Purpose              | Best Practice                        |
| -------- | -------------------- | ------------------------------------ |
| Requests | Scheduling guarantee | Set based on typical usage           |
| Limits   | Hard ceiling         | 2x requests for CPU, 1.5x for memory |

### LimitRange

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
spec:
  limits:
    - default:
        memory: '256Mi'
        cpu: '200m'
      defaultRequest:
        memory: '128Mi'
        cpu: '100m'
      type: Container
```

## Auto-Scaling

### Horizontal Pod Autoscaler (HPA)

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: my-app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

### Vertical Pod Autoscaler (VPA)

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: my-app-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  updatePolicy:
    updateMode: 'Auto'
```

## Health Checks

### Probes

```yaml
spec:
  containers:
    - name: app
      livenessProbe:
        httpGet:
          path: /health/live
          port: 8080
        initialDelaySeconds: 15
        periodSeconds: 10
        failureThreshold: 3
      readinessProbe:
        httpGet:
          path: /health/ready
          port: 8080
        initialDelaySeconds: 5
        periodSeconds: 5
      startupProbe:
        httpGet:
          path: /health/startup
          port: 8080
        failureThreshold: 30
        periodSeconds: 10
```

| Probe     | Purpose         | Failure Action           |
| --------- | --------------- | ------------------------ |
| Startup   | Initial boot    | Block liveness/readiness |
| Liveness  | Is alive?       | Restart container        |
| Readiness | Accept traffic? | Remove from service      |

## Security Best Practices

### Pod Security

```yaml
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    fsGroup: 1000
  containers:
    - name: app
      securityContext:
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
        capabilities:
          drop: ['ALL']
```

### Network Policies

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-policy
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: frontend
      ports:
        - protocol: TCP
          port: 8080
```

### Common Misconfigurations

| Issue                   | Risk                     | Fix                       |
| ----------------------- | ------------------------ | ------------------------- |
| privileged: true        | Container escape         | Never use in production   |
| hostNetwork: true       | Network isolation bypass | Use only when necessary   |
| No resource limits      | Resource exhaustion      | Always set limits         |
| Default service account | Over-permissioned        | Create dedicated accounts |

## Helm Best Practices

### Chart Structure

```
my-chart/
├── Chart.yaml
├── values.yaml
├── values-dev.yaml
├── values-prod.yaml
├── templates/
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── configmap.yaml
│   └── _helpers.tpl
└── charts/           # Dependencies
```

### Values Management

```yaml
# values.yaml (defaults)
replicaCount: 1
image:
  repository: my-app
  tag: latest

# values-prod.yaml (production overrides)
replicaCount: 3
image:
  tag: v1.0.0
resources:
  requests:
    memory: "256Mi"
```

## Deployment Strategies

| Strategy      | Description           | Risk            |
| ------------- | --------------------- | --------------- |
| RollingUpdate | Gradual replacement   | Low             |
| Recreate      | All at once           | High (downtime) |
| Blue-Green    | Parallel environments | Low             |
| Canary        | Gradual traffic shift | Very low        |

### Rolling Update Config

```yaml
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 25%
      maxUnavailable: 25%
```

## Observability

### Resource Monitoring

```bash
# Node resources
kubectl top nodes

# Pod resources
kubectl top pods -n my-namespace

# Describe for events
kubectl describe pod my-pod
```

### Logging

```bash
# Current logs
kubectl logs my-pod

# Previous container
kubectl logs my-pod --previous

# Follow logs
kubectl logs -f my-pod
```

## Events (2026)

| Event      | Location       | Dates           |
| ---------- | -------------- | --------------- |
| KubeCon EU | Amsterdam      | Mar 23-26, 2026 |
| KubeCon NA | Salt Lake City | Nov 9-12, 2026  |

## Sources

- [Kubernetes Basics 2026](https://www.nucamp.co/blog/kubernetes-basics-in-2026-container-orchestration-for-backend-developers)
- [Container Orchestration Platforms 2026](https://northflank.com/blog/container-orchestration-platforms-kubernetes)
- [Container Orchestration Tools 2026](https://devopscube.com/docker-container-clustering-tools/)
- [Kubernetes Official](https://kubernetes.io/)

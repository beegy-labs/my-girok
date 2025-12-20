# @my-girok/storybook

> Design System Documentation - V0.0.1 AAA Workstation

## Purpose

Storybook application for interactive component documentation. Deployed as an independent service in Kubernetes, serving the Design System documentation for the my-girok project.

## Architecture

```
apps/storybook/                    # Deployment configuration
├── package.json                   # Orchestrator scripts
├── Dockerfile                     # Multi-stage build
├── nginx.conf                     # Production nginx config
├── .gitignore
└── helm/                          # Kubernetes deployment
    ├── Chart.yaml
    ├── values.yaml.example
    ├── .helmignore
    └── templates/
        ├── _helpers.tpl
        ├── deployment.yaml
        ├── service.yaml
        ├── ingress.yaml
        ├── serviceaccount.yaml
        ├── hpa.yaml
        ├── pdb.yaml
        └── NOTES.txt

packages/ui-components/            # Component source
├── .storybook/                    # Storybook configuration
│   ├── main.ts
│   ├── preview.tsx
│   └── vitest.setup.ts
└── src/components/
    ├── Button.tsx
    ├── Button.stories.tsx         # CSF 3.0 stories
    └── ...
```

## Relationship with ui-components

| Concern          | Location                             | Responsibility           |
| ---------------- | ------------------------------------ | ------------------------ |
| Component code   | `packages/ui-components/src/`        | Component implementation |
| Story files      | `packages/ui-components/src/`        | Component documentation  |
| Storybook config | `packages/ui-components/.storybook/` | Build configuration      |
| Deployment       | `apps/storybook/`                    | Docker, Helm, CI/CD      |

This separation follows the 2025 best practice of keeping deployment concerns separate from library code.

## Commands

```bash
# Development (runs from ui-components)
pnpm --filter @my-girok/storybook dev

# Build static site
pnpm --filter @my-girok/storybook build

# Preview built site
pnpm --filter @my-girok/storybook preview
```

## Docker Build

```bash
# Build image
docker build -t storybook:latest -f apps/storybook/Dockerfile .

# Run locally
docker run -p 6006:6006 storybook:latest

# Access at http://localhost:6006
```

### Dockerfile Features

- **Multi-stage build**: Builder + nginx-unprivileged
- **Non-root**: Runs as UID 101 (nginx user)
- **Security headers**: X-Frame-Options, X-Content-Type-Options, etc.
- **Gzip compression**: Enabled for all text assets
- **Static caching**: 1 year for immutable assets
- **Health check**: `/health` endpoint
- **robots.txt**: AI crawlers blocked (GPTBot, ClaudeBot, etc.)

## Kubernetes Deployment

### Helm Installation

```bash
# Development
cd apps/storybook/helm
cp values.yaml.example values-dev.yaml
# Edit values-dev.yaml with your settings

helm upgrade --install storybook . \
  --namespace development \
  --create-namespace \
  -f values-dev.yaml \
  --set image.tag=develop

# Production
helm upgrade --install storybook . \
  --namespace production \
  --create-namespace \
  -f values-prod.yaml \
  --set image.tag=v0.1.0
```

### Helm Values

| Value                         | Default                              | Description    |
| ----------------------------- | ------------------------------------ | -------------- |
| `replicaCount`                | 1                                    | Number of pods |
| `image.repository`            | gitea.girok.dev/beegy-labs/storybook | Image registry |
| `image.tag`                   | Chart.AppVersion                     | Image version  |
| `ingress.enabled`             | true                                 | Enable ingress |
| `ingress.hosts[0].host`       | design.example.com                   | Domain name    |
| `resources.limits.cpu`        | 100m                                 | CPU limit      |
| `resources.limits.memory`     | 64Mi                                 | Memory limit   |
| `autoscaling.enabled`         | false                                | Enable HPA     |
| `podDisruptionBudget.enabled` | true                                 | Enable PDB     |

### Security Context

```yaml
podSecurityContext:
  fsGroup: 101
  runAsNonRoot: true
  runAsUser: 101
  seccompProfile:
    type: RuntimeDefault

securityContext:
  allowPrivilegeEscalation: false
  capabilities:
    drop:
      - ALL
```

## CI/CD Pipeline

Automated via `.github/workflows/ci-storybook.yml`.

### Triggers

| Trigger           | Action                        |
| ----------------- | ----------------------------- |
| Push to `develop` | Build + Deploy to development |
| Tag `ui-v*`       | Build + Deploy to production  |
| PR (paths match)  | Build only                    |
| Manual dispatch   | Optional deployment           |

### Pipeline Jobs

```
build ──> docker ──> deploy-k8s
   │         │           │
   │         │           └── helm upgrade
   │         └── push to Harbor
   └── build storybook static
```

### Versioning

```bash
# Create release
git tag ui-v0.1.0
git push origin ui-v0.1.0

# Triggers:
# - Docker image: gitea.girok.dev/beegy-labs/storybook:0.1.0
# - K8s deploy: production namespace
# - URL: https://design.girok.dev
```

## URLs

| Environment | URL                          | Trigger           |
| ----------- | ---------------------------- | ----------------- |
| Development | https://design-dev.girok.dev | Push to `develop` |
| Production  | https://design.girok.dev     | Tag `ui-v*`       |

## Health Checks

```bash
# Liveness/Readiness probe
curl http://localhost:6006/health
# Returns: OK (200)
```

## Resource Requirements

Storybook serves static files only - very lightweight:

| Resource | Request | Limit |
| -------- | ------- | ----- |
| CPU      | 10m     | 100m  |
| Memory   | 32Mi    | 64Mi  |

## Troubleshooting

### Build Fails

```bash
# Check design tokens build
pnpm --filter @my-girok/design-tokens build

# Check ui-components build
pnpm --filter @my-girok/ui-components build

# Build storybook with verbose
pnpm --filter @my-girok/ui-components build-storybook --debug
```

### Docker Build Issues

```bash
# Build with no cache
docker build --no-cache -t storybook:test -f apps/storybook/Dockerfile .

# Check build logs
docker build --progress=plain -t storybook:test -f apps/storybook/Dockerfile .
```

### Kubernetes Issues

```bash
# Check pod status
kubectl get pods -n development -l app.kubernetes.io/name=storybook

# Check logs
kubectl logs -n development -l app.kubernetes.io/name=storybook

# Describe pod for events
kubectl describe pod -n development -l app.kubernetes.io/name=storybook

# Port forward for local testing
kubectl port-forward -n development svc/storybook 6006:80
```

## References

| Document                                         | Content                 |
| ------------------------------------------------ | ----------------------- |
| [ui-components.md](../packages/ui-components.md) | Component documentation |
| [design-tokens.md](../packages/design-tokens.md) | SSOT design tokens      |
| [ssot.md](../ssot.md)                            | SSOT strategy           |

## Version

**V0.0.1 AAA Workstation** (2025-12)

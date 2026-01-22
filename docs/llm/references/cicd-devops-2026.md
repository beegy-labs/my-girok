# CI/CD & DevOps - 2026 Best Practices

> GitHub Actions, GitOps, automation | **Updated**: 2026-01-22

## GitHub Actions Best Practices

### Workflow Structure

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm lint

  test:
    runs-on: ubuntu-latest
    needs: lint # Sequential dependency
    strategy:
      matrix:
        node: [20, 22] # Matrix builds
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
      - run: pnpm test

  build:
    runs-on: ubuntu-latest
    needs: [lint, test] # Parallel dependencies
    steps:
      - uses: actions/checkout@v4
      - run: pnpm build
```

### Key Principles

| Principle          | Implementation                          |
| ------------------ | --------------------------------------- |
| Modular workflows  | Reusable workflows with `workflow_call` |
| Clear dependencies | Use `needs` keyword                     |
| Secrets management | GitHub Secrets, never hardcode          |
| Caching            | `actions/cache` for dependencies        |
| Matrix builds      | Test across versions/platforms          |

### Action Versioning

```yaml
# ✅ Pin to major version (recommended)
- uses: actions/checkout@v4

# ✅ Pin to commit SHA (most secure)
- uses: actions/checkout@8ade135a41bc03ea155e62e844d188df1ea18608

# ❌ Avoid: latest or unversioned
- uses: actions/checkout
```

### Caching Strategy

```yaml
- name: Setup pnpm
  uses: pnpm/action-setup@v4

- name: Get pnpm store directory
  id: pnpm-cache
  run: echo "dir=$(pnpm store path)" >> $GITHUB_OUTPUT

- name: Cache pnpm
  uses: actions/cache@v4
  with:
    path: ${{ steps.pnpm-cache.outputs.dir }}
    key: ${{ runner.os }}-pnpm-${{ hashFiles('**/pnpm-lock.yaml') }}
    restore-keys: ${{ runner.os }}-pnpm-
```

## Security Integration

### Dependency Scanning

```yaml
- name: Dependency Review
  uses: actions/dependency-review-action@v4
  if: github.event_name == 'pull_request'

- name: Snyk Security
  uses: snyk/actions/node@master
  env:
    SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

### CodeQL (SAST)

```yaml
- name: Initialize CodeQL
  uses: github/codeql-action/init@v3
  with:
    languages: javascript, typescript

- name: CodeQL Analysis
  uses: github/codeql-action/analyze@v3
```

## GitOps with ArgoCD

### Architecture

```
GitHub Repository (SSOT)
        ↓
   ArgoCD Watches
        ↓
  Kubernetes Cluster
        ↓
   Application Deployed
```

### Best Practices

| Practice    | Description                  |
| ----------- | ---------------------------- |
| Declarative | Git = desired state          |
| Versioned   | All changes tracked          |
| Auditable   | Git history = audit log      |
| Automated   | Auto-sync or manual approval |

### ArgoCD Application

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
spec:
  project: default
  source:
    repoURL: https://github.com/org/repo
    targetRevision: HEAD
    path: k8s/overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## CI/CD Tools Comparison (2026)

| Tool           | Strength            | Use Case        |
| -------------- | ------------------- | --------------- |
| GitHub Actions | GitHub integration  | Most projects   |
| GitLab CI      | All-in-one platform | GitLab users    |
| Jenkins        | Flexibility         | Legacy, complex |
| CircleCI       | Performance         | High volume     |
| ArgoCD         | GitOps              | Kubernetes      |

## Pipeline Patterns

### Trunk-Based Development

```
main ─────●─────●─────●─────●─────→
          │     │     │     │
        feat  feat  feat  feat
        (short-lived branches)
```

### GitFlow (Enterprise)

```
main ─────────────────●─────────────→
                      ↑
release ─────────●────┘
                 ↑
develop ──●──●───┴───●──●──●───→
```

## Deployment Strategies

| Strategy   | Risk     | Rollback |
| ---------- | -------- | -------- |
| Rolling    | Low      | Gradual  |
| Blue-Green | Low      | Instant  |
| Canary     | Very Low | Gradual  |
| Recreate   | High     | Manual   |

### Canary Deployment

```yaml
# Argo Rollouts
spec:
  strategy:
    canary:
      steps:
        - setWeight: 10
        - pause: { duration: 5m }
        - setWeight: 50
        - pause: { duration: 10m }
        - setWeight: 100
```

## Monitoring & Observability

| Layer   | Tool                |
| ------- | ------------------- |
| Metrics | Prometheus, Grafana |
| Logs    | Loki, ELK           |
| Traces  | Jaeger, Tempo       |
| Alerts  | AlertManager        |

## Sources

- [GitHub Actions Best Practices](https://graphite.dev/guides/in-depth-guide-ci-cd-best-practices)
- [GitHub Actions CI/CD - NetApp](https://www.netapp.com/learn/cvo-blg-5-github-actions-cicd-best-practices/)
- [Best CI/CD Tools 2026](https://spacelift.io/blog/ci-cd-tools)
- [GitHub Copilot CI/CD Instructions](https://github.com/github/awesome-copilot/blob/main/instructions/github-actions-ci-cd-best-practices.instructions.md)

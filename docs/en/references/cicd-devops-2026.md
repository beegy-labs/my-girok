# CI/CD & DevOps Best Practices - 2026

This guide covers CI/CD and DevOps best practices as of 2026, focusing on GitHub Actions, GitOps with ArgoCD, and deployment automation strategies.

## GitHub Actions Best Practices

### Workflow Structure

A well-structured workflow separates concerns and uses proper dependencies:

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

| Principle          | Implementation                             |
| ------------------ | ------------------------------------------ |
| Modular workflows  | Use `workflow_call` for reusable workflows |
| Clear dependencies | Use `needs` keyword to define job order    |
| Secrets management | GitHub Secrets, never hardcode credentials |
| Caching            | Use `actions/cache` for dependencies       |
| Matrix builds      | Test across versions and platforms         |

### Action Versioning

```yaml
# Recommended: Pin to major version
- uses: actions/checkout@v4

# Most secure: Pin to commit SHA
- uses: actions/checkout@8ade135a41bc03ea155e62e844d188df1ea18608

# Avoid: Unversioned or 'latest'
- uses: actions/checkout # Risky
```

### Caching Strategy

```yaml
- name: Setup pnpm
  uses: pnpm/action-setup@v4

- name: Get pnpm store directory
  id: pnpm-cache
  run: echo "dir=$(pnpm store path)" >> $GITHUB_OUTPUT

- name: Cache pnpm dependencies
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

- name: Snyk Security Scan
  uses: snyk/actions/node@master
  env:
    SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

### CodeQL Static Analysis

```yaml
- name: Initialize CodeQL
  uses: github/codeql-action/init@v3
  with:
    languages: javascript, typescript

- name: Run CodeQL Analysis
  uses: github/codeql-action/analyze@v3
```

## GitOps with ArgoCD

### Architecture Overview

```
GitHub Repository (Single Source of Truth)
        ↓
   ArgoCD Watches for Changes
        ↓
  Kubernetes Cluster
        ↓
   Application Deployed
```

### GitOps Principles

| Practice    | Description                            |
| ----------- | -------------------------------------- |
| Declarative | Git represents desired state           |
| Versioned   | All changes tracked in version control |
| Auditable   | Git history serves as audit log        |
| Automated   | Auto-sync or manual approval workflows |

### ArgoCD Application Example

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

| Tool           | Strength                     | Best For                  |
| -------------- | ---------------------------- | ------------------------- |
| GitHub Actions | GitHub ecosystem integration | Most projects             |
| GitLab CI      | All-in-one platform          | GitLab users              |
| Jenkins        | Maximum flexibility          | Legacy, complex pipelines |
| CircleCI       | Performance and speed        | High-volume builds        |
| ArgoCD         | GitOps native                | Kubernetes deployments    |

## Pipeline Patterns

### Trunk-Based Development

Best for teams practicing continuous deployment:

```
main ─────●─────●─────●─────●─────→
          │     │     │     │
        feat  feat  feat  feat
        (short-lived branches, <1 day)
```

### GitFlow (Enterprise)

Better for scheduled releases and multiple supported versions:

```
main ─────────────────●─────────────→
                      ↑
release ─────────●────┘
                 ↑
develop ──●──●───┴───●──●──●───→
```

## Deployment Strategies

| Strategy   | Risk     | Rollback Speed | Use Case                   |
| ---------- | -------- | -------------- | -------------------------- |
| Rolling    | Low      | Gradual        | Most applications          |
| Blue-Green | Low      | Instant        | Zero-downtime critical     |
| Canary     | Very Low | Gradual        | Risk-sensitive deployments |
| Recreate   | High     | Manual         | Development environments   |

### Canary Deployment with Argo Rollouts

```yaml
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

| Layer   | Tools                   |
| ------- | ----------------------- |
| Metrics | Prometheus, Grafana     |
| Logs    | Loki, ELK Stack         |
| Traces  | Jaeger, Tempo           |
| Alerts  | AlertManager, PagerDuty |

## Sources

- [GitHub Actions Best Practices - Graphite](https://graphite.dev/guides/in-depth-guide-ci-cd-best-practices)
- [GitHub Actions CI/CD - NetApp](https://www.netapp.com/learn/cvo-blg-5-github-actions-cicd-best-practices/)
- [Best CI/CD Tools 2026](https://spacelift.io/blog/ci-cd-tools)
- [GitHub Copilot CI/CD Instructions](https://github.com/github/awesome-copilot/blob/main/instructions/github-actions-ci-cd-best-practices.instructions.md)

---

_Last Updated: 2026-01-22_

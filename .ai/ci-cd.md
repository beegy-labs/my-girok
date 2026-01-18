# CI/CD Quick Reference

> GitHub Actions → Gitea → ArgoCD → Kubernetes | **Last Updated**: 2026-01-18

## Pipeline

| Component   | Tool                                |
| ----------- | ----------------------------------- |
| CI          | GitHub Actions                      |
| Registry    | Gitea (gitea.girok.dev)             |
| Proto Cache | Gitea Generic Packages (hash-based) |
| CD          | ArgoCD                              |

## Image Tags

| Branch     | Tag              |
| ---------- | ---------------- |
| develop    | `develop:<hash>` |
| release/\* | `release:<hash>` |
| main       | `latest`         |

## Environment Mapping

| Branch     | Namespace        | Deploy |
| ---------- | ---------------- | ------ |
| develop    | my-girok-dev     | Auto   |
| release/\* | my-girok-staging | Manual |
| main       | my-girok-prod    | Manual |

## Proto Caching

| Aspect   | Detail                   |
| -------- | ------------------------ |
| Registry | Gitea Generic Packages   |
| Hash     | SHA256 (12 chars)        |
| Build    | 33s (when needed)        |
| Download | 15s (cached)             |
| Speedup  | 59-67% CI time reduction |

**Proto policy**: `docs/llm/policies/proto-caching.md`

## Local Build

```bash
docker build -t test/auth-service:local -f services/auth-service/Dockerfile .
```

**SSOT**: `docs/llm/policies/github-actions-workflows.md`

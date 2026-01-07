# CI/CD Quick Reference

> GitHub Actions → Harbor → ArgoCD → Kubernetes | **Last Updated**: 2026-01-06

## Pipeline

| Component | Tool                      |
| --------- | ------------------------- |
| CI        | GitHub Actions            |
| Registry  | Harbor (harbor.girok.dev) |
| CD        | ArgoCD                    |

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

## Local Build

```bash
docker build -t test/auth-service:local -f services/auth-service/Dockerfile .
```

---

**Full guide**: `docs/CI_CD.md`

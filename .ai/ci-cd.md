# CI/CD Quick Reference

> GitHub Actions → Gitea → ArgoCD → K8s | **Last Updated**: 2026-01-18

| Component   | Tool                    | Detail             |
| ----------- | ----------------------- | ------------------ |
| CI          | GitHub Actions          | Self-hosted runner |
| Registry    | Gitea (gitea.girok.dev) | Docker + Proto pkg |
| Proto Cache | Generic Packages        | 59-67% faster ✅   |
| CD          | ArgoCD                  | GitOps sync        |

## Environments

| Branch     | Tag              | Namespace        | Deploy |
| ---------- | ---------------- | ---------------- | ------ |
| develop    | `develop:<hash>` | my-girok-dev     | Auto   |
| release/\* | `release:<hash>` | my-girok-staging | Manual |
| main       | `latest`         | my-girok-prod    | Manual |

**Proto**: `docs/llm/policies/proto-caching.md`
**Workflows**: `docs/llm/policies/github-actions-workflows.md`

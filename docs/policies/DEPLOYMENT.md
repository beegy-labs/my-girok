# Deployment Guide

> Kubernetes deployment with Cilium Gateway API

## Environments

| Environment | Platform       | Trigger         |
| ----------- | -------------- | --------------- |
| Local       | Docker Compose | Manual          |
| Staging     | Kubernetes     | Push to develop |
| Production  | Kubernetes     | Push to main    |

## Namespace Strategy

| Namespace     | Purpose                                 |
| ------------- | --------------------------------------- |
| gateway       | Cilium Gateway, GraphQL BFF, WS Gateway |
| services      | Domain services (auth, personal, etc.)  |
| data          | PostgreSQL, MongoDB, Valkey, NATS       |
| observability | Prometheus, Grafana, Jaeger             |

## Secrets Management

### Sealed Secrets (Recommended)

```bash
# Create and seal secret
kubectl create secret generic auth-secrets \
  --from-literal=JWT_SECRET=xxx \
  --dry-run=client -o yaml > /tmp/secret.yaml

kubeseal --format yaml < /tmp/secret.yaml > k8s/secrets/auth-sealed.yaml
rm /tmp/secret.yaml  # Delete original!
```

**Rules:**

- ✅ Use Sealed Secrets or External Secrets Operator
- ✅ Different secrets per environment
- ❌ Never commit plain Secrets to Git

## Kustomize Deployment

```bash
kubectl apply -k k8s/overlays/staging     # Staging
kubectl apply -k k8s/overlays/production  # Production
kubectl rollout restart deployment/auth-service -n services
kubectl rollout status deployment/auth-service -n services
```

## Database Migration (goose + ArgoCD)

```
services/<service>/migrations/*.sql → Docker Image → ArgoCD PreSync Job → App Deploy
```

```bash
kubectl logs job/<service>-migrate -n dev-my-girok  # Check migration
```

## Checklist

### Before Deploy

- [ ] Docker images pushed
- [ ] goose migrations in image
- [ ] Sealed Secrets created
- [ ] `migration.enabled: true` in Helm values

### During Deploy

- [ ] Manual Sync for DB changes
- [ ] Monitor PreSync Job in ArgoCD
- [ ] Check migration logs

### After Deploy

- [ ] Verify `goose_db_version` table
- [ ] Check pod logs
- [ ] Test endpoints

---

**Full k8s examples**: See [.ai/helm-deployment.md](../../.ai/helm-deployment.md)

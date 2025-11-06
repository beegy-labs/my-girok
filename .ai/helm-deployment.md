# Helm Deployment Quick Reference

## Files Structure

```
helm/
├── Chart.yaml
├── values.yaml.example     # Git committed (example only)
├── values.yaml            # Gitignored (user creates)
├── templates/
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── hpa.yaml
│   ├── serviceaccount.yaml
│   ├── sealed-secret.yaml # Template only
│   └── _helpers.tpl
└── README.md
```

## User Workflow

```bash
# 1. Setup
cd services/auth-service/helm
cp values.yaml.example values.yaml
nano values.yaml  # Update domains, replicas, resources

# 2. Create Sealed Secrets
kubectl create secret generic my-girok-auth-service-secret \
  --from-literal=database-url="postgresql://..." \
  --from-literal=jwt-secret="..." \
  --dry-run=client -o yaml | \
kubeseal --format yaml > sealed-secret.yaml

# 3. Deploy
helm install my-girok-auth . -f values.yaml -n my-girok --create-namespace

# 4. Check
helm status my-girok-auth -n my-girok
kubectl get pods -n my-girok
```

## Key Points

- ✅ Example values in git
- ✅ Actual values gitignored
- ✅ Use Sealed Secrets for production
- ✅ Separate values per environment (values-dev.yaml, values-prod.yaml)

## Environment-Specific

Users create multiple values files:
- `values-dev.yaml` - 1 replica, lower resources
- `values-staging.yaml` - 2 replicas, medium resources
- `values-prod.yaml` - 3+ replicas, full resources, anti-affinity

```bash
helm install my-girok-auth . -f values.yaml -f values-prod.yaml
```

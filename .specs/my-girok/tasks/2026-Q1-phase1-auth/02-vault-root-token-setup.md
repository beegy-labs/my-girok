# Task 02: Vault Root Token Setup

> Securely configure Vault root token in Kubernetes

## Goal

Store Vault root token as Kubernetes Secret for External Secrets Operator integration.

## Prerequisites

- [x] Task 01 completed (Database Audit)
- [ ] kubectl configured for target cluster
- [ ] Vault root token available (provided by user)

## Security Requirements

⚠️ **CRITICAL**:

- **NEVER** commit Vault root token to git
- **NEVER** save token in `.specs/`, `docs/`, or any tracked files
- **NEVER** include token in PR descriptions or comments
- ✅ Token stored ONLY in Kubernetes Secret via kubectl

## Steps

### 1. Verify kubectl Context

```bash
# Check current context
kubectl config current-context

# Expected: home cluster or dev cluster
# If wrong context, switch:
# kubectl config use-context <correct-context>
```

### 2. Check Vault Deployment

```bash
# Verify Vault pod is running
kubectl get pods -n vault

# Expected output:
# NAME                     READY   STATUS    RESTARTS   AGE
# vault-0                  1/1     Running   0          XXd

# Verify Vault service
kubectl get svc -n vault vault

# Expected: vault service on port 8200
```

### 3. Create Vault Root Token Secret

⚠️ **DO NOT** run this command in a tracked directory or where shell history is saved to git.

```bash
# Set token as environment variable (USER MUST PROVIDE ACTUAL TOKEN)
export VAULT_ROOT_TOKEN="<vault-root-token-provided-by-admin>"

# Create Kubernetes secret
kubectl create secret generic vault-token \
  --from-literal=token="${VAULT_ROOT_TOKEN}" \
  -n vault \
  --dry-run=client -o yaml | kubectl apply -f -

# Clear the environment variable immediately
unset VAULT_ROOT_TOKEN

# Verify secret created
kubectl get secret vault-token -n vault
```

### 4. Verify ClusterSecretStore

```bash
# Check if ClusterSecretStore exists
kubectl get clustersecretstore vault-backend

# If not found, check External Secrets Operator
kubectl get pods -n external-secrets

# Expected: external-secrets-operator pod running
```

### 5. Test Vault Connection

```bash
# Port-forward to Vault
kubectl port-forward -n vault svc/vault 8200:8200 &

# Test connection (in another terminal)
export VAULT_ADDR="https://vault.girok.dev"
export VAULT_TOKEN="<vault-root-token-provided-by-admin>"

# List secrets (should work if token is valid)
vault secrets list

# Expected output:
# Path          Type         Description
# ----          ----         -----------
# cubbyhole/    cubbyhole    per-token private secret storage
# identity/     identity     identity store
# secret/       kv           key/value secret storage
# sys/          system       system endpoints used for control...

# Clean up
unset VAULT_TOKEN
unset VAULT_ADDR
pkill -f "port-forward.*vault"
```

## Verification

- [ ] Kubernetes secret `vault-token` created in `vault` namespace
- [ ] ClusterSecretStore `vault-backend` exists
- [ ] Vault connection test successful
- [ ] No secrets committed to git

## Troubleshooting

### Issue: kubectl not configured

```bash
# Get kubeconfig from cluster admin
# Then:
export KUBECONFIG=/path/to/kubeconfig
kubectl config use-context <cluster-name>
```

### Issue: ClusterSecretStore not found

```bash
# Install External Secrets Operator
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets \
  external-secrets/external-secrets \
  -n external-secrets \
  --create-namespace

# Create ClusterSecretStore
kubectl apply -f - <<EOF
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: vault-backend
spec:
  provider:
    vault:
      server: "https://vault.girok.dev"
      path: "secret"
      version: "v2"
      auth:
        tokenSecretRef:
          name: vault-token
          namespace: vault
          key: token
EOF
```

### Issue: Vault token invalid

Check Vault UI or logs:

```bash
kubectl logs -n vault vault-0 | tail -50
```

Verify token with vault CLI:

```bash
vault token lookup
```

## Recovery Keys

⚠️ **Store recovery keys securely** (NOT in git):

- Use password manager (1Password, LastPass, etc.)
- Store in secure vault (HashiCorp Vault, AWS Secrets Manager)
- Physical secure storage for critical environments

Recovery keys provided:

- Count: 5 keys
- Threshold: 3 keys required to unseal
- **DO NOT** include actual key values in this file

## Next Steps

→ Task 03: Seed File Modification

# Auth BFF Helm Chart

Authentication Backend-For-Frontend (BFF) service for my-girok.

## Overview

This chart deploys the auth-bff service which provides:

- Session-based authentication (REST API)
- OAuth 2.0 integration (Google, Kakao, Naver, Apple)
- gRPC proxy to backend services (identity, auth, legal, audit)
- Rate limiting and security features

## Prerequisites

- Kubernetes 1.25+
- Helm 3.0+
- [Sealed Secrets](https://github.com/bitnami-labs/sealed-secrets) controller installed
- Backend services deployed (identity-service, auth-service, legal-service, audit-service)
- Valkey/Redis for session storage

## Installation

### 1. Create values file

```bash
cp values.yaml.example values.yaml
# Edit values.yaml with your configuration
```

### 2. Create Sealed Secret

```bash
# Create secret
kubectl create secret generic my-girok-auth-bff-secret \
  --from-literal=session-secret="$(openssl rand -base64 32)" \
  --from-literal=encryption-key="$(openssl rand -base64 32)" \
  --from-literal=valkey-password="your-redis-password" \
  --from-literal=google-client-id="your-google-client-id" \
  --from-literal=google-client-secret="your-google-secret" \
  --dry-run=client -o yaml > secret.yaml

# Seal the secret
kubeseal --format yaml < secret.yaml > templates/sealed-secret.yaml
rm secret.yaml
```

### 3. Install chart

```bash
helm install auth-bff . -f values.yaml
```

## Configuration

### Required Secrets

| Key              | Description                         |
| ---------------- | ----------------------------------- |
| `session-secret` | 32+ char key for session encryption |
| `encryption-key` | 32+ char key for data encryption    |

### Optional Secrets (OAuth)

| Key                    | Description                |
| ---------------------- | -------------------------- |
| `google-client-id`     | Google OAuth client ID     |
| `google-client-secret` | Google OAuth client secret |
| `kakao-client-id`      | Kakao OAuth client ID      |
| `kakao-client-secret`  | Kakao OAuth client secret  |
| `naver-client-id`      | Naver OAuth client ID      |
| `naver-client-secret`  | Naver OAuth client secret  |
| `apple-client-id`      | Apple Service ID           |
| `apple-team-id`        | Apple Team ID              |
| `apple-key-id`         | Apple Key ID               |
| `apple-private-key`    | Apple private key (PEM)    |

### Key Values

| Parameter                | Description           | Default               |
| ------------------------ | --------------------- | --------------------- |
| `replicaCount`           | Number of replicas    | `2`                   |
| `app.port`               | Service port          | `4005`                |
| `app.session.maxAge`     | Session TTL (ms)      | `604800000` (7 days)  |
| `app.session.sameSite`   | Cookie SameSite       | `strict`              |
| `app.grpc.identity.host` | Identity service host | `identity-service...` |
| `app.grpc.auth.host`     | Auth service host     | `auth-service...`     |

## Security Features

- **Session encryption**: All sessions encrypted with SESSION_SECRET
- **Data encryption**: Sensitive data encrypted with ENCRYPTION_KEY
- **Rate limiting**: Configurable per-IP and per-account limits
- **Secure cookies**: HttpOnly, Secure, SameSite=Strict
- **Pod security**: Non-root user, read-only filesystem

## Upgrading

```bash
helm upgrade auth-bff . -f values.yaml
```

## Uninstalling

```bash
helm uninstall auth-bff
```

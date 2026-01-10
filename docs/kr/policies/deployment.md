# 배포 정책

> Kubernetes 배포는 Helm, ArgoCD, Sealed Secrets를 사용합니다

## 환경

| 환경     | 플랫폼         | 트리거          | 동기화 모드 |
| -------- | -------------- | --------------- | ----------- |
| 로컬     | Docker Compose | 수동            | -           |
| 개발     | Kubernetes     | Push to develop | 자동        |
| 스테이징 | Kubernetes     | Push to release | 수동        |
| 프로덕션 | Kubernetes     | Push to main    | 수동        |

## Kubernetes 네임스페이스

| 네임스페이스  | 목적                                   |
| ------------- | -------------------------------------- |
| gateway       | Cilium Gateway, GraphQL BFF, WebSocket |
| services      | auth, personal, identity, etc.         |
| data          | PostgreSQL, Valkey, ClickHouse         |
| observability | Prometheus, Grafana, Jaeger            |

## Helm 차트 구조

```
services/<service>/helm/
├── Chart.yaml
├── values.yaml.example       # Committed (example values)
├── values.yaml               # Gitignored (local overrides)
├── values-dev.yaml           # Development values
├── values-staging.yaml       # Staging values
├── values-prod.yaml          # Production values
└── templates/
    ├── deployment.yaml
    ├── service.yaml
    ├── ingress.yaml
    ├── hpa.yaml
    ├── sealed-secret.yaml
    └── migration-job.yaml    # ArgoCD PreSync hook
```

## Sealed Secrets

Kubernetes용 비밀을 생성하고 봉인합니다:

```bash
# Create secret YAML (locally, never commit)
kubectl create secret generic auth-secrets \
  --from-literal=DATABASE_URL='postgresql://user:pass@host:5432/db' \
  --from-literal=JWT_SECRET='your-secret-key' \
  --dry-run=client -o yaml > /tmp/secret.yaml

# Seal the secret
kubeseal --format yaml < /tmp/secret.yaml > helm/templates/sealed-secret.yaml

# Clean up plaintext
rm /tmp/secret.yaml
```

## Database Migration Job

데이터베이스 마이그레이션용 ArgoCD PreSync 훅:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: {{ .Release.Name }}-migrate
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
    argocd.argoproj.io/sync-wave: "-5"
spec:
  ttlSecondsAfterFinished: 300
  backoffLimit: 3
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: migrate
          image: {{ .Values.image.repository }}:{{ .Values.image.tag }}
          command:
            - /bin/sh
            - -c
            - goose -dir /app/services/{{ .Values.service.name }}/migrations postgres "$DATABASE_URL" up
          envFrom:
            - secretRef:
                name: {{ .Values.service.name }}-secrets
```

## Identity Service Multi-DB Migrations

여러 데이터베이스를 사용하는 서비스의 경우, sync wave를 사용합니다:

| 단계 | 데이터베이스 | Sync Wave |
| ---- | ------------ | --------- |
| 1    | identity_db  | -5        |
| 2    | auth_db      | -4        |
| 3    | legal_db     | -3        |

## 배포 명령어

### Kustomize

```bash
# Apply overlay
kubectl apply -k k8s/overlays/staging
kubectl apply -k k8s/overlays/production
```

### Helm

```bash
# Install/upgrade with environment values
helm install auth-service . -f values.yaml -f values-prod.yaml -n services
helm upgrade auth-service . -f values.yaml -f values-prod.yaml -n services
```

## Rollout Management

```bash
# Restart deployment
kubectl rollout restart deployment/auth-service -n services

# Check status
kubectl rollout status deployment/auth-service -n services

# Rollback
kubectl rollout undo deployment/auth-service -n services
```

## 배포 체크리스트

### 배포 전

- [ ] Docker 이미지가 빌드되고 레지스트리에 푸시되었습니다.
- [ ] goose 마이그레이션이 이미지에 포함되었습니다.
- [ ] Sealed Secrets가 생성되고 커밋되었습니다.
- [ ] values에 `migration.enabled: true`가 설정되었습니다.

### 배포 중

- [ ] 데이터베이스 변경에 대해 수동 Sync를 사용합니다.
- [ ] PreSync 마이그레이션 작업을 모니터링합니다.
- [ ] 마이그레이션 로그를 확인합니다: `kubectl logs job/<service>-migrate -n services`

### 배포 후

- [ ] `goose_db_version` 테이블이 업데이트되었습니다.
- [ ] 포드 로그가 깨끗합니다.
- [ ] API 엔드포인트를 테스트합니다.
- [ ] 헬스 체크가 통과되었습니다.

## Troubleshooting

| 문제                             | 해결책                                           |
| -------------------------------- | ------------------------------------------------ |
| 마이그레이션 작업이 실패했습니다 | `kubectl logs job/<service>-migrate -n services` |
| 포드가 시작되지 않습니다         | `kubectl describe pod <pod-name> -n services`    |
| 비밀을 찾을 수 없습니다          | Verify sealed-secret is applied                  |
| 이미지 풀 실패                   | Check imagePullSecrets configuration             |

---

**LLM Reference**: `docs/llm/policies/DEPLOYMENT.md`

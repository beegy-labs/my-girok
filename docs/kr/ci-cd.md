# CI/CD 파이프라인

> GitHub Actions + Gitea Registry + ArgoCD 배포 파이프라인

## 스택 개요

| Component | Tool                    |
| --------- | ----------------------- |
| CI        | GitHub Actions          |
| Registry  | Gitea (gitea.girok.dev) |
| CD        | ArgoCD                  |

## 워크플로우

```
Developer Push -> GitHub Actions -> Gitea Registry -> ArgoCD -> Kubernetes
```

## 이미지 태깅 전략

| Branch     | Tag Format         | Example         |
| ---------- | ------------------ | --------------- |
| develop    | `develop-<sha>`    | develop-a1b2c3d |
| release/\* | `release-<sha>`    | release-e4f5g6h |
| main       | `<sha>` + `latest` | a1b2c3d, latest |

## 환경 매핑

| Environment | Branch     | Namespace        | Sync Mode |
| ----------- | ---------- | ---------------- | --------- |
| Development | develop    | my-girok-dev     | Auto      |
| Staging     | release/\* | my-girok-staging | Manual    |
| Production  | main       | my-girok-prod    | Manual    |

## 워크플로우

### Auth Service CI

**트리거**: develop, release/**, main에 푸시 (경로: services/auth-service/**)

**작업**:

1. Test - 단위 및 통합 테스트 실행
2. Build - Docker 이미지 빌드
3. Push - 레지스트리로 푸시
4. Cleanup - 오래된 이미지 제거

### Web-Main CI (병렬 실행)

**병렬 작업**:

- lint - ESLint 검사
- type-check - TypeScript 검증
- test - Jest 테스트

**순차 작업**:

- build - 프로덕션 빌드 (모든 병렬 작업이 통과 후)

**성능**: 총 ~3-5분 (순차 대비 2-3배 빠름)

## 캐싱 구성

```yaml
# pnpm cache
key: ${{ runner.os }}-node-modules-${{ hashFiles('**/pnpm-lock.yaml') }}

# Docker layer cache
cache-to: type=registry,ref=harbor.girok.dev/my-girok/<service>:buildcache
```

## ArgoCD 이미지 업데이터

```yaml
annotations:
  argocd-image-updater.argoproj.io/image-list: myimage=harbor.girok.dev/my-girok/auth-service
  argocd-image-updater.argoproj.io/myimage.update-strategy: digest
  argocd-image-updater.argoproj.io/myimage.allow-tags: regexp:^develop-.*$
```

## 초기 설정

### GitHub Secrets

```bash
HARBOR_REGISTRY=harbor.girok.dev
HARBOR_USERNAME=robot$my-girok+ci-builder
HARBOR_PASSWORD=<robot-token>
```

### Kubernetes ImagePullSecret

```bash
kubectl create secret docker-registry harbor-regcred \
  --docker-server=harbor.girok.dev \
  --docker-username='robot$my-girok+ci-builder' \
  --docker-password='<token>' \
  --namespace=my-girok-dev
```

## 문제 해결

| 이슈                       | 해결책                                                |
| -------------------------- | ----------------------------------------------------- |
| Harbor에 연결할 수 없음    | GitHub Secrets 설정 확인                              |
| 권한 거부                  | 로봇 계정이 Push Artifact 권한을 가지고 있는지 확인   |
| 이미지가 업데이트되지 않음 | ArgoCD Image Updater 로그를 확인하여 동기화 문제 확인 |

---

**LLM Reference**: `docs/llm/CI_CD.md`

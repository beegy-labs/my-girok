# CI/CD 파이프라인

> GitHub Actions + Gitea Registry + ArgoCD

## 스택

| 구성 요소  | 도구                    |
| ---------- | ----------------------- |
| CI         | GitHub Actions          |
| 레지스트리 | Gitea (gitea.girok.dev) |
| CD         | ArgoCD                  |

## 워크플로우

```
개발자 푸시 → GitHub Actions → Gitea Registry → ArgoCD → Kubernetes
```

## 이미지 태깅

| 브랜치     | 태그 형식                   | 예시                |
| ---------- | --------------------------- | ------------------- |
| develop    | `develop-<sha>` + `develop` | `develop-a1b2c3d`   |
| release/\* | `release-<sha>` + `release` | `release-e4f5g6h`   |
| main       | `<sha>` + `latest`          | `a1b2c3d`, `latest` |

## 이미지 보존 정책

| 환경     | 최대 이미지 수 | 특별 태그 |
| -------- | -------------- | --------- |
| 개발     | 10             | `develop` |
| 스테이징 | 10             | `release` |
| 프로덕션 | 10             | `latest`  |

## 워크플로우

### Auth Service CI

**트리거**: `develop`, `release/**`, `main`으로 푸시 (파일: `services/auth-service/**`)

**작업**: 테스트 → 빌드 → 푸시 → 정리

### Web-Main CI (병렬)

**작업** (병렬 실행):

- lint: ESLint
- type-check: TypeScript
- test: Vitest
- build: 모두 통과 후 → Docker 푸시

**성능**: 약 3-5분 (순차 실행 대비 2-3배 빠름)

## 캐싱

```yaml
# Node 모듈 캐시 (Web-Main)
key: ${{ runner.os }}-node-modules-${{ hashFiles('**/pnpm-lock.yaml') }}
paths:
  - node_modules
  - apps/web-main/node_modules

# Docker 빌드 캐시
cache-to: type=registry,ref=harbor.girok.dev/my-girok/<service>:buildcache,mode=max
```

## ArgoCD

### 환경 매핑

| 환경     | 브랜치     | 네임스페이스     | 동기화 |
| -------- | ---------- | ---------------- | ------ |
| 개발     | develop    | my-girok-dev     | 자동   |
| 스테이징 | release/\* | my-girok-staging | 수동   |
| 프로덕션 | main       | my-girok-prod    | 수동   |

### 이미지 업데이트기

```yaml
annotations:
  argocd-image-updater.argoproj.io/image-list: myimage=harbor.girok.dev/my-girok/auth-service
  argocd-image-updater.argoproj.io/myimage.update-strategy: digest
  argocd-image-updater.argoproj.io/myimage.allow-tags: regexp:^develop-.*$
```

## 설정

### GitHub Secrets

```
HARBOR_REGISTRY=harbor.girok.dev
HARBOR_USERNAME=robot$my-girok+ci-builder
HARBOR_PASSWORD=<robot-token>
```

### K8s ImagePullSecret

```bash
kubectl create secret docker-registry harbor-regcred \
  --docker-server=harbor.girok.dev \
  --docker-username='robot$my-girok+ci-builder' \
  --docker-password='<token>' \
  --namespace=my-girok-dev
```

## 문제 해결

| 문제                       | 해결책                                                      |
| -------------------------- | ----------------------------------------------------------- |
| Harbor에 연결할 수 없음    | GitHub Secrets 확인, `curl https://harbor.girok.dev` 테스트 |
| 권한 거부                  | 로봇 계정에 Push Artifact 권한이 있는지 확인                |
| 이미지가 업데이트되지 않음 | ArgoCD Image Updater 로그 확인, 태그 패턴 확인              |

```bash
# Image Updater 로그 확인
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-image-updater
```

---

**빠른 참조**: `.ai/ci-cd.md`

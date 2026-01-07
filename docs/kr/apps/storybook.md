# Storybook

> 디자인 시스템 문서 - V0.0.1 AAA 워크스테이션

## 프로젝트 구조

```
apps/storybook/                    # Deployment artifacts
  Dockerfile                         # Container build
  nginx.conf                         # Nginx configuration
  helm/                              # Kubernetes deployment

packages/ui-components/            # Storybook configuration
  .storybook/
    main.ts                          # Storybook main config
    manager.ts                       # Manager UI config
    preview.tsx                      # Preview decorators
  src/
    Introduction.mdx                 # Getting started guide
    DesignTokens.mdx                 # Design token docs
    components/*.stories.tsx         # Component stories
```

## 명령어

```bash
# Development mode
pnpm --filter @my-girok/storybook dev

# Build static site
pnpm --filter @my-girok/storybook build

# Preview built site
pnpm --filter @my-girok/storybook preview
```

### Docker 빌드

```bash
docker build -t storybook:latest -f apps/storybook/Dockerfile .
```

## URL

| 환경        | URL                          |
| ----------- | ---------------------------- |
| Development | https://design-dev.girok.dev |
| Production  | https://design.girok.dev     |

## CI/CD 파이프라인

| 트리거            | 액션            |
| ----------------- | --------------- |
| Push to `develop` | dev에 배포      |
| Tag `ui-v*`       | 프로덕션에 배포 |

## 기능

| 기능        | 구현                              |
| ----------- | --------------------------------- |
| SSR 안전성  | `isBrowser` 검사, Error Boundary  |
| 시스템 테마 | `matchMedia` 리스너 for dark mode |
| 감소된 모션 | `prefers-reduced-motion` 지원     |
| A11y 테스트 | WCAG AAA 시행                     |
| 테스트      | Vitest + Playwright               |

## 리소스 한계 (Kubernetes)

| 리소스 | 요청 | 제한 |
| ------ | ---- | ---- |
| CPU    | 10m  | 100m |
| Memory | 32Mi | 64Mi |

## 테스트

```bash
# Run Storybook tests
pnpm --filter @my-girok/ui-components test:storybook

# Run accessibility tests
pnpm --filter @my-girok/ui-components test:a11y
```

**LLM 참조**: `docs/llm/apps/storybook.md`

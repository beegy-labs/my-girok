# Storybook

> Design System Documentation - V0.0.1 AAA Workstation

## Project Structure

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

## Commands

```bash
# Development mode
pnpm --filter @my-girok/storybook dev

# Build static site
pnpm --filter @my-girok/storybook build

# Preview built site
pnpm --filter @my-girok/storybook preview
```

### Docker Build

```bash
docker build -t storybook:latest -f apps/storybook/Dockerfile .
```

## URLs

| Environment | URL                          |
| ----------- | ---------------------------- |
| Development | https://design-dev.girok.dev |
| Production  | https://design.girok.dev     |

## CI/CD Pipeline

| Trigger           | Action               |
| ----------------- | -------------------- |
| Push to `develop` | Deploy to dev        |
| Tag `ui-v*`       | Deploy to production |

## Features

| Feature        | Implementation                      |
| -------------- | ----------------------------------- |
| SSR Safety     | `isBrowser` check, Error Boundary   |
| System Theme   | `matchMedia` listener for dark mode |
| Reduced Motion | `prefers-reduced-motion` support    |
| A11y Testing   | WCAG AAA enforcement                |
| Testing        | Vitest + Playwright                 |

## Resource Limits (Kubernetes)

| Resource | Request | Limit |
| -------- | ------- | ----- |
| CPU      | 10m     | 100m  |
| Memory   | 32Mi    | 64Mi  |

## Testing

```bash
# Run Storybook tests
pnpm --filter @my-girok/ui-components test:storybook

# Run accessibility tests
pnpm --filter @my-girok/ui-components test:a11y
```

---

**LLM Reference**: `docs/llm/apps/storybook.md`

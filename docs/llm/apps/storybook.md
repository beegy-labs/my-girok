# @my-girok/storybook

Design System Documentation - V0.0.1 AAA Workstation

## Structure

```
apps/storybook/                  # Deployment
  Dockerfile, nginx.conf, helm/

packages/ui-components/          # Config
  .storybook/
    main.ts, manager.ts, preview.tsx
  src/
    Introduction.mdx, DesignTokens.mdx
    components/*.stories.tsx
```

## Commands

```bash
pnpm --filter @my-girok/storybook dev      # Development
pnpm --filter @my-girok/storybook build    # Build static
pnpm --filter @my-girok/storybook preview  # Preview built

# Docker
docker build -t storybook:latest -f apps/storybook/Dockerfile .
```

## URLs

| Environment | URL                          |
| ----------- | ---------------------------- |
| Development | https://design-dev.girok.dev |
| Production  | https://design.girok.dev     |

## CI/CD

| Trigger         | Action |
| --------------- | ------ |
| Push to develop | Dev    |
| Tag ui-v\*      | Prod   |

## Features

| Feature        | Implementation            |
| -------------- | ------------------------- |
| SSR Safety     | isBrowser, Error Boundary |
| System Theme   | matchMedia listener       |
| Reduced Motion | prefers-reduced-motion    |
| A11y Testing   | WCAG AAA enforcement      |
| Testing        | Vitest + Playwright       |

## Resources

| Resource | Request | Limit |
| -------- | ------- | ----- |
| CPU      | 10m     | 100m  |
| Memory   | 32Mi    | 64Mi  |

## Testing

```bash
pnpm --filter @my-girok/ui-components test:storybook
pnpm --filter @my-girok/ui-components test:a11y
```

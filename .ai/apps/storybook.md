# @my-girok/storybook

> Design System Documentation - V0.0.1 AAA Workstation | **Last Updated**: 2026-01-11

## Commands

```bash
pnpm --filter @my-girok/storybook dev      # Development
pnpm --filter @my-girok/storybook build    # Build static
```

## URLs

| Environment | URL                          |
| ----------- | ---------------------------- |
| Development | https://design-dev.girok.dev |
| Production  | https://design.girok.dev     |

## Structure

```
packages/ui-components/.storybook/  # Config
packages/ui-components/src/          # Stories
apps/storybook/                      # Deployment (Dockerfile, helm/)
```

## CI/CD Triggers

| Trigger         | Action                |
| --------------- | --------------------- |
| Push to develop | Deploy to development |
| Tag ui-v\*      | Deploy to production  |

## Features

| Feature        | Implementation                   |
| -------------- | -------------------------------- |
| Theme Toggle   | Light/Dark with system detection |
| A11y Testing   | WCAG AAA enforcement             |
| Reduced Motion | `prefers-reduced-motion` support |

**SSOT**: `docs/llm/apps/storybook.md`

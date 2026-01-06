# @my-girok/storybook

> Design System Documentation - V0.0.1 AAA Workstation | **Last Updated**: 2026-01-06

## Structure

```
apps/storybook/                    # Deployment
├── Dockerfile
├── nginx.conf
└── helm/

packages/ui-components/            # Storybook config
├── .storybook/
│   ├── main.ts
│   ├── manager.ts                 # GIROK branding
│   └── preview.tsx                # Theme decorator
└── src/
    ├── Introduction.mdx
    ├── DesignTokens.mdx
    └── components/*.stories.tsx
```

## Commands

```bash
pnpm --filter @my-girok/storybook dev      # Development
pnpm --filter @my-girok/storybook build    # Build static
pnpm --filter @my-girok/storybook preview  # Preview built

# Docker
docker build -t storybook:latest -f apps/storybook/Dockerfile .
docker run -p 6006:6006 storybook:latest
```

## URLs

| Environment | URL                          |
| ----------- | ---------------------------- |
| Development | https://design-dev.girok.dev |
| Production  | https://design.girok.dev     |

## CI/CD Triggers

| Trigger         | Action                |
| --------------- | --------------------- |
| Push to develop | Deploy to development |
| Tag ui-v\*      | Deploy to production  |

## Features (2025)

| Feature           | Implementation                     |
| ----------------- | ---------------------------------- |
| SSR Safety        | `isBrowser` checks, Error Boundary |
| System Theme      | `matchMedia` listener              |
| Reduced Motion    | `prefers-reduced-motion` support   |
| A11y Testing      | WCAG AAA enforcement               |
| Component Testing | Vitest + Playwright                |

## Theme Toggle

- **Light**: Clean White Oak
- **Dark**: Midnight Gentle Study

## Resource Requirements

| Resource | Request | Limit |
| -------- | ------- | ----- |
| CPU      | 10m     | 100m  |
| Memory   | 32Mi    | 64Mi  |

## Testing

```bash
pnpm --filter @my-girok/ui-components test:storybook
pnpm --filter @my-girok/ui-components test:a11y
```

---

**Related**: `.ai/packages/ui-components.md`, `.ai/packages/design-tokens.md`

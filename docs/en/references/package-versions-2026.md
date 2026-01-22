# Package Versions - 2026 Stable Releases

This guide provides centralized version tracking for dependency management as of 2026.

## Version Summary

### Current vs Latest Stable

| Package           | Current | Latest Stable | Status  | Notes                         |
| ----------------- | ------- | ------------- | ------- | ----------------------------- |
| Node.js           | 24.0.0+ | 24.13.0 LTS   | Current | Krypton LTS                   |
| @types/node       | 25.0.3  | 25.0.3        | Current |                               |
| React             | 19.2.3  | 19.2.3        | Current |                               |
| React DOM         | 19.2.3  | 19.2.3        | Current |                               |
| TypeScript        | 5.9.3   | 5.9.3         | Current | TS 6 coming, then native TS 7 |
| Vite              | 7.3.1   | 7.3.1         | Current |                               |
| Tailwind CSS      | 4.1.18  | 4.1.18        | Current | v4 @theme directive           |
| Vitest            | 4.0.17  | 4.0.17        | Current |                               |
| ESLint            | 9.39.2  | 9.39.2        | Current |                               |
| NestJS            | 11.1.12 | 11.1.12       | Current |                               |
| Prisma            | 7.2.0   | 7.2.0         | Current | Rust-free, no MongoDB         |
| ClickHouse Client | 1.16.0  | 1.16.0        | Current | Official Node.js client       |

## Detailed Version Information

### Node.js Runtime

```yaml
# engines requirement
node: '>=24.0.0'
pnpm: '>=9.0.0'

# Current LTS
Node.js: 24.13.0 "Krypton" (LTS)
```

**Node.js 24 LTS Notes**:

- LTS support through April 2028
- Enhanced security and stricter runtime
- Improved Web API support

### React Ecosystem

```yaml
react: ^19.2.3
react-dom: ^19.2.3
'@types/react': ^19.2.7
'@types/react-dom': ^19.2.3
```

**React 19.2 Features**:

- `<Activity>` component (visible/hidden modes)
- `useEffectEvent` hook
- React Compiler production-ready

### Build Tools

```yaml
typescript: ^5.9.3
vite: ^7.3.1
tsup: ^8.5.1
```

**Vite 7.3 Notes**:

- Rolldown preview available as `rolldown-vite`
- Vite 8 beta uses Rolldown/Oxc
- Node.js 20.19+ or 22.12+ required

### Styling

```yaml
tailwindcss: ^4.1.18
'@tailwindcss/vite': ^4.1.18
```

**Tailwind v4 Notes**:

- CSS-first `@theme` configuration
- 5x faster full builds
- Browser support: Safari 16.4+, Chrome 111+, Firefox 128+

### Testing

```yaml
vitest: ^4.0.17
'@vitest/coverage-v8': ^4.0.17
'@testing-library/react': ^16.3.0
'@testing-library/jest-dom': ^6.9.1
'@playwright/test': ^1.57.0
```

**Vitest 4.0 Notes**:

- Browser Mode stable
- Visual Regression testing
- Playwright Trace support

### Linting

```yaml
eslint: ^9.39.2
'@typescript-eslint/eslint-plugin': ^8.49.0
'@typescript-eslint/parser': ^8.49.0
```

**ESLint Notes**:

- v10 RC available (use `next` tag)
- Node.js ^18.18.0, ^20.9.0, or >=21.1.0 required

### NestJS Ecosystem

```yaml
'@nestjs/common': ^11.1.12
'@nestjs/core': ^11.1.12
'@nestjs/config': ^4.0.2
'@nestjs/jwt': ^11.0.2
'@nestjs/microservices': ^11.1.12
'@nestjs/passport': ^11.0.5
'@nestjs/platform-express': ^11.1.12
'@nestjs/swagger': ^11.2.3
'@nestjs/testing': ^11.1.12
'@nestjs/cli': ^11.0.16
'@nestjs/schedule': ^6.0.0
```

**NestJS 11 Notes**:

- Improved microservice transporters (NATS, Kafka, Redis)
- Faster startup with opaque key generation
- New `ParseDatePipe` and `IntrinsicException`

### Database

```yaml
'@prisma/client': ^7.2.0
prisma: ^7.2.0
'@clickhouse/client': ^1.16.0
```

**ClickHouse Client 1.16 Notes**:

- Official Node.js client (TypeScript)
- HTTP/Stream API support
- Select/Insert streaming
- Connection pooling built-in

**Prisma 7 Migration Notes**:

- MongoDB NOT supported (stay on v6 if using MongoDB)
- Rust-free TypeScript runtime
- 90% smaller bundle, 3x faster queries
- Requires `prisma.config.ts` for migrations
- ~98% fewer types for schema evaluation

### Messaging

```yaml
kafkajs: ^2.2.4
```

### Security

```yaml
passport: ^0.7.0
passport-jwt: ^4.0.1
helmet: ^8.1.0
```

## pnpm Catalog Status

All packages are updated to latest stable versions in `pnpm-workspace.yaml`:

```yaml
# Updated (2026-01-22)
'@types/node': ^25.0.3
vite: ^7.3.1
vitest: ^4.0.17
'@vitest/coverage-v8': ^4.0.17
eslint: ^9.39.2
'@nestjs/common': ^11.1.12
'@nestjs/core': ^11.1.12
'@nestjs/microservices': ^11.1.12
'@nestjs/platform-express': ^11.1.12
'@nestjs/testing': ^11.1.12
'@nestjs/cli': ^11.0.16
'@prisma/client': ^7.2.0
prisma: ^7.2.0
'@clickhouse/client': ^1.16.0
```

## Upgrade Recommendations

### Immediate (Patch Updates)

```bash
# Safe to update immediately
pnpm update vite vitest @vitest/coverage-v8 eslint \
  @nestjs/common @nestjs/core @nestjs/microservices \
  @nestjs/platform-express @nestjs/testing @nestjs/cli
```

### Planned (Major Updates)

None - all packages are current.

## Version Policy

| Category      | Policy                   |
| ------------- | ------------------------ |
| Patch (x.x.X) | Auto-update in CI        |
| Minor (x.X.0) | Review changelog, test   |
| Major (X.0.0) | Dedicated migration task |

## Sources

- [React npm](https://www.npmjs.com/package/react)
- [NestJS Releases](https://github.com/nestjs/nest/releases)
- [Prisma 7 Announcement](https://www.prisma.io/blog/announcing-prisma-orm-7-0-0)
- [Vite Releases](https://vite.dev/releases)
- [Vitest 4.0 Announcement](https://voidzero.dev/posts/announcing-vitest-4)
- [ESLint Releases](https://github.com/eslint/eslint/releases)
- [Tailwind CSS v4](https://tailwindcss.com/blog/tailwindcss-v4)

---

_Last Updated: 2026-01-22_

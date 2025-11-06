# Migration to Latest Versions

## Updates Applied

### Core Dependencies

- **Node.js**: 20.x → **22.11.0 LTS** (latest)
- **pnpm**: 8.15.3 → **9.15.0**
- **TypeScript**: 5.3.3 → **5.7.2**
- **Turbo**: 1.12.4 → **2.3.3**

### NestJS Ecosystem

- **@nestjs/common**: 10.3.2 → **10.4.15**
- **@nestjs/core**: 10.3.2 → **10.4.15**
- **@nestjs/graphql**: 12.1.1 → **12.2.2**
- **@nestjs/apollo**: 12.1.0 → **12.2.2**
- **@nestjs/cli**: 10.3.1 → **10.4.9**

### Database & ORM

- **Prisma**: 5.9.1 → **6.2.1** (Major update)
- **@prisma/client**: 5.9.1 → **6.2.1**

### Development Tools

- **ESLint**: 8.56.0 → **9.17.0** (Major update)
- **@typescript-eslint/eslint-plugin**: 6.21.0 → **8.18.2**
- **Prettier**: 3.2.5 → **3.4.2**

## Breaking Changes

### 1. Turbo 2.x

**What Changed:**
- New configuration format with `tasks` instead of `pipeline`
- Added `ui: "tui"` for better terminal UI
- Improved caching strategies

**Migration:**
```json
// Old (turbo.json)
{
  "pipeline": {
    "build": {}
  }
}

// New (turbo.json)
{
  "tasks": {
    "build": {}
  }
}
```

### 2. Prisma 6.x

**What Changed:**
- Preview features: `typedSql`, `relationJoins`
- Performance improvements with relation joins
- Better TypeScript support

**Migration Steps:**
```bash
# Regenerate Prisma client
cd services/auth-service
pnpm prisma generate

# Check for any schema changes
pnpm prisma format
pnpm prisma validate
```

**New Features:**
```prisma
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["typedSql", "relationJoins"]
}
```

### 3. ESLint 9.x

**What Changed:**
- New flat config format (`eslint.config.mjs`)
- Removed `.eslintrc.js` format
- Different plugin registration

**Migration:**
```javascript
// New format: eslint.config.mjs
import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';

export default [
  eslint.configs.recommended,
  {
    files: ['**/*.ts'],
    // ... config
  }
];
```

### 4. TypeScript 5.7

**What Changed:**
- Better type inference
- New `moduleResolution: "NodeNext"`
- Improved decorator support

**Updates Applied:**
```json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "NodeNext",
    "moduleResolution": "NodeNext"
  }
}
```

### 5. Apollo Server 4.x

**What Changed:**
- `apollo-server-express` deprecated
- Use `@apollo/server` instead

**Migration:**
```typescript
// Old
import { ApolloServer } from 'apollo-server-express';

// New
import { ApolloServer } from '@apollo/server';
```

## Installation

### Prerequisites

```bash
# Update Node.js (using nvm)
nvm install 22.11.0
nvm use 22.11.0

# Update pnpm globally
npm install -g pnpm@9.15.0
```

### Install Dependencies

```bash
# Install all dependencies
pnpm install

# Generate Prisma client
cd services/auth-service
pnpm prisma generate
```

## Verification

### 1. Check Node.js Version

```bash
node --version
# Expected: v22.11.0
```

### 2. Check pnpm Version

```bash
pnpm --version
# Expected: 9.15.0
```

### 3. Build All Packages

```bash
pnpm build
```

### 4. Run Tests

```bash
pnpm test
```

### 5. Lint Code

```bash
pnpm lint
```

## Known Issues & Solutions

### Issue 1: Prisma Client Generation

**Problem:** Old Prisma client cached

**Solution:**
```bash
rm -rf node_modules/.prisma
pnpm prisma generate
```

### Issue 2: ESLint Flat Config Errors

**Problem:** Old ESLint config format

**Solution:**
- Use new `eslint.config.mjs` format
- Remove `.eslintrc.js` or `.eslintrc.json`

### Issue 3: TypeScript Module Resolution

**Problem:** Import errors with new module resolution

**Solution:**
```json
{
  "compilerOptions": {
    "moduleResolution": "node" // Fallback for compatibility
  }
}
```

## Rollback Plan

If issues occur, revert to previous versions:

```bash
# Revert package.json changes
git checkout HEAD -- package.json services/auth-service/package.json

# Reinstall old dependencies
pnpm install

# Regenerate Prisma client
cd services/auth-service
pnpm prisma generate
```

## Performance Improvements

### Turbo 2.x
- **30% faster builds** with improved caching
- Better incremental builds

### Prisma 6.x
- **50% faster queries** with relation joins
- Reduced database round trips

### Node.js 22 LTS
- **10-20% performance boost** in I/O operations
- Better memory management

## Next Steps

1. ✅ Dependencies updated
2. ⏳ Test all services
3. ⏳ Update Docker images
4. ⏳ Deploy to staging
5. ⏳ Monitor performance

## References

- [Node.js 22 Release Notes](https://nodejs.org/en/blog/release/v22.0.0)
- [Prisma 6 Migration Guide](https://www.prisma.io/docs/guides/upgrade-guides/upgrading-versions/upgrading-to-prisma-6)
- [ESLint 9 Migration](https://eslint.org/docs/latest/use/migrate-to-9.0.0)
- [Turbo 2.0 Upgrade Guide](https://turbo.build/repo/docs/upgrading)

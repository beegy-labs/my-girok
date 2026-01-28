# Task 03: Seed File Modification

> Replace test services with my-girok service in seed files

## Goal

Modify `services-seed.ts` to seed my-girok service instead of test services (homeshopping, ads, legal, dev).

## Prerequisites

- [x] Task 01 completed (Database Audit)
- [x] Task 02 completed (Vault Root Token Setup)

## Target File

`services/auth-service/prisma/seed/services-seed.ts`

## Changes Required

### 1. Replace Services Array

**Before** (lines 16-49):

```typescript
const services = [
  {
    slug: 'homeshopping',
    name: 'Home Shopping',
    description: 'Home shopping service platform',
    isActive: true,
    settings: {},
    requiredConsents: ['TERMS_OF_SERVICE', 'PRIVACY_POLICY'],
  },
  // ... ads, legal, dev
];
```

**After**:

```typescript
const services = [
  {
    slug: 'my-girok',
    name: 'My Girok',
    description: 'Resume management platform for job seekers',
    isActive: true,
    settings: {
      version: '1.0.0',
      type: 'B2C',
      category: 'Resume Management',
    },
    requiredConsents: ['TERMS_OF_SERVICE', 'PRIVACY_POLICY'],
  },
];
```

### 2. Add Service Metadata

Add after services array (before lawRegistry):

```typescript
const serviceMetadata = {
  'my-girok': {
    domains: [
      'my-girok.com',
      'www.my-girok.com',
      'api.my-girok.com',
      'dev.girok.dev',
      'localhost:5173',
      'localhost:4002',
    ],
    countries: ['KR', 'US', 'JP'],
    locales: ['ko', 'en', 'ja'],
    config: {
      jwtValidation: true,
      domainValidation: true,
      rateLimitEnabled: true,
      rateLimitRequests: 1000,
      rateLimitWindow: 60,
      maintenanceMode: false,
      auditLevel: 'STANDARD',
    },
    consentRequirements: [
      // KR
      { countryCode: 'KR', consentType: 'TERMS_OF_SERVICE', isRequired: true },
      { countryCode: 'KR', consentType: 'PRIVACY_POLICY', isRequired: true },
      { countryCode: 'KR', consentType: 'MARKETING_EMAIL', isRequired: false },
      // US
      { countryCode: 'US', consentType: 'TERMS_OF_SERVICE', isRequired: true },
      { countryCode: 'US', consentType: 'PRIVACY_POLICY', isRequired: true },
      { countryCode: 'US', consentType: 'MARKETING_EMAIL', isRequired: false },
      // JP
      { countryCode: 'JP', consentType: 'TERMS_OF_SERVICE', isRequired: true },
      { countryCode: 'JP', consentType: 'PRIVACY_POLICY', isRequired: true },
      { countryCode: 'JP', consentType: 'MARKETING_EMAIL', isRequired: false },
    ],
  },
};
```

### 3. Update Seed Function

Replace `seedServices()` function:

```typescript
async function seedServices() {
  console.log('Seeding services...');

  for (const service of services) {
    const serviceId = ID.generate();
    const metadata = serviceMetadata[service.slug];

    // Insert service
    await prisma.$executeRaw`
      INSERT INTO services (id, slug, name, description, is_active, domains, settings)
      VALUES (
        ${serviceId},
        ${service.slug},
        ${service.name},
        ${service.description},
        ${service.isActive},
        ${metadata.domains}::TEXT[],
        ${JSON.stringify(service.settings)}::JSONB
      )
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        domains = EXCLUDED.domains,
        settings = EXCLUDED.settings,
        updated_at = NOW()
    `;

    console.log(`Seeded service: ${service.slug}`);

    // Insert service config
    await prisma.$executeRaw`
      INSERT INTO service_configs (
        id, service_id,
        jwt_validation, domain_validation,
        rate_limit_enabled, rate_limit_requests, rate_limit_window,
        maintenance_mode, audit_level
      )
      SELECT
        gen_random_uuid(), ${serviceId},
        ${metadata.config.jwtValidation}, ${metadata.config.domainValidation},
        ${metadata.config.rateLimitEnabled}, ${metadata.config.rateLimitRequests}, ${metadata.config.rateLimitWindow},
        ${metadata.config.maintenanceMode}, ${metadata.config.auditLevel}::audit_level
      WHERE NOT EXISTS (
        SELECT 1 FROM service_configs WHERE service_id = ${serviceId}
      )
    `;

    console.log(`Seeded config for: ${service.slug}`);

    // Insert supported countries
    for (const countryCode of metadata.countries) {
      await prisma.$executeRaw`
        INSERT INTO service_supported_countries (id, service_id, country_code, is_active)
        VALUES (gen_random_uuid(), ${serviceId}, ${countryCode}, true)
        ON CONFLICT (service_id, country_code) DO UPDATE SET
          is_active = EXCLUDED.is_active,
          updated_at = NOW()
      `;
    }

    console.log(`Seeded countries for: ${service.slug}`);

    // Insert supported locales
    for (const locale of metadata.locales) {
      await prisma.$executeRaw`
        INSERT INTO service_supported_locales (id, service_id, locale, is_active)
        VALUES (gen_random_uuid(), ${serviceId}, ${locale}, true)
        ON CONFLICT (service_id, locale) DO UPDATE SET
          is_active = EXCLUDED.is_active,
          updated_at = NOW()
      `;
    }

    console.log(`Seeded locales for: ${service.slug}`);

    // Insert consent requirements
    for (const req of metadata.consentRequirements) {
      await prisma.$executeRaw`
        INSERT INTO service_consent_requirements (
          id, service_id, country_code, consent_type, is_required
        )
        VALUES (
          gen_random_uuid(), ${serviceId}, ${req.countryCode},
          ${req.consentType}::consent_type, ${req.isRequired}
        )
        ON CONFLICT (service_id, country_code, consent_type) DO UPDATE SET
          is_required = EXCLUDED.is_required,
          updated_at = NOW()
      `;
    }

    console.log(`Seeded consent requirements for: ${service.slug}`);
  }

  console.log(`Completed seeding ${services.length} services`);
}
```

## Implementation Steps

### 1. Create Feature Branch

```bash
cd /Users/vero/workspace/beegy/my-girok

git checkout develop
git pull origin develop

git checkout -b feat/my-girok-service-registration
```

### 2. Modify Seed File

```bash
# Open file in editor
code services/auth-service/prisma/seed/services-seed.ts

# Apply changes from sections above
```

### 3. Test Locally (Optional)

```bash
# Build types
pnpm --filter @my-girok/types build

# Generate Prisma client
pnpm --filter @my-girok/auth-service prisma:generate

# Test seed file (dry run - won't affect DB without connection)
cd services/auth-service
pnpm exec ts-node prisma/seed/services-seed.ts
```

### 4. Commit Changes

```bash
git add services/auth-service/prisma/seed/services-seed.ts

git commit -m "feat: replace test services with my-girok service in seed

- Remove homeshopping, ads, legal, dev services
- Add my-girok service with full metadata
- Include domains, countries, locales, and consent requirements
- Update seed function to insert all related tables

Related to Phase 1-A Authentication recovery"
```

## Verification

- [ ] services array contains only my-girok
- [ ] serviceMetadata includes all required fields
- [ ] seedServices() function updated to handle all tables
- [ ] No syntax errors (TypeScript validation)
- [ ] Commit message follows conventional commits

## Related Tables

Seed file now populates:

1. `services` - Main service entry
2. `service_configs` - JWT, domain validation, rate limits
3. `service_supported_countries` - KR, US, JP
4. `service_supported_locales` - ko, en, ja
5. `service_consent_requirements` - 9 entries (3 countries × 3 types)

## Next Steps

→ Task 04: Code Changes (Domain Auth + JWT)

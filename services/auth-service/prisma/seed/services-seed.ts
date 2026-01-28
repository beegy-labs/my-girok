/**
 * Seed script for Services and Law Registry
 *
 * Seeds:
 * 1. Services (my-girok)
 * 2. Service configurations
 * 3. Supported countries and locales
 * 4. Consent requirements per country
 * 5. Law Registry (PIPA, GDPR, APPI, CCPA)
 *
 * Usage: npx ts-node prisma/seed/services-seed.ts
 */

import { PrismaClient } from '../../node_modules/.prisma/auth-client';
import { ID } from '@my-girok/nest-common';

const prisma = new PrismaClient();

const services = [
  {
    slug: 'my-girok',
    name: 'My Girok',
    description: 'Resume management platform for job seekers',
    isActive: true,
    domains: [
      'my-girok.com',
      'www.my-girok.com',
      'api.my-girok.com',
      'dev.girok.dev',
      'localhost:5173',
      'localhost:4002',
    ],
    settings: {
      version: '1.0.0',
      type: 'B2C',
      category: 'Resume Management',
    },
    config: {
      jwtValidation: true,
      domainValidation: true,
      rateLimitEnabled: true,
      rateLimitRequests: 1000,
      rateLimitWindow: 60,
      maintenanceMode: false,
      auditLevel: 'STANDARD',
    },
    countries: ['KR', 'US', 'JP', 'IN'],
    locales: ['ko', 'en', 'ja', 'hi'],
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
      // IN (India)
      { countryCode: 'IN', consentType: 'TERMS_OF_SERVICE', isRequired: true },
      { countryCode: 'IN', consentType: 'PRIVACY_POLICY', isRequired: true },
      { countryCode: 'IN', consentType: 'MARKETING_EMAIL', isRequired: false },
    ],
  },
];

const lawRegistry = [
  {
    code: 'PIPA',
    countryCode: 'KR',
    name: 'Personal Information Protection Act',
    requirements: {
      requiredConsents: ['TERMS_OF_SERVICE', 'PRIVACY_POLICY'],
      optionalConsents: ['MARKETING_EMAIL', 'MARKETING_PUSH', 'MARKETING_SMS'],
      specialRequirements: {
        nightTimePush: { start: 21, end: 8 },
        dataRetention: { maxDays: 365 },
        minAge: 14,
      },
    },
    isActive: true,
  },
  {
    code: 'GDPR',
    countryCode: 'EU',
    name: 'General Data Protection Regulation',
    requirements: {
      requiredConsents: ['TERMS_OF_SERVICE', 'PRIVACY_POLICY'],
      optionalConsents: ['MARKETING_EMAIL', 'MARKETING_PUSH'],
      specialRequirements: {
        dataRetention: { maxDays: 730 },
        minAge: 16,
        rightToErasure: true,
        dataPortability: true,
      },
    },
    isActive: true,
  },
  {
    code: 'APPI',
    countryCode: 'JP',
    name: 'Act on the Protection of Personal Information',
    requirements: {
      requiredConsents: ['TERMS_OF_SERVICE', 'PRIVACY_POLICY'],
      optionalConsents: ['MARKETING_EMAIL', 'MARKETING_PUSH'],
      specialRequirements: {
        dataRetention: { maxDays: 365 },
        minAge: 18,
        crossBorderTransfer: true,
      },
    },
    isActive: true,
  },
  {
    code: 'CCPA',
    countryCode: 'US',
    name: 'California Consumer Privacy Act',
    requirements: {
      requiredConsents: ['TERMS_OF_SERVICE', 'PRIVACY_POLICY'],
      optionalConsents: ['MARKETING_EMAIL', 'MARKETING_PUSH', 'PERSONALIZED_ADS'],
      specialRequirements: {
        dataRetention: { maxDays: 365 },
        minAge: 13,
        doNotSell: true,
        rightToKnow: true,
      },
    },
    isActive: true,
  },
];

async function seedServices() {
  console.log('Seeding services...');

  for (const service of services) {
    const serviceId = ID.generate();

    // Insert service
    await prisma.$executeRaw`
      INSERT INTO services (id, slug, name, description, is_active, domains, settings)
      VALUES (
        ${serviceId},
        ${service.slug},
        ${service.name},
        ${service.description},
        ${service.isActive},
        ${service.domains}::TEXT[],
        ${JSON.stringify(service.settings)}::JSONB
      )
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        domains = EXCLUDED.domains,
        settings = EXCLUDED.settings,
        updated_at = NOW()
      RETURNING id
    `;

    console.log(`Seeded service: ${service.slug}`);

    // Get service ID (for conflict case)
    const existingService = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM services WHERE slug = ${service.slug}
    `;
    const finalServiceId = existingService[0]?.id || serviceId;

    // Insert service config
    await prisma.$executeRaw`
      INSERT INTO service_configs (
        id, service_id,
        jwt_validation, domain_validation,
        rate_limit_enabled, rate_limit_requests, rate_limit_window,
        maintenance_mode, audit_level
      )
      VALUES (
        gen_random_uuid(),
        ${finalServiceId},
        ${service.config.jwtValidation},
        ${service.config.domainValidation},
        ${service.config.rateLimitEnabled},
        ${service.config.rateLimitRequests},
        ${service.config.rateLimitWindow},
        ${service.config.maintenanceMode},
        ${service.config.auditLevel}::audit_level
      )
      ON CONFLICT (service_id) DO UPDATE SET
        jwt_validation = EXCLUDED.jwt_validation,
        domain_validation = EXCLUDED.domain_validation,
        rate_limit_enabled = EXCLUDED.rate_limit_enabled,
        rate_limit_requests = EXCLUDED.rate_limit_requests,
        rate_limit_window = EXCLUDED.rate_limit_window,
        maintenance_mode = EXCLUDED.maintenance_mode,
        audit_level = EXCLUDED.audit_level,
        updated_at = NOW()
    `;

    console.log(`Seeded config for: ${service.slug}`);

    // Insert supported countries
    for (const countryCode of service.countries) {
      await prisma.$executeRaw`
        INSERT INTO service_supported_countries (id, service_id, country_code, is_active)
        VALUES (gen_random_uuid(), ${finalServiceId}, ${countryCode}, true)
        ON CONFLICT (service_id, country_code) DO UPDATE SET
          is_active = EXCLUDED.is_active,
          updated_at = NOW()
      `;
    }

    console.log(`Seeded ${service.countries.length} countries for: ${service.slug}`);

    // Insert supported locales
    for (const locale of service.locales) {
      await prisma.$executeRaw`
        INSERT INTO service_supported_locales (id, service_id, locale, is_active)
        VALUES (gen_random_uuid(), ${finalServiceId}, ${locale}, true)
        ON CONFLICT (service_id, locale) DO UPDATE SET
          is_active = EXCLUDED.is_active,
          updated_at = NOW()
      `;
    }

    console.log(`Seeded ${service.locales.length} locales for: ${service.slug}`);

    // Insert consent requirements
    for (const req of service.consentRequirements) {
      await prisma.$executeRaw`
        INSERT INTO service_consent_requirements (
          id, service_id, country_code, consent_type, is_required
        )
        VALUES (
          gen_random_uuid(),
          ${finalServiceId},
          ${req.countryCode},
          ${req.consentType}::consent_type,
          ${req.isRequired}
        )
        ON CONFLICT (service_id, country_code, consent_type) DO UPDATE SET
          is_required = EXCLUDED.is_required,
          updated_at = NOW()
      `;
    }

    console.log(
      `Seeded ${service.consentRequirements.length} consent requirements for: ${service.slug}`,
    );
  }

  console.log(`Completed seeding ${services.length} service(s)`);
}

async function seedLawRegistry() {
  console.log('\nSeeding law registry...');

  for (const law of lawRegistry) {
    const lawId = ID.generate();
    await prisma.$executeRaw`
      INSERT INTO law_registry (id, code, country_code, name, requirements, is_active)
      VALUES (
        ${lawId},
        ${law.code},
        ${law.countryCode},
        ${law.name},
        ${JSON.stringify(law.requirements)}::JSONB,
        ${law.isActive}
      )
      ON CONFLICT (code) DO UPDATE SET
        country_code = EXCLUDED.country_code,
        name = EXCLUDED.name,
        requirements = EXCLUDED.requirements,
        is_active = EXCLUDED.is_active,
        updated_at = NOW()
    `;
  }

  console.log(`Seeded ${lawRegistry.length} law registry entries`);
}

async function main() {
  console.log('Starting my-girok Service seed...\n');

  try {
    await seedServices();
    await seedLawRegistry();

    console.log('\nmy-girok Service seed completed successfully!');
  } catch (error) {
    console.error('Seed failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();

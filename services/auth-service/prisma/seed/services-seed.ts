/**
 * Seed script for Services and Law Registry
 *
 * Seeds:
 * 1. Services (homeshopping, ads, legal, dev)
 * 2. Law Registry (PIPA, GDPR, APPI, CCPA)
 *
 * Usage: npx ts-node prisma/seed/services-seed.ts
 */

import { PrismaClient } from '../../node_modules/.prisma/auth-client';

const prisma = new PrismaClient();

const services = [
  {
    slug: 'homeshopping',
    name: 'Home Shopping',
    description: 'Home shopping service platform',
    isActive: true,
    settings: {},
    requiredConsents: ['TERMS_OF_SERVICE', 'PRIVACY_POLICY'],
  },
  {
    slug: 'ads',
    name: 'Advertising Platform',
    description: 'Digital advertising and marketing platform',
    isActive: true,
    settings: {},
    requiredConsents: ['TERMS_OF_SERVICE', 'PRIVACY_POLICY', 'PERSONALIZED_ADS'],
  },
  {
    slug: 'legal',
    name: 'Legal Service',
    description: 'Legal document management service',
    isActive: true,
    settings: {},
    requiredConsents: ['TERMS_OF_SERVICE', 'PRIVACY_POLICY'],
  },
  {
    slug: 'dev',
    name: 'Developer Portal',
    description: 'Developer tools and API documentation',
    isActive: true,
    settings: {},
    requiredConsents: ['TERMS_OF_SERVICE', 'PRIVACY_POLICY'],
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
    await prisma.$executeRaw`
      INSERT INTO services (id, slug, name, description, is_active, settings, required_consents)
      VALUES (
        gen_random_uuid()::TEXT,
        ${service.slug},
        ${service.name},
        ${service.description},
        ${service.isActive},
        ${JSON.stringify(service.settings)}::JSONB,
        ${JSON.stringify(service.requiredConsents)}::JSONB
      )
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        settings = EXCLUDED.settings,
        required_consents = EXCLUDED.required_consents,
        updated_at = NOW()
    `;
  }

  console.log(`Seeded ${services.length} services`);
}

async function seedLawRegistry() {
  console.log('Seeding law registry...');

  for (const law of lawRegistry) {
    await prisma.$executeRaw`
      INSERT INTO law_registry (id, code, country_code, name, requirements, is_active)
      VALUES (
        gen_random_uuid()::TEXT,
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
  console.log('Starting Global Service seed...\n');

  try {
    await seedServices();
    await seedLawRegistry();

    console.log('\nGlobal Service seed completed successfully!');
  } catch (error) {
    console.error('Seed failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();

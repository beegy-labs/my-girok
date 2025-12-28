/**
 * Seed script for Service Consent Requirements
 *
 * Seeds consent requirements per service per country
 *
 * Usage: npx ts-node prisma/seed/consent-requirements-seed.ts
 */

import { PrismaClient } from '../../node_modules/.prisma/auth-client';
import { ID } from '@my-girok/nest-common';

const prisma = new PrismaClient();

interface ConsentRequirement {
  type: string;
  required: boolean;
  docType: string;
  order: number;
  labelKey: string;
  descriptionKey: string;
}

interface ServiceConsentConfig {
  serviceSlug: string;
  countryCode: string;
  consents: ConsentRequirement[];
}

const serviceConsentConfigs: ServiceConsentConfig[] = [
  // homeshopping - KR (PIPA)
  {
    serviceSlug: 'homeshopping',
    countryCode: 'KR',
    consents: [
      {
        type: 'TERMS_OF_SERVICE',
        required: true,
        docType: 'TERMS_OF_SERVICE',
        order: 1,
        labelKey: 'consent.terms_of_service.label',
        descriptionKey: 'consent.terms_of_service.description',
      },
      {
        type: 'PRIVACY_POLICY',
        required: true,
        docType: 'PRIVACY_POLICY',
        order: 2,
        labelKey: 'consent.privacy_policy.label',
        descriptionKey: 'consent.privacy_policy.description',
      },
      {
        type: 'MARKETING_EMAIL',
        required: false,
        docType: 'MARKETING_POLICY',
        order: 3,
        labelKey: 'consent.marketing_email.label',
        descriptionKey: 'consent.marketing_email.description',
      },
      {
        type: 'MARKETING_PUSH',
        required: false,
        docType: 'MARKETING_POLICY',
        order: 4,
        labelKey: 'consent.marketing_push.label',
        descriptionKey: 'consent.marketing_push.description',
      },
      {
        type: 'MARKETING_PUSH_NIGHT',
        required: false,
        docType: 'MARKETING_POLICY',
        order: 5,
        labelKey: 'consent.marketing_push_night.label',
        descriptionKey: 'consent.marketing_push_night.description',
      },
    ],
  },
  // homeshopping - JP (APPI: CROSS_BORDER_TRANSFER required)
  {
    serviceSlug: 'homeshopping',
    countryCode: 'JP',
    consents: [
      {
        type: 'TERMS_OF_SERVICE',
        required: true,
        docType: 'TERMS_OF_SERVICE',
        order: 1,
        labelKey: 'consent.terms_of_service.label',
        descriptionKey: 'consent.terms_of_service.description',
      },
      {
        type: 'PRIVACY_POLICY',
        required: true,
        docType: 'PRIVACY_POLICY',
        order: 2,
        labelKey: 'consent.privacy_policy.label',
        descriptionKey: 'consent.privacy_policy.description',
      },
      {
        type: 'CROSS_BORDER_TRANSFER',
        required: true,
        docType: 'PRIVACY_POLICY',
        order: 3,
        labelKey: 'consent.cross_border_transfer.label',
        descriptionKey: 'consent.cross_border_transfer.description',
      },
    ],
  },
  // homeshopping - EU (GDPR)
  {
    serviceSlug: 'homeshopping',
    countryCode: 'EU',
    consents: [
      {
        type: 'TERMS_OF_SERVICE',
        required: true,
        docType: 'TERMS_OF_SERVICE',
        order: 1,
        labelKey: 'consent.terms_of_service.label',
        descriptionKey: 'consent.terms_of_service.description',
      },
      {
        type: 'PRIVACY_POLICY',
        required: true,
        docType: 'PRIVACY_POLICY',
        order: 2,
        labelKey: 'consent.privacy_policy.label',
        descriptionKey: 'consent.privacy_policy.description',
      },
      {
        type: 'MARKETING_EMAIL',
        required: false,
        docType: 'MARKETING_POLICY',
        order: 3,
        labelKey: 'consent.marketing_email.label',
        descriptionKey: 'consent.marketing_email.description',
      },
    ],
  },
  // ads - KR
  {
    serviceSlug: 'ads',
    countryCode: 'KR',
    consents: [
      {
        type: 'TERMS_OF_SERVICE',
        required: true,
        docType: 'TERMS_OF_SERVICE',
        order: 1,
        labelKey: 'consent.terms_of_service.label',
        descriptionKey: 'consent.terms_of_service.description',
      },
      {
        type: 'PRIVACY_POLICY',
        required: true,
        docType: 'PRIVACY_POLICY',
        order: 2,
        labelKey: 'consent.privacy_policy.label',
        descriptionKey: 'consent.privacy_policy.description',
      },
      {
        type: 'PERSONALIZED_ADS',
        required: false,
        docType: 'PERSONALIZED_ADS',
        order: 3,
        labelKey: 'consent.personalized_ads.label',
        descriptionKey: 'consent.personalized_ads.description',
      },
    ],
  },
  // dev - KR
  {
    serviceSlug: 'dev',
    countryCode: 'KR',
    consents: [
      {
        type: 'TERMS_OF_SERVICE',
        required: true,
        docType: 'TERMS_OF_SERVICE',
        order: 1,
        labelKey: 'consent.terms_of_service.label',
        descriptionKey: 'consent.terms_of_service.description',
      },
      {
        type: 'PRIVACY_POLICY',
        required: true,
        docType: 'PRIVACY_POLICY',
        order: 2,
        labelKey: 'consent.privacy_policy.label',
        descriptionKey: 'consent.privacy_policy.description',
      },
    ],
  },
  // legal - KR
  {
    serviceSlug: 'legal',
    countryCode: 'KR',
    consents: [
      {
        type: 'TERMS_OF_SERVICE',
        required: true,
        docType: 'TERMS_OF_SERVICE',
        order: 1,
        labelKey: 'consent.terms_of_service.label',
        descriptionKey: 'consent.terms_of_service.description',
      },
      {
        type: 'PRIVACY_POLICY',
        required: true,
        docType: 'PRIVACY_POLICY',
        order: 2,
        labelKey: 'consent.privacy_policy.label',
        descriptionKey: 'consent.privacy_policy.description',
      },
    ],
  },
];

async function seedConsentRequirements() {
  console.log('Seeding service consent requirements...');

  let count = 0;

  for (const config of serviceConsentConfigs) {
    // Get service ID by slug
    const service = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM services WHERE slug = ${config.serviceSlug}
    `;

    if (service.length === 0) {
      console.log(`Service ${config.serviceSlug} not found, skipping...`);
      continue;
    }

    const serviceId = service[0].id;

    for (const consent of config.consents) {
      const reqId = ID.generate();
      await prisma.$executeRaw`
        INSERT INTO service_consent_requirements (
          id, service_id, country_code, consent_type, is_required,
          document_type, display_order, label_key, description_key
        )
        VALUES (
          ${reqId},
          ${serviceId},
          ${config.countryCode},
          ${consent.type}::consent_type,
          ${consent.required},
          ${consent.docType}::legal_document_type,
          ${consent.order},
          ${consent.labelKey},
          ${consent.descriptionKey}
        )
        ON CONFLICT (service_id, country_code, consent_type) DO UPDATE SET
          is_required = EXCLUDED.is_required,
          document_type = EXCLUDED.document_type,
          display_order = EXCLUDED.display_order,
          label_key = EXCLUDED.label_key,
          description_key = EXCLUDED.description_key,
          updated_at = NOW()
      `;
      count++;
    }
  }

  console.log(`Seeded ${count} consent requirements`);
}

async function main() {
  console.log('Starting Consent Requirements seed...\n');

  try {
    await seedConsentRequirements();

    console.log('\nConsent Requirements seed completed successfully!');
  } catch (error) {
    console.error('Seed failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();

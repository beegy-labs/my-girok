import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ConsentType, LegalDocumentType } from '.prisma/auth-client';
import { CreateConsentDto, ConsentRequirementDto } from './dto/consent.dto';

/**
 * Consent requirements configuration
 * Based on 2025 GDPR, CCPA, PIPA, APPI requirements
 */
const CONSENT_REQUIREMENTS: ConsentRequirementDto[] = [
  {
    type: ConsentType.TERMS_OF_SERVICE,
    required: true,
    documentType: LegalDocumentType.TERMS_OF_SERVICE,
    labelKey: 'consent.termsOfService',
    descriptionKey: 'consent.termsOfServiceDesc',
  },
  {
    type: ConsentType.PRIVACY_POLICY,
    required: true,
    documentType: LegalDocumentType.PRIVACY_POLICY,
    labelKey: 'consent.privacyPolicy',
    descriptionKey: 'consent.privacyPolicyDesc',
  },
  {
    type: ConsentType.MARKETING_EMAIL,
    required: false,
    documentType: LegalDocumentType.MARKETING_POLICY,
    labelKey: 'consent.marketingEmail',
    descriptionKey: 'consent.marketingEmailDesc',
  },
  {
    type: ConsentType.MARKETING_PUSH,
    required: false,
    documentType: LegalDocumentType.MARKETING_POLICY,
    labelKey: 'consent.marketingPush',
    descriptionKey: 'consent.marketingPushDesc',
  },
  {
    type: ConsentType.PERSONALIZED_ADS,
    required: false,
    documentType: LegalDocumentType.PERSONALIZED_ADS,
    labelKey: 'consent.personalizedAds',
    descriptionKey: 'consent.personalizedAdsDesc',
  },
];

@Injectable()
export class LegalService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get consent requirements for registration
   * Returns list of consents with their requirements and latest document versions
   */
  async getConsentRequirements(locale: string = 'ko') {
    const requirements = await Promise.all(
      CONSENT_REQUIREMENTS.map(async (req) => {
        const document = await this.prisma.legalDocument.findFirst({
          where: {
            type: req.documentType,
            locale,
            isActive: true,
          },
          orderBy: { effectiveDate: 'desc' },
          select: {
            id: true,
            version: true,
            title: true,
            summary: true,
          },
        });

        return {
          ...req,
          document,
        };
      }),
    );

    return requirements;
  }

  /**
   * Get a specific legal document by type and locale
   */
  async getDocument(
    type: LegalDocumentType,
    locale: string = 'ko',
  ): Promise<{
    id: string;
    type: LegalDocumentType;
    version: string;
    locale: string;
    title: string;
    content: string;
    summary: string | null;
    effectiveDate: Date;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }> {
    const document = await this.prisma.legalDocument.findFirst({
      where: {
        type,
        locale,
        isActive: true,
      },
      orderBy: { effectiveDate: 'desc' },
    });

    if (!document) {
      // Fallback to Korean if locale not found
      if (locale !== 'ko') {
        return this.getDocument(type, 'ko');
      }
      throw new NotFoundException(`Document not found: ${type}`);
    }

    return document;
  }

  /**
   * Get document by ID
   */
  async getDocumentById(id: string) {
    const document = await this.prisma.legalDocument.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  /**
   * Create user consents during registration
   */
  async createConsents(
    userId: string,
    consents: CreateConsentDto[],
    ipAddress?: string,
    userAgent?: string,
  ) {
    const now = new Date();

    const consentRecords = await Promise.all(
      consents.map(async (consent) => {
        // Get the latest document version for audit
        const document = consent.documentId
          ? await this.prisma.legalDocument.findUnique({
              where: { id: consent.documentId },
            })
          : null;

        return this.prisma.userConsent.create({
          data: {
            userId,
            consentType: consent.type,
            documentId: consent.documentId,
            documentVersion: document?.version,
            agreed: consent.agreed,
            agreedAt: now,
            ipAddress,
            userAgent,
          },
        });
      }),
    );

    return consentRecords;
  }

  /**
   * Get user's current consents
   */
  async getUserConsents(userId: string) {
    const consents = await this.prisma.userConsent.findMany({
      where: {
        userId,
        withdrawnAt: null,
      },
      include: {
        document: {
          select: {
            id: true,
            type: true,
            version: true,
            title: true,
          },
        },
      },
      orderBy: { agreedAt: 'desc' },
    });

    return consents;
  }

  /**
   * Update (withdraw or re-consent) a specific consent
   */
  async updateConsent(
    userId: string,
    consentType: ConsentType,
    agreed: boolean,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const now = new Date();

    // Check if consent type is required
    const requirement = CONSENT_REQUIREMENTS.find((r) => r.type === consentType);
    if (requirement?.required && !agreed) {
      throw new Error('Cannot withdraw required consent');
    }

    // Find existing active consent
    const existingConsent = await this.prisma.userConsent.findFirst({
      where: {
        userId,
        consentType,
        withdrawnAt: null,
      },
      orderBy: { agreedAt: 'desc' },
    });

    if (existingConsent && !agreed) {
      // Withdraw consent
      return this.prisma.userConsent.update({
        where: { id: existingConsent.id },
        data: { withdrawnAt: now },
      });
    } else if (!existingConsent && agreed) {
      // Create new consent
      const document = await this.prisma.legalDocument.findFirst({
        where: {
          type: requirement?.documentType,
          isActive: true,
        },
        orderBy: { effectiveDate: 'desc' },
      });

      return this.prisma.userConsent.create({
        data: {
          userId,
          consentType,
          documentId: document?.id,
          documentVersion: document?.version,
          agreed: true,
          agreedAt: now,
          ipAddress,
          userAgent,
        },
      });
    }

    return existingConsent;
  }

  /**
   * Check if user has all required consents
   */
  async hasRequiredConsents(userId: string): Promise<boolean> {
    const requiredTypes = CONSENT_REQUIREMENTS.filter((r) => r.required).map((r) => r.type);

    const consents = await this.prisma.userConsent.findMany({
      where: {
        userId,
        consentType: { in: requiredTypes },
        agreed: true,
        withdrawnAt: null,
      },
    });

    return consents.length === requiredTypes.length;
  }
}

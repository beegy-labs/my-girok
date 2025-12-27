import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ConsentType, LegalDocumentType } from '.prisma/auth-client';
import { CreateConsentDto } from './dto/consent.dto';
import {
  getConsentPolicy,
  localeToRegion,
  type ConsentRequirement,
  type Region,
} from './config/consent-policy.config';

/**
 * Document selection fields for list queries
 * Reduces payload size by selecting only necessary fields
 */
const DOCUMENT_SELECT_FIELDS = {
  id: true,
  version: true,
  title: true,
  summary: true,
} as const;

/**
 * Document include fields for consent queries
 * Minimal document info for consent records
 */
const CONSENT_DOCUMENT_INCLUDE = {
  document: {
    select: {
      id: true,
      type: true,
      version: true,
      title: true,
    },
  },
} as const;

/**
 * Full legal document return type
 * Matches Prisma LegalDocument model exactly
 */
interface LegalDocumentResult {
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
}

/**
 * User consent record result
 * Matches Prisma UserConsent model
 */
interface UserConsentResult {
  id: string;
  userId: string;
  consentType: ConsentType;
  documentId: string | null;
  documentVersion: string | null;
  agreed: boolean;
  agreedAt: Date;
  withdrawnAt: Date | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

/**
 * User consent with document info for getUserConsents
 */
interface UserConsentWithDocument extends UserConsentResult {
  document: {
    id: string;
    type: LegalDocumentType;
    version: string;
    title: string;
  } | null;
}

/**
 * Consent requirements response with region policy
 */
interface ConsentRequirementsResult {
  region: Region;
  law: string;
  nightTimePushRestriction?: { start: number; end: number };
  requirements: Array<{
    type: ConsentType;
    required: boolean;
    labelKey: string;
    descriptionKey: string;
    documentType: LegalDocumentType;
    nightTimeHours?: { start: number; end: number };
    document: {
      id: string;
      version: string;
      title: string;
      summary: string | null;
    } | null;
  }>;
}

/**
 * Legal service for managing consent requirements and legal documents
 *
 * Handles GDPR/CCPA/PIPA/APPI 2025 compliant consent management including:
 * - Region-specific consent policies
 * - Legal document versioning
 * - User consent tracking with audit trail
 *
 * @example
 * ```typescript
 * const legalService = app.get(LegalService);
 *
 * // Get consent requirements for Korean users
 * const requirements = await legalService.getConsentRequirements('ko');
 *
 * // Create user consents
 * await legalService.createConsents(userId, consents, ipAddress, userAgent);
 * ```
 */
@Injectable()
export class LegalService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get consent requirements for registration based on user's locale/region
   *
   * Returns region-specific consent requirements with associated document info.
   * Uses SSOT consent-policy.config.ts for region-based policies.
   *
   * @param locale - User's locale (ko, en, ja, etc.). Defaults to 'ko'
   * @returns Array of consent requirements with document metadata
   *
   * @example
   * ```typescript
   * // Get Korean consent requirements
   * const requirements = await legalService.getConsentRequirements('ko');
   * // Returns: [{ type: 'TERMS_OF_SERVICE', required: true, document: {...} }, ...]
   *
   * // Get EU (GDPR) consent requirements
   * const euRequirements = await legalService.getConsentRequirements('de-DE');
   * ```
   */
  async getConsentRequirements(locale: string = 'ko'): Promise<ConsentRequirementsResult> {
    const region = localeToRegion(locale);
    const policy = getConsentPolicy(region);

    // Batch query: fetch all required documents in single query (prevents N+1)
    const documentTypes = policy.requirements.map((r) => r.documentType);
    const documents = await this.prisma.legalDocument.findMany({
      where: {
        type: { in: documentTypes },
        locale,
        isActive: true,
      },
      orderBy: { effectiveDate: 'desc' },
      select: { ...DOCUMENT_SELECT_FIELDS, type: true },
    });

    // Create lookup map for O(1) access (latest document per type)
    const documentMap = new Map<LegalDocumentType, (typeof documents)[0]>();
    for (const doc of documents) {
      if (!documentMap.has(doc.type)) {
        documentMap.set(doc.type, doc);
      }
    }

    // Map requirements with documents from cache
    const requirements = policy.requirements.map((req) => {
      const doc = documentMap.get(req.documentType);
      return {
        type: req.type,
        required: req.required,
        labelKey: req.labelKey,
        descriptionKey: req.descriptionKey,
        documentType: req.documentType,
        nightTimeHours: req.nightTimeHours,
        document: doc
          ? { id: doc.id, version: doc.version, title: doc.title, summary: doc.summary }
          : null,
      };
    });

    return {
      region: policy.region,
      law: policy.law,
      nightTimePushRestriction: policy.nightTimePushRestriction,
      requirements,
    };
  }

  /**
   * Get a specific legal document by type and locale
   *
   * Returns the latest active version of the document.
   * Falls back to Korean locale if the requested locale is not available.
   *
   * @param type - Legal document type (TERMS_OF_SERVICE, PRIVACY_POLICY, etc.)
   * @param locale - Document locale (ko, en, ja). Defaults to 'ko'
   * @returns Full legal document with content and metadata
   * @throws NotFoundException if document is not found
   *
   * @example
   * ```typescript
   * // Get Terms of Service in English
   * const tos = await legalService.getDocument(LegalDocumentType.TERMS_OF_SERVICE, 'en');
   *
   * // Get Privacy Policy (defaults to Korean)
   * const privacy = await legalService.getDocument(LegalDocumentType.PRIVACY_POLICY);
   * ```
   */
  async getDocument(type: LegalDocumentType, locale: string = 'ko'): Promise<LegalDocumentResult> {
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
   * Get legal document by unique ID
   *
   * Retrieves a specific document version for audit trail purposes.
   *
   * @param id - Document UUID
   * @returns Legal document with full metadata
   * @throws NotFoundException if document is not found
   *
   * @example
   * ```typescript
   * const document = await legalService.getDocumentById('uuid-here');
   * ```
   */
  async getDocumentById(id: string): Promise<LegalDocumentResult> {
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
   *
   * Records user's consent decisions with full audit trail including
   * IP address, user agent, and document version at time of consent.
   *
   * @param userId - User UUID
   * @param consents - Array of consent decisions
   * @param ipAddress - Client IP address for audit
   * @param userAgent - Client user agent for audit
   * @returns Array of created consent records
   *
   * @example
   * ```typescript
   * await legalService.createConsents(
   *   userId,
   *   [
   *     { type: ConsentType.TERMS_OF_SERVICE, agreed: true, documentId: 'doc-id' },
   *     { type: ConsentType.PRIVACY_POLICY, agreed: true, documentId: 'doc-id' },
   *     { type: ConsentType.MARKETING_EMAIL, agreed: false },
   *   ],
   *   '192.168.1.1',
   *   'Mozilla/5.0...'
   * );
   * ```
   */
  async createConsents(
    userId: string,
    consents: CreateConsentDto[],
    ipAddress?: string,
    userAgent?: string,
    countryCode: string = 'KR',
  ): Promise<UserConsentResult[]> {
    const now = new Date();

    // Batch fetch: Get all document IDs that need version lookup
    const documentIds = consents
      .map((c) => c.documentId)
      .filter((id): id is string => id !== undefined);

    // Single query for all documents (prevents N+1)
    const documents =
      documentIds.length > 0
        ? await this.prisma.legalDocument.findMany({
            where: { id: { in: documentIds } },
            select: { id: true, version: true },
          })
        : [];

    // O(1) lookup map
    const documentMap = new Map(documents.map((d) => [d.id, d.version]));

    // Atomic transaction: Create all consents or rollback on failure
    const consentRecords = await this.prisma.$transaction(
      consents.map((consent) =>
        this.prisma.consent.create({
          data: {
            userId,
            consentType: consent.type,
            scope: 'SERVICE',
            documentId: consent.documentId,
            documentVersion: consent.documentId ? documentMap.get(consent.documentId) : undefined,
            agreed: consent.agreed,
            agreedAt: now,
            ipAddress,
            userAgent,
            countryCode,
          },
        }),
      ),
    );

    return consentRecords;
  }

  /**
   * Get user's current active consents
   *
   * Returns all consents that have not been withdrawn.
   *
   * @param userId - User UUID
   * @returns Array of active user consents with document info
   *
   * @example
   * ```typescript
   * const consents = await legalService.getUserConsents(userId);
   * // Returns: [{ consentType: 'MARKETING_EMAIL', agreed: true, agreedAt: Date, ... }]
   * ```
   */
  async getUserConsents(userId: string): Promise<UserConsentWithDocument[]> {
    const consents = await this.prisma.consent.findMany({
      where: {
        userId,
        withdrawnAt: null,
      },
      include: CONSENT_DOCUMENT_INCLUDE,
      orderBy: { agreedAt: 'desc' },
    });

    return consents;
  }

  /**
   * Update (withdraw or re-consent) a specific consent
   *
   * Allows users to withdraw optional consents or re-consent to previously withdrawn ones.
   * Required consents (TERMS_OF_SERVICE, PRIVACY_POLICY) cannot be withdrawn.
   *
   * @param userId - User UUID
   * @param consentType - Type of consent to update
   * @param agreed - New consent status
   * @param locale - User's locale for region policy lookup (defaults to 'ko')
   * @param ipAddress - Client IP address for audit
   * @param userAgent - Client user agent for audit
   * @returns Updated or created consent record
   * @throws BadRequestException if attempting to withdraw required consent
   *
   * @example
   * ```typescript
   * // Withdraw marketing email consent
   * await legalService.updateConsent(userId, ConsentType.MARKETING_EMAIL, false);
   *
   * // Re-consent to push notifications
   * await legalService.updateConsent(userId, ConsentType.MARKETING_PUSH, true);
   * ```
   */
  async updateConsent(
    userId: string,
    consentType: ConsentType,
    agreed: boolean,
    locale: string = 'ko',
    ipAddress?: string,
    userAgent?: string,
  ): Promise<UserConsentResult | null> {
    const now = new Date();

    // Get region-specific requirements from SSOT config
    const region = localeToRegion(locale);
    const policy = getConsentPolicy(region);
    const requirement = policy.requirements.find((r: ConsentRequirement) => r.type === consentType);

    // Check if consent type is required and cannot be withdrawn
    if (requirement?.required && !agreed) {
      throw new BadRequestException('Cannot withdraw required consent');
    }

    // Find existing active consent
    const existingConsent = await this.prisma.consent.findFirst({
      where: {
        userId,
        consentType,
        withdrawnAt: null,
      },
      orderBy: { agreedAt: 'desc' },
    });

    if (existingConsent && !agreed) {
      // Withdraw consent
      return this.prisma.consent.update({
        where: { id: existingConsent.id },
        data: { withdrawnAt: now },
      });
    } else if (!existingConsent && agreed) {
      // Create new consent
      const document = requirement
        ? await this.prisma.legalDocument.findFirst({
            where: {
              type: requirement.documentType,
              isActive: true,
            },
            orderBy: { effectiveDate: 'desc' },
          })
        : null;

      // Derive countryCode from locale
      const countryCode = locale === 'ko' ? 'KR' : locale.toUpperCase().slice(0, 2);
      return this.prisma.consent.create({
        data: {
          userId,
          consentType,
          scope: 'SERVICE',
          countryCode,
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
   * Check if user has all required consents for their region
   *
   * Validates that user has agreed to all mandatory consents
   * (typically TERMS_OF_SERVICE and PRIVACY_POLICY).
   *
   * @param userId - User UUID
   * @param locale - User's locale for region policy lookup (defaults to 'ko')
   * @returns True if user has all required consents
   *
   * @example
   * ```typescript
   * const hasRequired = await legalService.hasRequiredConsents(userId);
   * if (!hasRequired) {
   *   throw new ForbiddenException('Missing required consents');
   * }
   * ```
   */
  async hasRequiredConsents(userId: string, locale: string = 'ko'): Promise<boolean> {
    const region = localeToRegion(locale);
    const policy = getConsentPolicy(region);
    const requiredTypes = policy.requirements
      .filter((r: ConsentRequirement) => r.required)
      .map((r: ConsentRequirement) => r.type);

    const consents = await this.prisma.consent.findMany({
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

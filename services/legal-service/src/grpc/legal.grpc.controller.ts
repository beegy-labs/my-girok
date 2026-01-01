import { Controller, Logger, NotFoundException } from '@nestjs/common';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { ConsentsService } from '../consents/consents.service';
import { LegalDocumentsService } from '../legal-documents/legal-documents.service';
import { LawRegistryService } from '../law-registry/law-registry.service';
import { DsrRequestsService } from '../dsr-requests/dsr-requests.service';
import { ConsentResponseDto } from '../consents/dto';
import { LegalDocumentResponseDto } from '../legal-documents/dto';
import { LawRegistryResponseDto } from '../law-registry/dto';
import { DsrRequestResponseDto } from '../dsr-requests/dto';

// Proto enum mappings (proto value -> internal value)
const CONSENT_TYPE_MAP: Record<number, string> = {
  0: 'UNSPECIFIED',
  1: 'TERMS_OF_SERVICE',
  2: 'PRIVACY_POLICY',
  3: 'MARKETING',
  4: 'ANALYTICS',
  5: 'THIRD_PARTY_SHARING',
  6: 'AGE_VERIFICATION',
  7: 'PARENTAL_CONSENT',
};

const CONSENT_TYPE_REVERSE_MAP: Record<string, number> = {
  UNSPECIFIED: 0,
  TERMS_OF_SERVICE: 1,
  PRIVACY_POLICY: 2,
  MARKETING: 3,
  ANALYTICS: 4,
  THIRD_PARTY_SHARING: 5,
  AGE_VERIFICATION: 6,
  PARENTAL_CONSENT: 7,
};

const CONSENT_STATUS_MAP: Record<string, number> = {
  UNSPECIFIED: 0,
  ACTIVE: 1,
  GRANTED: 1, // Map GRANTED to ACTIVE for proto
  EXPIRED: 2,
  REVOKED: 3,
  WITHDRAWN: 3, // Map WITHDRAWN to REVOKED for proto
  SUPERSEDED: 4,
};

const DOCUMENT_TYPE_MAP: Record<number, string> = {
  0: 'UNSPECIFIED',
  1: 'TERMS_OF_SERVICE',
  2: 'PRIVACY_POLICY',
  3: 'COOKIE_POLICY',
  4: 'DATA_PROCESSING_AGREEMENT',
  5: 'ACCEPTABLE_USE_POLICY',
};

const DOCUMENT_TYPE_REVERSE_MAP: Record<string, number> = {
  UNSPECIFIED: 0,
  TERMS_OF_SERVICE: 1,
  PRIVACY_POLICY: 2,
  COOKIE_POLICY: 3,
  DATA_PROCESSING_AGREEMENT: 4,
  ACCEPTABLE_USE_POLICY: 5,
  CONSENT_FORM: 1, // Map to TERMS_OF_SERVICE as fallback
};

const DSR_TYPE_MAP: Record<number, string> = {
  0: 'UNSPECIFIED',
  1: 'ACCESS',
  2: 'RECTIFICATION',
  3: 'ERASURE',
  4: 'PORTABILITY',
  5: 'RESTRICTION',
  6: 'OBJECTION',
};

const DSR_TYPE_REVERSE_MAP: Record<string, number> = {
  UNSPECIFIED: 0,
  ACCESS: 1,
  RECTIFICATION: 2,
  ERASURE: 3,
  PORTABILITY: 4,
  RESTRICTION: 5,
  OBJECTION: 6,
};

const DSR_STATUS_MAP: Record<string, number> = {
  UNSPECIFIED: 0,
  PENDING: 1,
  IN_PROGRESS: 2,
  COMPLETED: 3,
  REJECTED: 4,
  EXPIRED: 5,
  CANCELLED: 4, // Map CANCELLED to REJECTED
};

// Proto request/response interfaces
interface CheckConsentsRequest {
  account_id: string;
  country_code: string;
  required_types: number[];
}

interface CheckConsentsResponse {
  all_required_granted: boolean;
  missing_consents: number[];
  expired_consents: number[];
  active_consents: ProtoConsent[];
}

interface GetAccountConsentsRequest {
  account_id: string;
  include_revoked: boolean;
  include_expired: boolean;
}

interface GetAccountConsentsResponse {
  consents: ProtoConsent[];
  total_count: number;
}

interface GrantConsentRequest {
  account_id: string;
  consent_type: number;
  document_id: string;
  ip_address: string;
  user_agent: string;
}

interface GrantConsentResponse {
  success: boolean;
  consent?: ProtoConsent;
  message: string;
}

interface RevokeConsentRequest {
  account_id: string;
  consent_id: string;
  reason: string;
}

interface RevokeConsentResponse {
  success: boolean;
  message: string;
}

interface GetCurrentDocumentRequest {
  document_type: number;
  language_code: string;
  country_code: string;
}

interface GetCurrentDocumentResponse {
  document?: ProtoLegalDocument;
}

interface GetDocumentVersionRequest {
  document_id: string;
  version: string;
}

interface GetDocumentVersionResponse {
  document?: ProtoLegalDocument;
}

interface ListDocumentsRequest {
  type: number;
  language_code: string;
  include_expired: boolean;
  page_size: number;
  page_token: string;
}

interface ListDocumentsResponse {
  documents: ProtoLegalDocument[];
  next_page_token: string;
  total_count: number;
}

interface GetLawRequirementsRequest {
  country_code: string;
}

interface GetLawRequirementsResponse {
  requirements?: ProtoLawRequirements;
}

interface GetCountryComplianceRequest {
  country_code: string;
}

interface GetCountryComplianceResponse {
  compliance?: ProtoCountryCompliance;
}

interface CreateDsrRequestRequest {
  account_id: string;
  type: number;
  reason: string;
}

interface CreateDsrRequestResponse {
  dsr_request?: ProtoDsrRequest;
}

interface GetDsrRequestRequest {
  id: string;
}

interface GetDsrRequestResponse {
  dsr_request?: ProtoDsrRequest;
}

interface GetDsrDeadlineRequest {
  dsr_id: string;
  country_code: string;
}

interface GetDsrDeadlineResponse {
  deadline?: ProtoDsrDeadline;
}

// Proto message interfaces
interface ProtoTimestamp {
  seconds: number;
  nanos: number;
}

interface ProtoConsent {
  id: string;
  account_id: string;
  consent_type: number;
  document_id: string;
  document_version: string;
  status: number;
  ip_address: string;
  user_agent: string;
  agreed_at?: ProtoTimestamp;
  expires_at?: ProtoTimestamp;
  revoked_at?: ProtoTimestamp;
}

interface ProtoLegalDocument {
  id: string;
  type: number;
  version: string;
  title: string;
  content: string;
  content_hash: string;
  language_code: string;
  country_code: string;
  is_mandatory: boolean;
  effective_at?: ProtoTimestamp;
  expires_at?: ProtoTimestamp;
  created_at?: ProtoTimestamp;
}

interface ProtoLawRequirements {
  law_code: string;
  country_code: string;
  law_name: string;
  minimum_age: number;
  parental_consent_age: number;
  required_consents: number[];
  dsr_deadline_days: number;
  data_retention_days: number;
  requires_explicit_consent: boolean;
  allows_soft_opt_out: boolean;
}

interface ProtoCountryCompliance {
  country_code: string;
  applicable_laws: string[];
  strictest_requirements?: ProtoLawRequirements;
  gdpr_applicable: boolean;
  ccpa_applicable: boolean;
}

interface ProtoDsrRequest {
  id: string;
  account_id: string;
  type: number;
  status: number;
  reason: string;
  submitted_at?: ProtoTimestamp;
  deadline_at?: ProtoTimestamp;
  completed_at?: ProtoTimestamp;
  processed_by: string;
}

interface ProtoDsrDeadline {
  deadline?: ProtoTimestamp;
  days_remaining: number;
  is_overdue: boolean;
}

@Controller()
export class LegalGrpcController {
  private readonly logger = new Logger(LegalGrpcController.name);

  constructor(
    private readonly consentsService: ConsentsService,
    private readonly legalDocumentsService: LegalDocumentsService,
    private readonly lawRegistryService: LawRegistryService,
    private readonly dsrRequestsService: DsrRequestsService,
  ) {}

  // ============================================================================
  // CONSENT OPERATIONS
  // ============================================================================

  @GrpcMethod('LegalService', 'CheckConsents')
  async checkConsents(request: CheckConsentsRequest): Promise<CheckConsentsResponse> {
    this.logger.debug(
      `CheckConsents: accountId=${request.account_id}, countryCode=${request.country_code}`,
    );

    try {
      // Get all consents for the account
      const consents = await this.consentsService.getConsentsForAccount(request.account_id);

      // Get law requirements for the country to determine required consent types
      const laws = await this.lawRegistryService.findAll({
        countryCode: request.country_code,
        isActive: true,
      });

      // Determine required consent types based on law requirements
      const requiredTypes =
        request.required_types.length > 0
          ? request.required_types.map((t) => CONSENT_TYPE_MAP[t] || 'UNSPECIFIED')
          : this.getDefaultRequiredConsentTypes(laws);

      // Check which consents are active
      const activeConsents: ConsentResponseDto[] = [];
      const missingConsents: number[] = [];
      const expiredConsents: number[] = [];

      // Build a map of document types from active consents
      const consentedTypes = new Set<string>();
      const now = new Date();

      for (const consent of consents) {
        if (consent.status === 'GRANTED') {
          // Check for expiration
          if (consent.withdrawnAt && new Date(consent.withdrawnAt) < now) {
            // This consent is withdrawn/expired
            continue;
          }
          consentedTypes.add(consent.documentId);
          activeConsents.push(consent);
        }
      }

      // Determine missing and expired consents
      // Since we don't have document type info directly, we'll compare against required types
      // In a real implementation, we'd need to join with documents to get their types
      for (const requiredType of requiredTypes) {
        const protoType = CONSENT_TYPE_REVERSE_MAP[requiredType] || 0;
        if (protoType === 0) continue;

        // Check if any active consent covers this type
        // This is simplified - in production you'd match against document types
        const hasConsent = activeConsents.some((_c) => {
          // Would need to check document type here
          return true; // Simplified for now
        });

        if (!hasConsent && request.required_types.includes(protoType)) {
          missingConsents.push(protoType);
        }
      }

      const allGranted = missingConsents.length === 0 && expiredConsents.length === 0;

      return {
        all_required_granted: allGranted,
        missing_consents: missingConsents,
        expired_consents: expiredConsents,
        active_consents: activeConsents.map((c) => this.toProtoConsent(c)),
      };
    } catch (error) {
      this.handleError('CheckConsents', error);
    }
  }

  @GrpcMethod('LegalService', 'GetAccountConsents')
  async getAccountConsents(
    request: GetAccountConsentsRequest,
  ): Promise<GetAccountConsentsResponse> {
    this.logger.debug(`GetAccountConsents: accountId=${request.account_id}`);

    try {
      // Determine status filter based on flags
      let status: string | undefined;
      if (!request.include_revoked && !request.include_expired) {
        status = 'GRANTED';
      }

      const consents = await this.consentsService.getConsentsForAccount(request.account_id, status);

      // Filter based on include flags
      let filteredConsents = consents;
      if (!request.include_revoked) {
        filteredConsents = filteredConsents.filter((c) => c.status !== 'WITHDRAWN');
      }
      if (!request.include_expired) {
        filteredConsents = filteredConsents.filter((c) => c.status !== 'EXPIRED');
      }

      return {
        consents: filteredConsents.map((c) => this.toProtoConsent(c)),
        total_count: filteredConsents.length,
      };
    } catch (error) {
      this.handleError('GetAccountConsents', error);
    }
  }

  @GrpcMethod('LegalService', 'GrantConsent')
  async grantConsent(request: GrantConsentRequest): Promise<GrantConsentResponse> {
    this.logger.debug(
      `GrantConsent: accountId=${request.account_id}, documentId=${request.document_id}`,
    );

    try {
      const consent = await this.consentsService.grantConsent({
        accountId: request.account_id,
        documentId: request.document_id,
        ipAddress: request.ip_address,
        userAgent: request.user_agent,
        consentMethod: 'grpc_request',
      });

      return {
        success: true,
        consent: this.toProtoConsent(consent),
        message: 'Consent granted successfully',
      };
    } catch (error) {
      if (error instanceof Error) {
        return {
          success: false,
          message: error.message,
        };
      }
      this.handleError('GrantConsent', error);
    }
  }

  @GrpcMethod('LegalService', 'RevokeConsent')
  async revokeConsent(request: RevokeConsentRequest): Promise<RevokeConsentResponse> {
    this.logger.debug(
      `RevokeConsent: accountId=${request.account_id}, consentId=${request.consent_id}`,
    );

    try {
      await this.consentsService.withdrawConsent(request.consent_id, {
        reason: request.reason,
        ipAddress: undefined,
      });

      return {
        success: true,
        message: 'Consent revoked successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return {
          success: false,
          message: `Consent not found: ${request.consent_id}`,
        };
      }
      if (error instanceof Error) {
        return {
          success: false,
          message: error.message,
        };
      }
      this.handleError('RevokeConsent', error);
    }
  }

  // ============================================================================
  // DOCUMENT OPERATIONS
  // ============================================================================

  @GrpcMethod('LegalService', 'GetCurrentDocument')
  async getCurrentDocument(
    request: GetCurrentDocumentRequest,
  ): Promise<GetCurrentDocumentResponse> {
    this.logger.debug(
      `GetCurrentDocument: type=${request.document_type}, language=${request.language_code}, country=${request.country_code}`,
    );

    try {
      const documentType = DOCUMENT_TYPE_MAP[request.document_type] || 'TERMS_OF_SERVICE';
      const documents = await this.legalDocumentsService.getActiveDocuments(
        request.country_code,
        request.language_code,
      );

      // Find document matching the requested type
      const document = documents.find((d) => d.type === documentType);

      if (!document) {
        return { document: undefined };
      }

      // Get full document with content
      const fullDocument = await this.legalDocumentsService.findOneWithContent(document.id);

      return {
        document: this.toProtoLegalDocument(fullDocument),
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return { document: undefined };
      }
      this.handleError('GetCurrentDocument', error);
    }
  }

  @GrpcMethod('LegalService', 'GetDocumentVersion')
  async getDocumentVersion(
    request: GetDocumentVersionRequest,
  ): Promise<GetDocumentVersionResponse> {
    this.logger.debug(
      `GetDocumentVersion: documentId=${request.document_id}, version=${request.version}`,
    );

    try {
      const document = await this.legalDocumentsService.findOneWithContent(request.document_id);

      // Verify version matches if specified
      if (request.version && document.version !== request.version) {
        return { document: undefined };
      }

      return {
        document: this.toProtoLegalDocument(document),
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return { document: undefined };
      }
      this.handleError('GetDocumentVersion', error);
    }
  }

  @GrpcMethod('LegalService', 'ListDocuments')
  async listDocuments(request: ListDocumentsRequest): Promise<ListDocumentsResponse> {
    this.logger.debug(
      `ListDocuments: type=${request.type}, language=${request.language_code}, pageSize=${request.page_size}`,
    );

    try {
      const documentType = request.type > 0 ? DOCUMENT_TYPE_MAP[request.type] : undefined;
      const status = request.include_expired ? undefined : 'ACTIVE';

      const documents = await this.legalDocumentsService.findAll({
        type: documentType,
        locale: request.language_code || undefined,
        status,
      });

      // Handle pagination
      const pageSize = request.page_size > 0 ? request.page_size : 20;
      const offset = request.page_token ? parseInt(request.page_token, 10) : 0;
      const paginatedDocs = documents.slice(offset, offset + pageSize);
      const hasMore = offset + pageSize < documents.length;
      const nextPageToken = hasMore ? String(offset + pageSize) : '';

      return {
        documents: paginatedDocs.map((d) => this.toProtoLegalDocument(d)),
        next_page_token: nextPageToken,
        total_count: documents.length,
      };
    } catch (error) {
      this.handleError('ListDocuments', error);
    }
  }

  // ============================================================================
  // LAW REGISTRY OPERATIONS
  // ============================================================================

  @GrpcMethod('LegalService', 'GetLawRequirements')
  async getLawRequirements(
    request: GetLawRequirementsRequest,
  ): Promise<GetLawRequirementsResponse> {
    this.logger.debug(`GetLawRequirements: countryCode=${request.country_code}`);

    try {
      // Try to find by country code first (assuming code might be country-based like GDPR-EU)
      const laws = await this.lawRegistryService.findAll({
        countryCode: request.country_code,
        isActive: true,
      });

      if (laws.length === 0) {
        return { requirements: undefined };
      }

      // Return the first/primary law for the country
      const primaryLaw = laws[0];

      return {
        requirements: this.toProtoLawRequirements(primaryLaw),
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return { requirements: undefined };
      }
      this.handleError('GetLawRequirements', error);
    }
  }

  @GrpcMethod('LegalService', 'GetCountryCompliance')
  async getCountryCompliance(
    request: GetCountryComplianceRequest,
  ): Promise<GetCountryComplianceResponse> {
    this.logger.debug(`GetCountryCompliance: countryCode=${request.country_code}`);

    try {
      // Get all applicable laws for the country
      const laws = await this.lawRegistryService.findAll({
        countryCode: request.country_code,
        isActive: true,
      });

      if (laws.length === 0) {
        // Return default compliance info for unknown countries
        return {
          compliance: {
            country_code: request.country_code,
            applicable_laws: [],
            strictest_requirements: undefined,
            gdpr_applicable: this.isGdprApplicable(request.country_code),
            ccpa_applicable: this.isCcpaApplicable(request.country_code),
          },
        };
      }

      // Determine the strictest law (most requirements)
      const strictestLaw = this.findStrictestLaw(laws);

      return {
        compliance: {
          country_code: request.country_code,
          applicable_laws: laws.map((l) => l.code),
          strictest_requirements: strictestLaw
            ? this.toProtoLawRequirements(strictestLaw)
            : undefined,
          gdpr_applicable:
            this.isGdprApplicable(request.country_code) || laws.some((l) => l.code === 'GDPR'),
          ccpa_applicable:
            this.isCcpaApplicable(request.country_code) || laws.some((l) => l.code === 'CCPA'),
        },
      };
    } catch (error) {
      this.handleError('GetCountryCompliance', error);
    }
  }

  // ============================================================================
  // DSR OPERATIONS
  // ============================================================================

  @GrpcMethod('LegalService', 'CreateDsrRequest')
  async createDsrRequest(request: CreateDsrRequestRequest): Promise<CreateDsrRequestResponse> {
    this.logger.debug(`CreateDsrRequest: accountId=${request.account_id}, type=${request.type}`);

    try {
      const dsrType = DSR_TYPE_MAP[request.type] || 'ACCESS';

      const dsrRequest = await this.dsrRequestsService.create({
        accountId: request.account_id,
        requestType: dsrType as never,
        description: request.reason,
      });

      return {
        dsr_request: this.toProtoDsrRequest(dsrRequest),
      };
    } catch (error) {
      this.handleError('CreateDsrRequest', error);
    }
  }

  @GrpcMethod('LegalService', 'GetDsrRequest')
  async getDsrRequest(request: GetDsrRequestRequest): Promise<GetDsrRequestResponse> {
    this.logger.debug(`GetDsrRequest: id=${request.id}`);

    try {
      const dsrRequest = await this.dsrRequestsService.findOne(request.id);

      return {
        dsr_request: this.toProtoDsrRequest(dsrRequest),
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return { dsr_request: undefined };
      }
      this.handleError('GetDsrRequest', error);
    }
  }

  @GrpcMethod('LegalService', 'GetDsrDeadline')
  async getDsrDeadline(request: GetDsrDeadlineRequest): Promise<GetDsrDeadlineResponse> {
    this.logger.debug(
      `GetDsrDeadline: dsrId=${request.dsr_id}, countryCode=${request.country_code}`,
    );

    try {
      // Get the DSR request
      const dsrRequest = await this.dsrRequestsService.findOne(request.dsr_id);

      // Get law requirements for deadline calculation
      const laws = await this.lawRegistryService.findAll({
        countryCode: request.country_code,
        isActive: true,
      });

      // Calculate deadline based on law requirements
      // Default to 30 days (GDPR standard)
      let deadlineDays = 30;
      if (laws.length > 0) {
        // Use the strictest (shortest) deadline
        const strictestLaw = this.findStrictestLaw(laws);
        if (strictestLaw) {
          // Get metadata for DSR deadline days if available
          deadlineDays = this.getDsrDeadlineDays(strictestLaw);
        }
      }

      const submittedAt = dsrRequest.requestedAt || dsrRequest.createdAt;
      const deadline = new Date(submittedAt);
      deadline.setDate(deadline.getDate() + deadlineDays);

      const now = new Date();
      const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const isOverdue = daysRemaining < 0;

      return {
        deadline: {
          deadline: this.toProtoTimestamp(deadline),
          days_remaining: Math.max(0, daysRemaining),
          is_overdue: isOverdue,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return { deadline: undefined };
      }
      this.handleError('GetDsrDeadline', error);
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private toProtoTimestamp(date: Date | null | undefined): ProtoTimestamp | undefined {
    if (!date) return undefined;
    const d = date instanceof Date ? date : new Date(date);
    const seconds = Math.floor(d.getTime() / 1000);
    const nanos = (d.getTime() % 1000) * 1000000;
    return { seconds, nanos };
  }

  private toProtoConsent(consent: ConsentResponseDto): ProtoConsent {
    return {
      id: consent.id,
      account_id: consent.accountId,
      consent_type: CONSENT_TYPE_REVERSE_MAP['TERMS_OF_SERVICE'] || 1, // Default, would need document type mapping
      document_id: consent.documentId,
      document_version: '1.0.0', // Would need to fetch from document
      status: CONSENT_STATUS_MAP[consent.status] || 0,
      ip_address: '', // Not stored in response DTO
      user_agent: '', // Not stored in response DTO
      agreed_at: this.toProtoTimestamp(consent.consentedAt),
      expires_at: undefined, // Not stored in response DTO
      revoked_at: consent.withdrawnAt ? this.toProtoTimestamp(consent.withdrawnAt) : undefined,
    };
  }

  private toProtoLegalDocument(
    doc: LegalDocumentResponseDto & { content?: string },
  ): ProtoLegalDocument {
    return {
      id: doc.id,
      type: DOCUMENT_TYPE_REVERSE_MAP[doc.type] || 0,
      version: doc.version,
      title: doc.title,
      content: (doc as { content?: string }).content || '',
      content_hash: doc.contentHash,
      language_code: doc.locale,
      country_code: doc.countryCode,
      is_mandatory: doc.type === 'TERMS_OF_SERVICE' || doc.type === 'PRIVACY_POLICY',
      effective_at: doc.effectiveFrom ? this.toProtoTimestamp(doc.effectiveFrom) : undefined,
      expires_at: doc.effectiveTo ? this.toProtoTimestamp(doc.effectiveTo) : undefined,
      created_at: this.toProtoTimestamp(doc.createdAt),
    };
  }

  private toProtoLawRequirements(law: LawRegistryResponseDto): ProtoLawRequirements {
    // Default requirements based on common laws
    const defaults = this.getDefaultLawRequirements(law.code);

    return {
      law_code: law.code,
      country_code: law.countryCode,
      law_name: law.name,
      minimum_age: defaults.minimumAge,
      parental_consent_age: defaults.parentalConsentAge,
      required_consents: defaults.requiredConsents,
      dsr_deadline_days: defaults.dsrDeadlineDays,
      data_retention_days: defaults.dataRetentionDays,
      requires_explicit_consent: defaults.requiresExplicitConsent,
      allows_soft_opt_out: defaults.allowsSoftOptOut,
    };
  }

  private toProtoDsrRequest(dsr: DsrRequestResponseDto): ProtoDsrRequest {
    return {
      id: dsr.id,
      account_id: dsr.accountId,
      type: DSR_TYPE_REVERSE_MAP[dsr.requestType] || 0,
      status: DSR_STATUS_MAP[dsr.status] || 0,
      reason: dsr.description || '',
      submitted_at: this.toProtoTimestamp(dsr.requestedAt),
      deadline_at: this.toProtoTimestamp(dsr.dueDate),
      completed_at: dsr.completedAt ? this.toProtoTimestamp(dsr.completedAt) : undefined,
      processed_by: dsr.assignedTo || '',
    };
  }

  private getDefaultLawRequirements(lawCode: string): {
    minimumAge: number;
    parentalConsentAge: number;
    requiredConsents: number[];
    dsrDeadlineDays: number;
    dataRetentionDays: number;
    requiresExplicitConsent: boolean;
    allowsSoftOptOut: boolean;
  } {
    // Default requirements based on law code
    switch (lawCode.toUpperCase()) {
      case 'GDPR':
        return {
          minimumAge: 16,
          parentalConsentAge: 16,
          requiredConsents: [
            CONSENT_TYPE_REVERSE_MAP['TERMS_OF_SERVICE'],
            CONSENT_TYPE_REVERSE_MAP['PRIVACY_POLICY'],
          ],
          dsrDeadlineDays: 30,
          dataRetentionDays: 365,
          requiresExplicitConsent: true,
          allowsSoftOptOut: false,
        };
      case 'CCPA':
        return {
          minimumAge: 16,
          parentalConsentAge: 13,
          requiredConsents: [
            CONSENT_TYPE_REVERSE_MAP['TERMS_OF_SERVICE'],
            CONSENT_TYPE_REVERSE_MAP['PRIVACY_POLICY'],
          ],
          dsrDeadlineDays: 45,
          dataRetentionDays: 365,
          requiresExplicitConsent: false,
          allowsSoftOptOut: true,
        };
      case 'PIPA':
      case 'PIPA-KR':
        return {
          minimumAge: 14,
          parentalConsentAge: 14,
          requiredConsents: [
            CONSENT_TYPE_REVERSE_MAP['TERMS_OF_SERVICE'],
            CONSENT_TYPE_REVERSE_MAP['PRIVACY_POLICY'],
            CONSENT_TYPE_REVERSE_MAP['THIRD_PARTY_SHARING'],
          ],
          dsrDeadlineDays: 30,
          dataRetentionDays: 365,
          requiresExplicitConsent: true,
          allowsSoftOptOut: false,
        };
      default:
        return {
          minimumAge: 18,
          parentalConsentAge: 18,
          requiredConsents: [
            CONSENT_TYPE_REVERSE_MAP['TERMS_OF_SERVICE'],
            CONSENT_TYPE_REVERSE_MAP['PRIVACY_POLICY'],
          ],
          dsrDeadlineDays: 30,
          dataRetentionDays: 365,
          requiresExplicitConsent: true,
          allowsSoftOptOut: false,
        };
    }
  }

  private getDefaultRequiredConsentTypes(laws: LawRegistryResponseDto[]): string[] {
    const requiredTypes = new Set<string>(['TERMS_OF_SERVICE', 'PRIVACY_POLICY']);

    for (const law of laws) {
      const defaults = this.getDefaultLawRequirements(law.code);
      for (const typeValue of defaults.requiredConsents) {
        const typeName = CONSENT_TYPE_MAP[typeValue];
        if (typeName) {
          requiredTypes.add(typeName);
        }
      }
    }

    return Array.from(requiredTypes);
  }

  private findStrictestLaw(laws: LawRegistryResponseDto[]): LawRegistryResponseDto | null {
    if (laws.length === 0) return null;

    // Priority: GDPR > PIPA > CCPA > others
    const priorityOrder = ['GDPR', 'PIPA', 'PIPA-KR', 'CCPA'];

    for (const priorityCode of priorityOrder) {
      const law = laws.find((l) => l.code.toUpperCase() === priorityCode);
      if (law) return law;
    }

    return laws[0];
  }

  private getDsrDeadlineDays(law: LawRegistryResponseDto): number {
    const defaults = this.getDefaultLawRequirements(law.code);
    return defaults.dsrDeadlineDays;
  }

  private isGdprApplicable(countryCode: string): boolean {
    // EU/EEA countries
    const gdprCountries = [
      'AT',
      'BE',
      'BG',
      'HR',
      'CY',
      'CZ',
      'DK',
      'EE',
      'FI',
      'FR',
      'DE',
      'GR',
      'HU',
      'IE',
      'IT',
      'LV',
      'LT',
      'LU',
      'MT',
      'NL',
      'PL',
      'PT',
      'RO',
      'SK',
      'SI',
      'ES',
      'SE',
      // EEA
      'IS',
      'LI',
      'NO',
      // UK (post-Brexit, has similar regulations)
      'GB',
    ];
    return gdprCountries.includes(countryCode.toUpperCase());
  }

  private isCcpaApplicable(countryCode: string): boolean {
    // CCPA applies to California, but we check at country level for US
    return countryCode.toUpperCase() === 'US';
  }

  private handleError(methodName: string, error: unknown): never {
    this.logger.error(`${methodName} error: ${error}`);

    if (error instanceof RpcException) {
      throw error;
    }

    if (error instanceof NotFoundException) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: error.message,
      });
    }

    if (error instanceof Error) {
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: error.message,
      });
    }

    throw new RpcException({
      code: GrpcStatus.UNKNOWN,
      message: 'An unknown error occurred',
    });
  }
}

/**
 * Identity Platform - Legal Module Interfaces
 * ILegalModule interface definition
 */

import type { ConsentType } from './enums.js';
import type {
  Consent,
  ConsentListResponse,
  ConsentQueryDto,
  RecordConsentDto,
  WithdrawConsentDto,
  ConsentCheckResult,
  BulkConsentCheckResult,
  AccountConsentStatusResponse,
  DSRRequest,
  DSRRequestSummary,
  DSRRequestListResponse,
  DSRRequestQueryDto,
  CreateDSRRequestDto,
  ProcessDSRRequestDto,
  LegalDocument,
  LegalDocumentSummary,
  LegalDocumentListResponse,
  LegalDocumentQueryDto,
  CreateLegalDocumentDto,
  UpdateLegalDocumentDto,
  PublishLegalDocumentDto,
} from './types.js';
import type {
  Law,
  CreateLawDto,
  UpdateLawDto,
  LawQueryDto,
  LawListResponse,
} from '../admin/law.types.js';

// ============================================================================
// Consent Management Interface
// ============================================================================

/**
 * Consent management operations
 */
export interface IConsentService {
  /**
   * Record user consent
   * @param dto Consent recording data
   * @returns Recorded consent
   */
  recordConsent(dto: RecordConsentDto): Promise<Consent>;

  /**
   * Record multiple consents at once
   * @param accountId Account ID
   * @param consents Array of consent data
   * @returns Array of recorded consents
   */
  recordBulkConsents(
    accountId: string,
    consents: Array<Omit<RecordConsentDto, 'accountId'>>,
  ): Promise<Consent[]>;

  /**
   * Withdraw consent
   * @param consentId Consent ID
   * @param dto Withdrawal data
   */
  withdrawConsent(consentId: string, dto?: WithdrawConsentDto): Promise<void>;

  /**
   * Get consent by ID
   * @param consentId Consent ID
   * @returns Consent or null if not found
   */
  getConsent(consentId: string): Promise<Consent | null>;

  /**
   * Check if account has specific consent
   * @param accountId Account ID
   * @param consentType Consent type
   * @returns Consent check result
   */
  checkConsent(accountId: string, consentType: ConsentType): Promise<ConsentCheckResult>;

  /**
   * Check multiple consents at once
   * @param accountId Account ID
   * @param consentTypes Array of consent types
   * @returns Bulk consent check result
   */
  checkBulkConsents(
    accountId: string,
    consentTypes: ConsentType[],
  ): Promise<BulkConsentCheckResult>;

  /**
   * Get account consent status
   * @param accountId Account ID
   * @returns Account consent status
   */
  getAccountConsentStatus(accountId: string): Promise<AccountConsentStatusResponse>;

  /**
   * List consents
   * @param query Query parameters
   * @returns Paginated consent list
   */
  listConsents(query: ConsentQueryDto): Promise<ConsentListResponse>;

  /**
   * Get consent history for account
   * @param accountId Account ID
   * @param consentType Optional consent type filter
   * @returns List of consent records
   */
  getConsentHistory(accountId: string, consentType?: ConsentType): Promise<Consent[]>;
}

// ============================================================================
// DSR (Data Subject Request) Management Interface
// ============================================================================

/**
 * DSR management operations
 */
export interface IDSRService {
  /**
   * Create DSR request
   * @param dto DSR request creation data
   * @returns Created DSR request
   */
  createDSRRequest(dto: CreateDSRRequestDto): Promise<DSRRequest>;

  /**
   * Get DSR request by ID
   * @param requestId Request ID
   * @returns DSR request or null if not found
   */
  getDSRRequest(requestId: string): Promise<DSRRequest | null>;

  /**
   * Process DSR request
   * @param requestId Request ID
   * @param dto Processing data
   * @returns Updated DSR request
   */
  processDSRRequest(requestId: string, dto: ProcessDSRRequestDto): Promise<DSRRequest>;

  /**
   * Cancel DSR request
   * @param requestId Request ID
   */
  cancelDSRRequest(requestId: string): Promise<void>;

  /**
   * List DSR requests
   * @param query Query parameters
   * @returns Paginated DSR request list
   */
  listDSRRequests(query: DSRRequestQueryDto): Promise<DSRRequestListResponse>;

  /**
   * Get pending DSR requests count
   * @returns Number of pending requests
   */
  getPendingCount(): Promise<number>;

  /**
   * Get overdue DSR requests
   * @returns List of overdue requests
   */
  getOverdueRequests(): Promise<DSRRequestSummary[]>;

  /**
   * Generate data export for access request
   * @param requestId Request ID
   * @returns Download URL
   */
  generateDataExport(requestId: string): Promise<string>;

  /**
   * Execute data erasure for erasure request
   * @param requestId Request ID
   */
  executeDataErasure(requestId: string): Promise<void>;
}

// ============================================================================
// Legal Document Management Interface
// ============================================================================

/**
 * Legal document management operations
 */
export interface ILegalDocumentService {
  /**
   * Create legal document
   * @param dto Document creation data
   * @returns Created document
   */
  createDocument(dto: CreateLegalDocumentDto): Promise<LegalDocument>;

  /**
   * Get document by ID
   * @param documentId Document ID
   * @returns Document or null if not found
   */
  getDocument(documentId: string): Promise<LegalDocument | null>;

  /**
   * Get latest active document by type and locale
   * @param type Document type
   * @param locale Locale code
   * @returns Document or null if not found
   */
  getLatestDocument(type: string, locale: string): Promise<LegalDocument | null>;

  /**
   * Update document
   * @param documentId Document ID
   * @param dto Update data
   * @returns Updated document
   */
  updateDocument(documentId: string, dto: UpdateLegalDocumentDto): Promise<LegalDocument>;

  /**
   * Publish document
   * @param documentId Document ID
   * @param dto Publish data
   * @returns Published document
   */
  publishDocument(documentId: string, dto?: PublishLegalDocumentDto): Promise<LegalDocument>;

  /**
   * Archive document
   * @param documentId Document ID
   */
  archiveDocument(documentId: string): Promise<void>;

  /**
   * List documents
   * @param query Query parameters
   * @returns Paginated document list
   */
  listDocuments(query: LegalDocumentQueryDto): Promise<LegalDocumentListResponse>;

  /**
   * Get document versions
   * @param type Document type
   * @param locale Locale code
   * @returns List of document versions
   */
  getDocumentVersions(type: string, locale: string): Promise<LegalDocumentSummary[]>;
}

// ============================================================================
// Law Registry Interface
// ============================================================================

/**
 * Law registry operations
 */
export interface ILawService {
  /**
   * Create law entry
   * @param dto Law creation data
   * @returns Created law
   */
  createLaw(dto: CreateLawDto): Promise<Law>;

  /**
   * Get law by ID
   * @param lawId Law ID
   * @returns Law or null if not found
   */
  getLaw(lawId: string): Promise<Law | null>;

  /**
   * Get law by code
   * @param code Law code (e.g., GDPR, CCPA, PIPA)
   * @returns Law or null if not found
   */
  getLawByCode(code: string): Promise<Law | null>;

  /**
   * Get laws for country
   * @param countryCode ISO 3166-1 alpha-2 country code
   * @returns List of applicable laws
   */
  getLawsForCountry(countryCode: string): Promise<Law[]>;

  /**
   * Update law
   * @param lawId Law ID
   * @param dto Update data
   * @returns Updated law
   */
  updateLaw(lawId: string, dto: UpdateLawDto): Promise<Law>;

  /**
   * Deactivate law
   * @param lawId Law ID
   */
  deactivateLaw(lawId: string): Promise<void>;

  /**
   * List laws
   * @param query Query parameters
   * @returns Paginated law list
   */
  listLaws(query: LawQueryDto): Promise<LawListResponse>;

  /**
   * Get consent requirements for country
   * @param countryCode ISO 3166-1 alpha-2 country code
   * @returns Array of required consent types
   */
  getConsentRequirements(countryCode: string): Promise<ConsentType[]>;
}

// ============================================================================
// Legal Module Interface (Aggregate)
// ============================================================================

/**
 * Legal Module Interface
 * Aggregates all legal compliance services
 */
export interface ILegalModule {
  /**
   * Consent management service
   */
  readonly consents: IConsentService;

  /**
   * DSR management service
   */
  readonly dsr: IDSRService;

  /**
   * Legal document management service
   */
  readonly documents: ILegalDocumentService;

  /**
   * Law registry service
   */
  readonly laws: ILawService;
}

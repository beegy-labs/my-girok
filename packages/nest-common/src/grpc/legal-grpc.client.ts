/**
 * Legal Service gRPC Client
 *
 * Provides a typed client for calling the LegalService via gRPC.
 *
 * @see packages/proto/legal/v1/legal.proto
 */

import { Injectable, OnModuleInit, Logger, Inject } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, timeout, catchError, throwError } from 'rxjs';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { GRPC_SERVICES } from './grpc.options';
import { GrpcError, isGrpcError } from './identity-grpc.client';
import {
  ILegalService,
  CheckConsentsRequest,
  CheckConsentsResponse,
  GetAccountConsentsRequest,
  GetAccountConsentsResponse,
  GrantConsentRequest,
  GrantConsentResponse,
  RevokeConsentRequest,
  RevokeConsentResponse,
  GetCurrentDocumentRequest,
  GetCurrentDocumentResponse,
  GetDocumentVersionRequest,
  GetDocumentVersionResponse,
  ListDocumentsRequest,
  ListDocumentsResponse,
  GetLawRequirementsRequest,
  GetLawRequirementsResponse,
  GetCountryComplianceRequest,
  GetCountryComplianceResponse,
  CreateDsrRequestRequest,
  CreateDsrRequestResponse,
  GetDsrRequestRequest,
  GetDsrRequestResponse,
  GetDsrDeadlineRequest,
  GetDsrDeadlineResponse,
  ConsentType,
  DocumentType,
  DsrType,
} from './grpc.types';

/**
 * Default timeout for gRPC calls (5 seconds)
 */
const DEFAULT_TIMEOUT = 5000;

/**
 * Legal Service gRPC Client
 *
 * Usage:
 * ```typescript
 * @Module({
 *   imports: [GrpcClientsModule.forRoot({ legal: true })],
 * })
 * export class AppModule {}
 *
 * @Injectable()
 * class SomeService {
 *   constructor(private readonly legalClient: LegalGrpcClient) {}
 *
 *   async checkUserConsents(accountId: string, countryCode: string) {
 *     return this.legalClient.checkConsents({
 *       account_id: accountId,
 *       country_code: countryCode,
 *       required_types: [ConsentType.CONSENT_TYPE_TERMS_OF_SERVICE],
 *     });
 *   }
 * }
 * ```
 */
@Injectable()
export class LegalGrpcClient implements OnModuleInit {
  private readonly logger = new Logger(LegalGrpcClient.name);
  private legalService!: ILegalService;
  private timeoutMs = DEFAULT_TIMEOUT;

  constructor(
    @Inject(GRPC_SERVICES.LEGAL)
    private readonly client: ClientGrpc,
  ) {}

  onModuleInit() {
    this.legalService = this.client.getService<ILegalService>('LegalService');
    this.logger.log('LegalGrpcClient initialized');
  }

  /**
   * Set request timeout (in milliseconds)
   */
  setTimeout(ms: number): this {
    this.timeoutMs = ms;
    return this;
  }

  // ============================================================================
  // Consent Operations
  // ============================================================================

  /**
   * Check if account has all required consents
   */
  async checkConsents(request: CheckConsentsRequest): Promise<CheckConsentsResponse> {
    return this.call('CheckConsents', () => this.legalService.checkConsents(request));
  }

  /**
   * Get all consents for an account
   */
  async getAccountConsents(
    request: GetAccountConsentsRequest,
  ): Promise<GetAccountConsentsResponse> {
    return this.call('GetAccountConsents', () => this.legalService.getAccountConsents(request));
  }

  /**
   * Grant consent for a document
   */
  async grantConsent(request: GrantConsentRequest): Promise<GrantConsentResponse> {
    return this.call('GrantConsent', () => this.legalService.grantConsent(request));
  }

  /**
   * Revoke a consent
   */
  async revokeConsent(request: RevokeConsentRequest): Promise<RevokeConsentResponse> {
    return this.call('RevokeConsent', () => this.legalService.revokeConsent(request));
  }

  // ============================================================================
  // Document Operations
  // ============================================================================

  /**
   * Get current version of a document
   */
  async getCurrentDocument(
    request: GetCurrentDocumentRequest,
  ): Promise<GetCurrentDocumentResponse> {
    return this.call('GetCurrentDocument', () => this.legalService.getCurrentDocument(request));
  }

  /**
   * Get specific version of a document
   */
  async getDocumentVersion(
    request: GetDocumentVersionRequest,
  ): Promise<GetDocumentVersionResponse> {
    return this.call('GetDocumentVersion', () => this.legalService.getDocumentVersion(request));
  }

  /**
   * List documents with pagination
   */
  async listDocuments(request: ListDocumentsRequest): Promise<ListDocumentsResponse> {
    return this.call('ListDocuments', () => this.legalService.listDocuments(request));
  }

  // ============================================================================
  // Law Registry Operations
  // ============================================================================

  /**
   * Get law requirements for a country
   */
  async getLawRequirements(
    request: GetLawRequirementsRequest,
  ): Promise<GetLawRequirementsResponse> {
    return this.call('GetLawRequirements', () => this.legalService.getLawRequirements(request));
  }

  /**
   * Get compliance information for a country
   */
  async getCountryCompliance(
    request: GetCountryComplianceRequest,
  ): Promise<GetCountryComplianceResponse> {
    return this.call('GetCountryCompliance', () => this.legalService.getCountryCompliance(request));
  }

  // ============================================================================
  // DSR Operations
  // ============================================================================

  /**
   * Create a new DSR (Data Subject Request)
   */
  async createDsrRequest(request: CreateDsrRequestRequest): Promise<CreateDsrRequestResponse> {
    return this.call('CreateDsrRequest', () => this.legalService.createDsrRequest(request));
  }

  /**
   * Get DSR by ID
   */
  async getDsrRequest(request: GetDsrRequestRequest): Promise<GetDsrRequestResponse> {
    return this.call('GetDsrRequest', () => this.legalService.getDsrRequest(request));
  }

  /**
   * Get DSR deadline information
   */
  async getDsrDeadline(request: GetDsrDeadlineRequest): Promise<GetDsrDeadlineResponse> {
    return this.call('GetDsrDeadline', () => this.legalService.getDsrDeadline(request));
  }

  // ============================================================================
  // Convenience Methods
  // ============================================================================

  /**
   * Check if user has accepted terms of service
   */
  async hasAcceptedTerms(accountId: string, countryCode: string): Promise<boolean> {
    const response = await this.checkConsents({
      account_id: accountId,
      country_code: countryCode,
      required_types: [ConsentType.CONSENT_TYPE_TERMS_OF_SERVICE],
    });
    return response.all_required_granted;
  }

  /**
   * Check if user has accepted privacy policy
   */
  async hasAcceptedPrivacyPolicy(accountId: string, countryCode: string): Promise<boolean> {
    const response = await this.checkConsents({
      account_id: accountId,
      country_code: countryCode,
      required_types: [ConsentType.CONSENT_TYPE_PRIVACY_POLICY],
    });
    return response.all_required_granted;
  }

  /**
   * Get current terms of service document
   */
  async getTermsOfService(languageCode: string, countryCode: string) {
    return this.getCurrentDocument({
      document_type: DocumentType.DOCUMENT_TYPE_TERMS_OF_SERVICE,
      language_code: languageCode,
      country_code: countryCode,
    });
  }

  /**
   * Get current privacy policy document
   */
  async getPrivacyPolicy(languageCode: string, countryCode: string) {
    return this.getCurrentDocument({
      document_type: DocumentType.DOCUMENT_TYPE_PRIVACY_POLICY,
      language_code: languageCode,
      country_code: countryCode,
    });
  }

  /**
   * Submit data erasure request (GDPR Right to be Forgotten)
   */
  async submitErasureRequest(accountId: string, reason: string) {
    return this.createDsrRequest({
      account_id: accountId,
      type: DsrType.DSR_TYPE_ERASURE,
      reason,
    });
  }

  /**
   * Submit data access request (GDPR Right of Access)
   */
  async submitAccessRequest(accountId: string, reason: string) {
    return this.createDsrRequest({
      account_id: accountId,
      type: DsrType.DSR_TYPE_ACCESS,
      reason,
    });
  }

  /**
   * Submit data portability request
   */
  async submitPortabilityRequest(accountId: string, reason: string) {
    return this.createDsrRequest({
      account_id: accountId,
      type: DsrType.DSR_TYPE_PORTABILITY,
      reason,
    });
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Execute a gRPC call with timeout and error handling
   */
  private async call<T>(methodName: string, fn: () => import('rxjs').Observable<T>): Promise<T> {
    this.logger.debug(`Calling LegalService.${methodName}`);

    try {
      return await firstValueFrom(
        fn().pipe(
          timeout(this.timeoutMs),
          catchError((error) => {
            this.logger.error(`LegalService.${methodName} error: ${error.message}`);
            return throwError(() => this.normalizeError(error));
          }),
        ),
      );
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  /**
   * Normalize error to consistent format
   */
  private normalizeError(error: unknown): GrpcError {
    if (isGrpcError(error)) {
      return error;
    }

    if (error instanceof Error) {
      if (error.name === 'TimeoutError') {
        return {
          code: GrpcStatus.DEADLINE_EXCEEDED,
          message: 'Request timeout',
          details: error.message,
        };
      }

      if (error.message.includes('UNAVAILABLE') || error.message.includes('ECONNREFUSED')) {
        return {
          code: GrpcStatus.UNAVAILABLE,
          message: 'Service unavailable',
          details: error.message,
        };
      }

      return {
        code: GrpcStatus.UNKNOWN,
        message: error.message,
      };
    }

    return {
      code: GrpcStatus.UNKNOWN,
      message: 'Unknown error occurred',
    };
  }
}

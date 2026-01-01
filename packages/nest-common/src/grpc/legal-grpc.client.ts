/**
 * Legal Service gRPC Client
 *
 * Provides a typed client for calling the LegalService via gRPC.
 * Includes enterprise-grade resilience patterns:
 * - Exponential backoff with jitter
 * - Circuit breaker
 * - Request timeout
 *
 * @see packages/proto/legal/v1/legal.proto
 */

import { Injectable, OnModuleInit, OnModuleDestroy, Logger, Inject } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { GRPC_SERVICES, DEFAULT_GRPC_TIMEOUT } from './grpc.options';
import {
  createGrpcResilience,
  GrpcResilience,
  ResilientCallOptions,
  grpcHealthAggregator,
  CircuitBreakerMetrics,
} from './grpc-resilience.util';
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
export class LegalGrpcClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LegalGrpcClient.name);
  private legalService!: ILegalService;
  private resilience!: GrpcResilience;
  private timeoutMs = DEFAULT_GRPC_TIMEOUT;

  constructor(
    @Inject(GRPC_SERVICES.LEGAL)
    private readonly client: ClientGrpc,
  ) {}

  onModuleInit() {
    this.legalService = this.client.getService<ILegalService>('LegalService');
    this.resilience = createGrpcResilience('LegalService', {
      timeoutMs: this.timeoutMs,
    });
    grpcHealthAggregator.register('LegalService', this.resilience);
    this.logger.log('LegalGrpcClient initialized with resilience patterns');
  }

  onModuleDestroy() {
    grpcHealthAggregator.unregister('LegalService');
  }

  /**
   * Set request timeout (in milliseconds)
   */
  setTimeout(ms: number): this {
    this.timeoutMs = ms;
    return this;
  }

  /**
   * Get circuit breaker metrics for monitoring
   */
  getCircuitBreakerMetrics(): CircuitBreakerMetrics {
    return this.resilience.getMetrics();
  }

  /**
   * Reset circuit breaker (use for manual recovery)
   */
  resetCircuitBreaker(): void {
    this.resilience.reset();
    this.logger.log('LegalGrpcClient circuit breaker reset');
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
   * Execute a gRPC call with resilience patterns (retry, circuit breaker, timeout)
   */
  private async call<T>(
    methodName: string,
    fn: () => import('rxjs').Observable<T>,
    options?: ResilientCallOptions,
  ): Promise<T> {
    this.logger.debug(`Calling LegalService.${methodName}`);

    try {
      return await this.resilience.execute(fn, {
        timeoutMs: this.timeoutMs,
        ...options,
      });
    } catch (error) {
      this.logger.error(`LegalService.${methodName} failed`, {
        error: error instanceof Error ? error.message : String(error),
        circuitState: this.resilience.getMetrics().state,
      });
      throw error;
    }
  }
}

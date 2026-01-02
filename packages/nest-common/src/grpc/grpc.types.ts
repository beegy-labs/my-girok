/**
 * gRPC Types and Interfaces
 *
 * TypeScript types matching the proto definitions for:
 * - IdentityService (identity.v1)
 * - AuthService (auth.v1)
 * - LegalService (legal.v1)
 *
 * IMPORTANT: Proto Wire Types vs Application Types
 * ================================================
 *
 * This file contains Proto wire format types (numeric enums matching protobuf).
 * For application-layer types with string enums, use @my-girok/types:
 *
 * Proto Wire Types (this file):
 * - AccountStatus.ACCOUNT_STATUS_ACTIVE = 2
 * - ConsentType.CONSENT_TYPE_MARKETING = 3
 *
 * Application Types (@my-girok/types):
 * - AccountStatus.ACTIVE = 'ACTIVE'
 * - ConsentType.MARKETING = 'MARKETING'
 *
 * Use the mapping functions in @my-girok/types to convert:
 * - protoToAccountStatus, accountStatusToProto
 * - protoToConsentType, consentTypeToProto
 * - etc.
 *
 * @see packages/types/src/identity/types.ts
 * @see packages/types/src/legal/enums.ts
 * @see packages/types/src/auth/enums.ts
 */

import { status as GrpcStatus } from '@grpc/grpc-js';

// Re-export Proto mapping utilities from @my-girok/types for convenience
// These can be used to convert between Proto wire format and application types
export {
  // Identity mappings
  AccountStatusProto,
  AccountModeProto,
  protoToAccountStatus,
  protoToAccountMode,
  accountStatusToProto,
  accountModeToProto,
} from '@my-girok/types';

export {
  // Auth mappings
  RoleScopeProto,
  protoToRoleScope,
  roleScopeToProto,
  // Operator status mappings
  OperatorStatusProto,
  protoToOperatorStatus,
  operatorStatusToProto,
  isActiveToOperatorStatus,
  operatorStatusToIsActive,
  // Auth provider mappings
  AuthProviderProto,
  protoToAuthProvider,
  authProviderToProto,
  // Sanction severity mappings
  SanctionSeverityProto,
  protoToSanctionSeverity,
  sanctionSeverityToProto,
} from '@my-girok/types';

export {
  // Legal mappings
  ConsentTypeProto,
  ConsentStatusProto,
  DocumentTypeProto,
  DsrTypeProto,
  DsrStatusProto,
  protoToConsentType,
  protoToConsentStatus,
  protoToDocumentType,
  protoToDsrType,
  protoToDsrStatus,
  consentTypeToProto,
  consentStatusToProto,
  documentTypeToProto,
  dsrTypeToProto,
  dsrStatusToProto,
} from '@my-girok/types';

export {
  // Sanction mappings
  SubjectTypeProto,
  SanctionTypeProto,
  SanctionStatusProto,
  protoToSubjectType,
  protoToSanctionType,
  protoToSanctionStatus,
  subjectTypeToProto,
  sanctionTypeToProto,
  sanctionStatusToProto,
} from '@my-girok/types';

// ============================================================================
// Common Types
// ============================================================================

/**
 * google.protobuf.Timestamp format
 */
export interface ProtoTimestamp {
  seconds: number;
  nanos: number;
}

/**
 * gRPC error structure
 */
export interface GrpcError {
  code: GrpcStatus;
  message: string;
  details?: string;
}

/**
 * Check if error is a gRPC error
 */
export function isGrpcError(error: unknown): error is GrpcError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as GrpcError).code === 'number'
  );
}

// ============================================================================
// Identity Service Types (identity.v1)
// ============================================================================

export enum AccountStatus {
  ACCOUNT_STATUS_UNSPECIFIED = 0,
  ACCOUNT_STATUS_PENDING = 1,
  ACCOUNT_STATUS_ACTIVE = 2,
  ACCOUNT_STATUS_SUSPENDED = 3,
  ACCOUNT_STATUS_DELETED = 4,
  ACCOUNT_STATUS_LOCKED = 5,
}

export enum AccountMode {
  ACCOUNT_MODE_UNSPECIFIED = 0,
  ACCOUNT_MODE_USER = 1,
  ACCOUNT_MODE_ADMIN = 2,
  ACCOUNT_MODE_OPERATOR = 3,
  ACCOUNT_MODE_SERVICE = 4,
}

export interface Account {
  id: string;
  email: string;
  username: string;
  status: AccountStatus;
  mode: AccountMode;
  mfa_enabled: boolean;
  email_verified: boolean;
  created_at?: ProtoTimestamp;
  updated_at?: ProtoTimestamp;
}

export interface Profile {
  id: string;
  account_id: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  birth_date?: string;
  phone_number?: string;
  country_code: string;
  language_code: string;
  timezone: string;
  created_at?: ProtoTimestamp;
  updated_at?: ProtoTimestamp;
}

export interface Device {
  id: string;
  account_id: string;
  fingerprint: string;
  device_type: string;
  device_name: string;
  os_name: string;
  os_version: string;
  browser_name: string;
  browser_version: string;
  is_trusted: boolean;
  last_seen_at?: ProtoTimestamp;
  created_at?: ProtoTimestamp;
}

export interface Session {
  id: string;
  account_id: string;
  device_id: string;
  ip_address: string;
  user_agent: string;
  created_at?: ProtoTimestamp;
  expires_at?: ProtoTimestamp;
  last_activity_at?: ProtoTimestamp;
}

// Identity Service Request/Response Types
export interface GetAccountRequest {
  id: string;
}

export interface GetAccountResponse {
  account?: Account;
}

export interface GetAccountByEmailRequest {
  email: string;
}

export interface GetAccountByEmailResponse {
  account?: Account;
}

export interface GetAccountByUsernameRequest {
  username: string;
}

export interface GetAccountByUsernameResponse {
  account?: Account;
}

export interface ValidateAccountRequest {
  id: string;
}

export interface ValidateAccountResponse {
  valid: boolean;
  status: AccountStatus;
  message: string;
}

export interface ValidateSessionRequest {
  token_hash: string;
}

export interface ValidateSessionResponse {
  valid: boolean;
  account_id: string;
  session_id: string;
  expires_at?: ProtoTimestamp;
  message: string;
}

export interface RevokeSessionRequest {
  session_id: string;
  reason: string;
}

export interface RevokeSessionResponse {
  success: boolean;
  message: string;
}

export interface RevokeAllSessionsRequest {
  account_id: string;
  exclude_session_id?: string;
  reason: string;
}

export interface RevokeAllSessionsResponse {
  success: boolean;
  revoked_count: number;
  message: string;
}

export interface GetAccountDevicesRequest {
  account_id: string;
}

export interface GetAccountDevicesResponse {
  devices: Device[];
}

export interface TrustDeviceRequest {
  device_id: string;
  account_id: string;
}

export interface TrustDeviceResponse {
  success: boolean;
  message: string;
}

export interface RevokeDeviceRequest {
  device_id: string;
  account_id: string;
  reason: string;
}

export interface RevokeDeviceResponse {
  success: boolean;
  message: string;
}

export interface GetProfileRequest {
  account_id: string;
}

export interface GetProfileResponse {
  profile?: Profile;
}

// Account CRUD Types
export enum AuthProvider {
  AUTH_PROVIDER_UNSPECIFIED = 0,
  AUTH_PROVIDER_LOCAL = 1,
  AUTH_PROVIDER_GOOGLE = 2,
  AUTH_PROVIDER_APPLE = 3,
  AUTH_PROVIDER_KAKAO = 4,
  AUTH_PROVIDER_NAVER = 5,
}

export interface CreateAccountRequest {
  email: string;
  username: string;
  password?: string;
  provider: AuthProvider;
  provider_id?: string;
  mode: AccountMode;
  region?: string;
  locale?: string;
  timezone?: string;
  country_code?: string;
}

export interface CreateAccountResponse {
  account?: Account;
}

export interface UpdateAccountRequest {
  id: string;
  email?: string;
  status?: AccountStatus;
  mfa_enabled?: boolean;
  region?: string;
  locale?: string;
  timezone?: string;
  country_code?: string;
}

export interface UpdateAccountResponse {
  account?: Account;
}

export interface DeleteAccountRequest {
  id: string;
}

export interface DeleteAccountResponse {
  success: boolean;
  message: string;
}

export interface ValidatePasswordRequest {
  account_id: string;
  password: string;
}

export interface ValidatePasswordResponse {
  valid: boolean;
  message: string;
}

export interface CreateSessionRequest {
  account_id: string;
  device_id?: string;
  ip_address?: string;
  user_agent?: string;
  expires_in_ms?: number;
}

export interface CreateSessionResponse {
  session?: Session;
  access_token: string;
  refresh_token: string;
}

// ============================================================================
// Auth Service Types (auth.v1)
// ============================================================================

export enum RoleScope {
  ROLE_SCOPE_UNSPECIFIED = 0,
  ROLE_SCOPE_GLOBAL = 1,
  ROLE_SCOPE_SERVICE = 2,
  ROLE_SCOPE_TENANT = 3,
}

export enum OperatorStatus {
  OPERATOR_STATUS_UNSPECIFIED = 0,
  OPERATOR_STATUS_PENDING = 1,
  OPERATOR_STATUS_ACTIVE = 2,
  OPERATOR_STATUS_SUSPENDED = 3,
  OPERATOR_STATUS_REVOKED = 4,
}

export enum SubjectType {
  SUBJECT_TYPE_UNSPECIFIED = 0,
  SUBJECT_TYPE_USER = 1,
  SUBJECT_TYPE_OPERATOR = 2,
  SUBJECT_TYPE_SERVICE = 3,
}

export enum SanctionType {
  SANCTION_TYPE_UNSPECIFIED = 0,
  SANCTION_TYPE_WARNING = 1,
  SANCTION_TYPE_MUTE = 2,
  SANCTION_TYPE_TEMPORARY_BAN = 3,
  SANCTION_TYPE_PERMANENT_BAN = 4,
  SANCTION_TYPE_FEATURE_RESTRICTION = 5,
}

export enum SanctionSeverity {
  SANCTION_SEVERITY_UNSPECIFIED = 0,
  SANCTION_SEVERITY_LOW = 1,
  SANCTION_SEVERITY_MEDIUM = 2,
  SANCTION_SEVERITY_HIGH = 3,
  SANCTION_SEVERITY_CRITICAL = 4,
}

export enum SanctionStatus {
  SANCTION_STATUS_UNSPECIFIED = 0,
  SANCTION_STATUS_ACTIVE = 1,
  SANCTION_STATUS_EXPIRED = 2,
  SANCTION_STATUS_REVOKED = 3,
  SANCTION_STATUS_APPEALED = 4,
}

export interface Permission {
  id: string;
  resource: string;
  action: string;
  category: string;
  description: string;
  is_system: boolean;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  level: number;
  scope: RoleScope;
  permissions: Permission[];
  created_at?: ProtoTimestamp;
  updated_at?: ProtoTimestamp;
}

export interface Operator {
  id: string;
  account_id: string;
  email: string;
  display_name: string;
  status: OperatorStatus;
  role_id: string;
  role?: Role;
  created_at?: ProtoTimestamp;
  updated_at?: ProtoTimestamp;
  last_login_at?: ProtoTimestamp;
}

export interface Sanction {
  id: string;
  subject_id: string;
  subject_type: SubjectType;
  type: SanctionType;
  severity: SanctionSeverity;
  reason: string;
  evidence: string;
  issued_by: string;
  issued_at?: ProtoTimestamp;
  expires_at?: ProtoTimestamp;
  status: SanctionStatus;
}

// Auth Service Request/Response Types
export interface CheckPermissionRequest {
  operator_id: string;
  resource: string;
  action: string;
  context?: Record<string, string>;
}

export interface CheckPermissionResponse {
  allowed: boolean;
  reason: string;
  matched_permissions: string[];
}

export interface PermissionCheck {
  resource: string;
  action: string;
}

export interface CheckPermissionsRequest {
  operator_id: string;
  checks: PermissionCheck[];
}

export interface PermissionCheckResult {
  resource: string;
  action: string;
  allowed: boolean;
  reason: string;
}

export interface CheckPermissionsResponse {
  all_allowed: boolean;
  results: PermissionCheckResult[];
}

export interface GetOperatorPermissionsRequest {
  operator_id: string;
  include_role_permissions: boolean;
}

export interface GetOperatorPermissionsResponse {
  permissions: Permission[];
  direct_permissions: Permission[];
  role_permissions: Permission[];
}

export interface GetRoleRequest {
  id: string;
}

export interface GetRoleResponse {
  role?: Role;
}

export interface GetRolesByOperatorRequest {
  operator_id: string;
}

export interface GetRolesByOperatorResponse {
  roles: Role[];
}

export interface GetOperatorRequest {
  id: string;
}

export interface GetOperatorResponse {
  operator?: Operator;
}

export interface ValidateOperatorRequest {
  id: string;
}

export interface ValidateOperatorResponse {
  valid: boolean;
  status: OperatorStatus;
  message: string;
}

export interface CheckSanctionRequest {
  subject_id: string;
  subject_type: SubjectType;
  sanction_type?: SanctionType;
}

export interface CheckSanctionResponse {
  is_sanctioned: boolean;
  active_sanctions: Sanction[];
  highest_severity: SanctionSeverity;
}

export interface GetActiveSanctionsRequest {
  subject_id: string;
  subject_type: SubjectType;
}

export interface GetActiveSanctionsResponse {
  sanctions: Sanction[];
  total_count: number;
}

// ============================================================================
// Legal Service Types (legal.v1)
// ============================================================================

export enum ConsentType {
  CONSENT_TYPE_UNSPECIFIED = 0,
  CONSENT_TYPE_TERMS_OF_SERVICE = 1,
  CONSENT_TYPE_PRIVACY_POLICY = 2,
  CONSENT_TYPE_MARKETING = 3,
  CONSENT_TYPE_ANALYTICS = 4,
  CONSENT_TYPE_THIRD_PARTY_SHARING = 5,
  CONSENT_TYPE_AGE_VERIFICATION = 6,
  CONSENT_TYPE_PARENTAL_CONSENT = 7,
}

export enum ConsentStatus {
  CONSENT_STATUS_UNSPECIFIED = 0,
  CONSENT_STATUS_ACTIVE = 1,
  CONSENT_STATUS_EXPIRED = 2,
  CONSENT_STATUS_REVOKED = 3,
  CONSENT_STATUS_SUPERSEDED = 4,
}

export enum DocumentType {
  DOCUMENT_TYPE_UNSPECIFIED = 0,
  DOCUMENT_TYPE_TERMS_OF_SERVICE = 1,
  DOCUMENT_TYPE_PRIVACY_POLICY = 2,
  DOCUMENT_TYPE_COOKIE_POLICY = 3,
  DOCUMENT_TYPE_DATA_PROCESSING_AGREEMENT = 4,
  DOCUMENT_TYPE_ACCEPTABLE_USE_POLICY = 5,
}

export enum DsrType {
  DSR_TYPE_UNSPECIFIED = 0,
  DSR_TYPE_ACCESS = 1,
  DSR_TYPE_RECTIFICATION = 2,
  DSR_TYPE_ERASURE = 3,
  DSR_TYPE_PORTABILITY = 4,
  DSR_TYPE_RESTRICTION = 5,
  DSR_TYPE_OBJECTION = 6,
}

export enum DsrStatus {
  DSR_STATUS_UNSPECIFIED = 0,
  DSR_STATUS_PENDING = 1,
  DSR_STATUS_IN_PROGRESS = 2,
  DSR_STATUS_COMPLETED = 3,
  DSR_STATUS_REJECTED = 4,
  DSR_STATUS_EXPIRED = 5,
}

export interface Consent {
  id: string;
  account_id: string;
  consent_type: ConsentType;
  document_id: string;
  document_version: string;
  status: ConsentStatus;
  ip_address: string;
  user_agent: string;
  agreed_at?: ProtoTimestamp;
  expires_at?: ProtoTimestamp;
  revoked_at?: ProtoTimestamp;
}

export interface LegalDocument {
  id: string;
  type: DocumentType;
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

export interface LawRequirements {
  law_code: string;
  country_code: string;
  law_name: string;
  minimum_age: number;
  parental_consent_age: number;
  required_consents: ConsentType[];
  dsr_deadline_days: number;
  data_retention_days: number;
  requires_explicit_consent: boolean;
  allows_soft_opt_out: boolean;
}

export interface CountryCompliance {
  country_code: string;
  applicable_laws: string[];
  strictest_requirements?: LawRequirements;
  gdpr_applicable: boolean;
  ccpa_applicable: boolean;
}

export interface DsrRequest {
  id: string;
  account_id: string;
  type: DsrType;
  status: DsrStatus;
  reason: string;
  submitted_at?: ProtoTimestamp;
  deadline_at?: ProtoTimestamp;
  completed_at?: ProtoTimestamp;
  processed_by: string;
}

export interface DsrDeadline {
  deadline?: ProtoTimestamp;
  days_remaining: number;
  is_overdue: boolean;
}

// Legal Service Request/Response Types
export interface CheckConsentsRequest {
  account_id: string;
  country_code: string;
  required_types: ConsentType[];
}

export interface CheckConsentsResponse {
  all_required_granted: boolean;
  missing_consents: ConsentType[];
  expired_consents: ConsentType[];
  active_consents: Consent[];
}

export interface GetAccountConsentsRequest {
  account_id: string;
  include_revoked: boolean;
  include_expired: boolean;
}

export interface GetAccountConsentsResponse {
  consents: Consent[];
  total_count: number;
}

export interface GrantConsentRequest {
  account_id: string;
  consent_type: ConsentType;
  document_id: string;
  ip_address: string;
  user_agent: string;
}

export interface GrantConsentResponse {
  success: boolean;
  consent?: Consent;
  message: string;
}

export interface RevokeConsentRequest {
  account_id: string;
  consent_id: string;
  reason: string;
}

export interface RevokeConsentResponse {
  success: boolean;
  message: string;
}

export interface GetCurrentDocumentRequest {
  document_type: DocumentType;
  language_code: string;
  country_code: string;
}

export interface GetCurrentDocumentResponse {
  document?: LegalDocument;
}

export interface GetDocumentVersionRequest {
  document_id: string;
  version: string;
}

export interface GetDocumentVersionResponse {
  document?: LegalDocument;
}

export interface ListDocumentsRequest {
  type: DocumentType;
  language_code: string;
  include_expired: boolean;
  page_size: number;
  page_token: string;
}

export interface ListDocumentsResponse {
  documents: LegalDocument[];
  next_page_token: string;
  total_count: number;
}

export interface GetLawRequirementsRequest {
  country_code: string;
}

export interface GetLawRequirementsResponse {
  requirements?: LawRequirements;
}

export interface GetCountryComplianceRequest {
  country_code: string;
}

export interface GetCountryComplianceResponse {
  compliance?: CountryCompliance;
}

export interface CreateDsrRequestRequest {
  account_id: string;
  type: DsrType;
  reason: string;
}

export interface CreateDsrRequestResponse {
  dsr_request?: DsrRequest;
}

export interface GetDsrRequestRequest {
  id: string;
}

export interface GetDsrRequestResponse {
  dsr_request?: DsrRequest;
}

export interface GetDsrDeadlineRequest {
  dsr_id: string;
  country_code: string;
}

export interface GetDsrDeadlineResponse {
  deadline?: DsrDeadline;
}

// ============================================================================
// Service Interfaces (for ClientGrpc)
// ============================================================================

import { Observable } from 'rxjs';

/**
 * IdentityService gRPC service interface
 */
export interface IIdentityService {
  // Account Read operations
  getAccount(request: GetAccountRequest): Observable<GetAccountResponse>;
  validateAccount(request: ValidateAccountRequest): Observable<ValidateAccountResponse>;
  getAccountByEmail(request: GetAccountByEmailRequest): Observable<GetAccountByEmailResponse>;
  getAccountByUsername(
    request: GetAccountByUsernameRequest,
  ): Observable<GetAccountByUsernameResponse>;
  // Account Write operations
  createAccount(request: CreateAccountRequest): Observable<CreateAccountResponse>;
  updateAccount(request: UpdateAccountRequest): Observable<UpdateAccountResponse>;
  deleteAccount(request: DeleteAccountRequest): Observable<DeleteAccountResponse>;
  // Authentication
  validatePassword(request: ValidatePasswordRequest): Observable<ValidatePasswordResponse>;
  // Session operations
  createSession(request: CreateSessionRequest): Observable<CreateSessionResponse>;
  validateSession(request: ValidateSessionRequest): Observable<ValidateSessionResponse>;
  revokeSession(request: RevokeSessionRequest): Observable<RevokeSessionResponse>;
  revokeAllSessions(request: RevokeAllSessionsRequest): Observable<RevokeAllSessionsResponse>;
  // Device operations
  getAccountDevices(request: GetAccountDevicesRequest): Observable<GetAccountDevicesResponse>;
  trustDevice(request: TrustDeviceRequest): Observable<TrustDeviceResponse>;
  revokeDevice(request: RevokeDeviceRequest): Observable<RevokeDeviceResponse>;
  // Profile operations
  getProfile(request: GetProfileRequest): Observable<GetProfileResponse>;
}

/**
 * AuthService gRPC service interface
 */
export interface IAuthService {
  checkPermission(request: CheckPermissionRequest): Observable<CheckPermissionResponse>;
  checkPermissions(request: CheckPermissionsRequest): Observable<CheckPermissionsResponse>;
  getOperatorPermissions(
    request: GetOperatorPermissionsRequest,
  ): Observable<GetOperatorPermissionsResponse>;
  getRole(request: GetRoleRequest): Observable<GetRoleResponse>;
  getRolesByOperator(request: GetRolesByOperatorRequest): Observable<GetRolesByOperatorResponse>;
  getOperator(request: GetOperatorRequest): Observable<GetOperatorResponse>;
  validateOperator(request: ValidateOperatorRequest): Observable<ValidateOperatorResponse>;
  checkSanction(request: CheckSanctionRequest): Observable<CheckSanctionResponse>;
  getActiveSanctions(request: GetActiveSanctionsRequest): Observable<GetActiveSanctionsResponse>;
}

/**
 * LegalService gRPC service interface
 */
export interface ILegalService {
  checkConsents(request: CheckConsentsRequest): Observable<CheckConsentsResponse>;
  getAccountConsents(request: GetAccountConsentsRequest): Observable<GetAccountConsentsResponse>;
  grantConsent(request: GrantConsentRequest): Observable<GrantConsentResponse>;
  revokeConsent(request: RevokeConsentRequest): Observable<RevokeConsentResponse>;
  getCurrentDocument(request: GetCurrentDocumentRequest): Observable<GetCurrentDocumentResponse>;
  getDocumentVersion(request: GetDocumentVersionRequest): Observable<GetDocumentVersionResponse>;
  listDocuments(request: ListDocumentsRequest): Observable<ListDocumentsResponse>;
  getLawRequirements(request: GetLawRequirementsRequest): Observable<GetLawRequirementsResponse>;
  getCountryCompliance(
    request: GetCountryComplianceRequest,
  ): Observable<GetCountryComplianceResponse>;
  createDsrRequest(request: CreateDsrRequestRequest): Observable<CreateDsrRequestResponse>;
  getDsrRequest(request: GetDsrRequestRequest): Observable<GetDsrRequestResponse>;
  getDsrDeadline(request: GetDsrDeadlineRequest): Observable<GetDsrDeadlineResponse>;
}

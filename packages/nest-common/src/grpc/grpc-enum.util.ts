/**
 * gRPC Enum Mapping Utilities
 *
 * Shared utilities for converting between database/application enum values
 * and Proto wire format numeric values.
 *
 * SSOT: All enum definitions are in @my-girok/types
 * This file provides generic mapping helpers and service-specific converters.
 *
 * @example
 * ```typescript
 * import {
 *   mapToProto,
 *   mapFromProto,
 *   createEnumMapper,
 * } from '@my-girok/nest-common';
 *
 * // Use pre-defined mappers from @my-girok/types
 * const protoStatus = accountStatusToProto[AccountStatus.ACTIVE]; // 2
 * const appStatus = protoToAccountStatus[2]; // AccountStatus.ACTIVE
 *
 * // Or use the generic helper
 * const mapper = createEnumMapper(accountStatusToProto, protoToAccountStatus);
 * const proto = mapper.toProto(AccountStatus.ACTIVE); // 2
 * const app = mapper.fromProto(2); // AccountStatus.ACTIVE
 * ```
 */

// Re-export all Proto enum mappings from @my-girok/types for convenience
export {
  // Identity mappings
  AccountStatusProto,
  AccountModeProto,
  protoToAccountStatus,
  protoToAccountMode,
  accountStatusToProto,
  accountModeToProto,
  // Auth mappings
  RoleScopeProto,
  protoToRoleScope,
  roleScopeToProto,
  OperatorStatusProto,
  protoToOperatorStatus,
  operatorStatusToProto,
  isActiveToOperatorStatus,
  operatorStatusToIsActive,
  AuthProviderProto,
  protoToAuthProvider,
  authProviderToProto,
  SanctionSeverityProto,
  protoToSanctionSeverity,
  sanctionSeverityToProto,
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

/**
 * Generic enum mapper interface
 */
export interface EnumMapper<TApp, TProto extends number> {
  /** Convert application enum to Proto numeric value */
  toProto(appValue: TApp): TProto;
  /** Convert Proto numeric value to application enum */
  fromProto(protoValue: TProto): TApp;
  /** Check if a Proto value is valid */
  isValidProto(protoValue: number): protoValue is TProto;
  /** Check if an app value is valid */
  isValidApp(appValue: unknown): appValue is TApp;
}

/**
 * Create a bidirectional enum mapper from mapping objects
 *
 * @param toProtoMap - Map from application enum to Proto numeric
 * @param fromProtoMap - Map from Proto numeric to application enum
 * @returns EnumMapper instance
 *
 * @example
 * ```typescript
 * const statusMapper = createEnumMapper(
 *   accountStatusToProto,
 *   protoToAccountStatus
 * );
 *
 * const proto = statusMapper.toProto(AccountStatus.ACTIVE); // 2
 * const app = statusMapper.fromProto(2); // AccountStatus.ACTIVE
 * ```
 */
export function createEnumMapper<TApp extends string, TProto extends number>(
  toProtoMap: Record<TApp, TProto>,
  fromProtoMap: Record<TProto, TApp>,
): EnumMapper<TApp, TProto> {
  const validProtoValues = new Set(Object.values(toProtoMap) as TProto[]);
  const validAppValues = new Set(Object.keys(toProtoMap) as TApp[]);

  return {
    toProto(appValue: TApp): TProto {
      const result = toProtoMap[appValue];
      if (result === undefined) {
        throw new Error(`Invalid application enum value: ${String(appValue)}`);
      }
      return result;
    },

    fromProto(protoValue: TProto): TApp {
      const result = fromProtoMap[protoValue];
      if (result === undefined) {
        throw new Error(`Invalid Proto enum value: ${protoValue}`);
      }
      return result;
    },

    isValidProto(protoValue: number): protoValue is TProto {
      return validProtoValues.has(protoValue as TProto);
    },

    isValidApp(appValue: unknown): appValue is TApp {
      return typeof appValue === 'string' && validAppValues.has(appValue as TApp);
    },
  };
}

/**
 * Safely map a Proto enum value to application enum
 * Returns undefined instead of throwing if value is invalid
 *
 * @param protoValue - Proto numeric value
 * @param fromProtoMap - Mapping object
 * @returns Application enum value or undefined
 */
export function safeFromProto<TApp, TProto extends number>(
  protoValue: TProto | undefined | null,
  fromProtoMap: Record<TProto, TApp>,
): TApp | undefined {
  if (protoValue === undefined || protoValue === null) {
    return undefined;
  }
  return fromProtoMap[protoValue];
}

/**
 * Safely map an application enum value to Proto
 * Returns undefined instead of throwing if value is invalid
 *
 * @param appValue - Application enum value
 * @param toProtoMap - Mapping object
 * @returns Proto numeric value or undefined
 */
export function safeToProto<TApp extends string, TProto extends number>(
  appValue: TApp | undefined | null,
  toProtoMap: Record<TApp, TProto>,
): TProto | undefined {
  if (appValue === undefined || appValue === null) {
    return undefined;
  }
  return toProtoMap[appValue];
}

/**
 * Map an array of Proto values to application enums
 *
 * @param protoValues - Array of Proto numeric values
 * @param fromProtoMap - Mapping object
 * @returns Array of application enum values
 */
export function mapArrayFromProto<TApp, TProto extends number>(
  protoValues: TProto[],
  fromProtoMap: Record<TProto, TApp>,
): TApp[] {
  return protoValues.map((v) => fromProtoMap[v]).filter((v): v is TApp => v !== undefined);
}

/**
 * Map an array of application enum values to Proto
 *
 * @param appValues - Array of application enum values
 * @param toProtoMap - Mapping object
 * @returns Array of Proto numeric values
 */
export function mapArrayToProto<TApp extends string, TProto extends number>(
  appValues: TApp[],
  toProtoMap: Record<TApp, TProto>,
): TProto[] {
  return appValues.map((v) => toProtoMap[v]).filter((v): v is TProto => v !== undefined);
}

/**
 * Get the default/unspecified value for a Proto enum
 * Convention: UNSPECIFIED is always 0
 */
export const PROTO_ENUM_UNSPECIFIED = 0;

/**
 * Check if a Proto enum value is the unspecified/default value
 */
export function isProtoEnumUnspecified(value: number): boolean {
  return value === PROTO_ENUM_UNSPECIFIED;
}

/**
 * Map database string enum to Proto, with fallback for unknown values
 *
 * @param dbValue - Database string value
 * @param toProtoMap - Mapping object
 * @param fallback - Fallback Proto value for unknown inputs (default: 0)
 * @returns Proto numeric value
 */
export function dbToProtoWithFallback<TApp extends string, TProto extends number>(
  dbValue: string | undefined | null,
  toProtoMap: Record<TApp, TProto>,
  fallback: TProto = PROTO_ENUM_UNSPECIFIED as TProto,
): TProto {
  if (!dbValue) {
    return fallback;
  }
  return toProtoMap[dbValue as TApp] ?? fallback;
}

/**
 * Map Proto to database string, with fallback for unknown values
 *
 * @param protoValue - Proto numeric value
 * @param fromProtoMap - Mapping object
 * @param fallback - Fallback string for unknown inputs
 * @returns Database string value
 */
export function protoToDbWithFallback<TApp extends string, TProto extends number>(
  protoValue: TProto | undefined | null,
  fromProtoMap: Record<TProto, TApp>,
  fallback: TApp,
): TApp {
  if (protoValue === undefined || protoValue === null) {
    return fallback;
  }
  return fromProtoMap[protoValue] ?? fallback;
}

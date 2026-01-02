/**
 * gRPC Timestamp Utilities
 *
 * Shared utilities for converting between JavaScript Date and Proto Timestamp format.
 * Used by all gRPC services (identity-service, auth-service, legal-service).
 *
 * Proto Timestamp format (google.protobuf.Timestamp):
 * - seconds: int64 - Represents seconds of UTC time since Unix epoch
 * - nanos: int32 - Non-negative fractions of a second at nanosecond resolution
 *
 * @example
 * ```typescript
 * import { toProtoTimestamp, fromProtoTimestamp } from '@my-girok/nest-common';
 *
 * // Convert Date to Proto Timestamp
 * const protoTs = toProtoTimestamp(new Date());
 * // { seconds: 1704067200, nanos: 500000000 }
 *
 * // Convert Proto Timestamp to Date
 * const date = fromProtoTimestamp({ seconds: 1704067200, nanos: 500000000 });
 * // Date object
 * ```
 */

import { ProtoTimestamp } from './grpc.types';

/**
 * Convert JavaScript Date to google.protobuf.Timestamp format
 *
 * @param date - Date object, null, or undefined
 * @returns Proto Timestamp object or undefined if input is null/undefined
 *
 * @example
 * ```typescript
 * const timestamp = toProtoTimestamp(new Date('2024-01-01T12:00:00Z'));
 * // { seconds: 1704110400, nanos: 0 }
 *
 * const nullTimestamp = toProtoTimestamp(null);
 * // undefined
 * ```
 */
export function toProtoTimestamp(date: Date | null | undefined): ProtoTimestamp | undefined {
  if (!date) return undefined;

  // Handle both Date objects and date strings
  const dateObj = date instanceof Date ? date : new Date(date);

  // Validate the date is valid
  if (isNaN(dateObj.getTime())) {
    return undefined;
  }

  const ms = dateObj.getTime();
  return {
    seconds: Math.floor(ms / 1000),
    nanos: (ms % 1000) * 1_000_000,
  };
}

/**
 * Convert google.protobuf.Timestamp to JavaScript Date
 *
 * @param timestamp - Proto Timestamp object, null, or undefined
 * @returns JavaScript Date object or undefined if input is null/undefined
 *
 * @example
 * ```typescript
 * const date = fromProtoTimestamp({ seconds: 1704110400, nanos: 500000000 });
 * // Date: 2024-01-01T12:00:00.500Z
 *
 * const nullDate = fromProtoTimestamp(null);
 * // undefined
 * ```
 */
export function fromProtoTimestamp(timestamp: ProtoTimestamp | null | undefined): Date | undefined {
  if (!timestamp) return undefined;

  // Validate the timestamp structure
  if (typeof timestamp.seconds !== 'number') {
    return undefined;
  }

  const nanos = typeof timestamp.nanos === 'number' ? timestamp.nanos : 0;
  const ms = timestamp.seconds * 1000 + Math.floor(nanos / 1_000_000);

  return new Date(ms);
}

/**
 * Convert JavaScript Date to Proto Timestamp, returning null instead of undefined
 * Useful when proto field requires null for empty values
 *
 * @param date - Date object, null, or undefined
 * @returns Proto Timestamp object or null if input is null/undefined
 */
export function toProtoTimestampNullable(date: Date | null | undefined): ProtoTimestamp | null {
  return toProtoTimestamp(date) ?? null;
}

/**
 * Convert Proto Timestamp to JavaScript Date, returning null instead of undefined
 * Useful when working with fields that expect null for empty values
 *
 * @param timestamp - Proto Timestamp object, null, or undefined
 * @returns JavaScript Date object or null if input is null/undefined
 */
export function fromProtoTimestampNullable(
  timestamp: ProtoTimestamp | null | undefined,
): Date | null {
  return fromProtoTimestamp(timestamp) ?? null;
}

/**
 * Get current time as Proto Timestamp
 *
 * @returns Proto Timestamp representing current time
 *
 * @example
 * ```typescript
 * const now = nowAsProtoTimestamp();
 * // { seconds: <current_seconds>, nanos: <current_nanos> }
 * ```
 */
export function nowAsProtoTimestamp(): ProtoTimestamp {
  return toProtoTimestamp(new Date())!;
}

/**
 * Compare two Proto Timestamps
 *
 * @param a - First timestamp
 * @param b - Second timestamp
 * @returns Negative if a < b, positive if a > b, zero if equal
 *
 * @example
 * ```typescript
 * const ts1 = toProtoTimestamp(new Date('2024-01-01'));
 * const ts2 = toProtoTimestamp(new Date('2024-01-02'));
 *
 * compareProtoTimestamps(ts1, ts2); // negative (ts1 is before ts2)
 * compareProtoTimestamps(ts2, ts1); // positive (ts2 is after ts1)
 * ```
 */
export function compareProtoTimestamps(
  a: ProtoTimestamp | null | undefined,
  b: ProtoTimestamp | null | undefined,
): number {
  if (!a && !b) return 0;
  if (!a) return -1;
  if (!b) return 1;

  const secondsDiff = a.seconds - b.seconds;
  if (secondsDiff !== 0) return secondsDiff;

  return (a.nanos || 0) - (b.nanos || 0);
}

/**
 * Check if a Proto Timestamp is in the past
 *
 * @param timestamp - Timestamp to check
 * @returns true if timestamp is before current time
 */
export function isProtoTimestampPast(timestamp: ProtoTimestamp | null | undefined): boolean {
  if (!timestamp) return false;
  return compareProtoTimestamps(timestamp, nowAsProtoTimestamp()) < 0;
}

/**
 * Check if a Proto Timestamp is in the future
 *
 * @param timestamp - Timestamp to check
 * @returns true if timestamp is after current time
 */
export function isProtoTimestampFuture(timestamp: ProtoTimestamp | null | undefined): boolean {
  if (!timestamp) return false;
  return compareProtoTimestamps(timestamp, nowAsProtoTimestamp()) > 0;
}

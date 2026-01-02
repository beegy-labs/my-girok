/**
 * Comprehensive retryable error codes for transaction retry logic.
 *
 * These error codes indicate transient failures that may succeed on retry.
 * The retry logic uses exponential backoff with jitter to prevent thundering herd.
 *
 * **Prisma Error Codes (P-series):**
 * @see https://www.prisma.io/docs/reference/api-reference/error-reference
 *
 * **PostgreSQL Error Codes:**
 * @see https://www.postgresql.org/docs/current/errcodes-appendix.html
 *
 * **Network Error Codes:**
 * Standard Node.js/libc error codes for network failures.
 */
export const RETRYABLE_DB_ERROR_CODES = new Set([
  // === Prisma Error Codes ===
  // P2034: Write conflict or deadlock in interactive transaction
  'P2034',
  // P2024: Connection pool timeout - all connections in use
  'P2024',
  // P2028: Transaction API error - transaction was aborted/rolled back
  'P2028',
  // P1017: Server closed the connection unexpectedly
  'P1017',
  // P1001: Cannot reach the database server
  'P1001',
  // P1002: Database server timed out
  'P1002',

  // === PostgreSQL Error Codes ===
  // 40001: Serialization failure
  '40001',
  // 40P01: Deadlock detected
  '40P01',
  // 25P02: In failed SQL transaction / transaction aborted
  '25P02',
  // 57014: Query cancelled (statement_timeout reached)
  '57014',
  // 08000: Connection exception (category)
  '08000',
  // 08003: Connection does not exist
  '08003',
  // 08006: Connection failure
  '08006',
  // 53300: Too many connections
  '53300',
  // 55P03: Lock not available (NOWAIT option)
  '55P03',

  // === Network Error Codes (Node.js/libc) ===
  'ECONNREFUSED',
  'ETIMEDOUT',
  'ECONNRESET',
  'ENOTFOUND',
  'EPIPE',
  'EHOSTUNREACH',
  // 57P03: Cannot connect now
  '57P03',
  // XX000: Internal error
  'XX000',
]);

/**
 * Non-retryable error codes that should fail immediately.
 *
 * These errors indicate permanent failures that will not be resolved by retrying:
 * - Data integrity violations (constraints)
 * - Syntax/schema errors
 * - Resource exhaustion
 * - Permission issues
 *
 * @see https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
export const NON_RETRYABLE_DB_ERROR_CODES = new Set([
  // 23505: Unique constraint violation
  '23505',
  // 23503: Foreign key constraint violation
  '23503',
  // 22P02: Invalid text representation
  '22P02',
  // 53100: Disk full
  '53100',
  // 53200: Out of memory
  '53200',
  // 57P01: Admin shutdown
  '57P01',
  // 42P01: Undefined table
  '42P01',
  // 42703: Undefined column
  '42703',
  // 42601: SQL syntax error
  '42601',
  // 42501: Insufficient privilege
  '42501',
  // 23514: Check constraint violation
  '23514',
  // 22003: Numeric value out of range
  '22003',
  // 22001: String data right truncation
  '22001',
  // P2002: Unique constraint failed
  'P2002',
  // P2003: Foreign key constraint failed
  'P2003',
  // P2025: Record not found
  'P2025',
]);

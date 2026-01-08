/**
 * Common service response types
 * SSOT for result/response patterns across services
 */

/**
 * Generic operation result with success flag and message
 */
export interface OperationResult {
  success: boolean;
  message: string;
}

/**
 * Generic operation result with optional data payload
 */
export interface OperationResultWithData<T> extends OperationResult {
  data?: T;
}

/**
 * Validation result with errors array
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Paginated result wrapper
 */
export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Create a success result
 */
export function successResult(message: string = 'Operation successful'): OperationResult {
  return { success: true, message };
}

/**
 * Create a success result with data
 */
export function successResultWithData<T>(
  data: T,
  message: string = 'Operation successful',
): OperationResultWithData<T> {
  return { success: true, message, data };
}

/**
 * Create a failure result
 */
export function failureResult(message: string): OperationResult {
  return { success: false, message };
}

/**
 * Create a validation success result
 */
export function validationSuccess(): ValidationResult {
  return { valid: true, errors: [] };
}

/**
 * Create a validation failure result
 */
export function validationFailure(errors: string[]): ValidationResult {
  return { valid: false, errors };
}

/**
 * Create a paginated result
 */
export function paginatedResult<T>(
  items: T[],
  totalCount: number,
  page: number,
  pageSize: number,
): PaginatedResult<T> {
  return {
    items,
    totalCount,
    page,
    pageSize,
    hasMore: page * pageSize < totalCount,
  };
}

/**
 * Standard API Error Response Format
 * Used across all services for consistent error handling
 */
export interface ApiErrorResponse {
  /**
   * Always false for error responses
   */
  success: false;

  /**
   * Error details
   */
  error: {
    /**
     * Error code for programmatic handling
     * Examples: UNAUTHORIZED, NOT_FOUND, VALIDATION_ERROR
     */
    code: string;

    /**
     * Human-readable error message
     */
    message: string;

    /**
     * Additional error details (e.g., validation errors)
     */
    details?: any;
  };

  /**
   * Response metadata
   */
  meta: {
    /**
     * ISO 8601 timestamp
     */
    timestamp: string;

    /**
     * Request path
     */
    path: string;

    /**
     * HTTP status code
     */
    statusCode: number;

    /**
     * Optional request ID for tracking
     */
    requestId?: string;
  };
}

/**
 * Standard API Success Response Format
 */
export interface ApiSuccessResponse<T = any> {
  /**
   * Always true for success responses
   */
  success: true;

  /**
   * Response data
   */
  data: T;

  /**
   * Response metadata
   */
  meta?: {
    /**
     * ISO 8601 timestamp
     */
    timestamp: string;

    /**
     * Pagination info (if applicable)
     */
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

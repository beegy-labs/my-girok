/**
 * PII Masking utilities
 * Re-export from @my-girok/nest-common for local use
 */
export { maskEmail, maskPhone, maskIpAddress, maskObject } from '@my-girok/nest-common';

// Alias for backward compatibility
export { maskObject as maskPiiFields } from '@my-girok/nest-common';

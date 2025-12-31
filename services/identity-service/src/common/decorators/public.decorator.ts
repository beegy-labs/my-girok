import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorator to mark routes as public (no authentication required)
 * Use sparingly - only for truly public endpoints
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

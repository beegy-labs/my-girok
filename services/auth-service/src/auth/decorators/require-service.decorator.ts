import { SetMetadata } from '@nestjs/common';

export const REQUIRE_SERVICE_KEY = 'requireService';

/**
 * Decorator to require user to be joined to a specific service
 * @param slug - Service slug or 'dynamic' to get from route params
 * Issue: #358
 */
export const RequireService = (slug?: string) =>
  SetMetadata(REQUIRE_SERVICE_KEY, slug || 'dynamic');

import { SetMetadata } from '@nestjs/common';

export const REQUIRE_MFA_KEY = 'requireMfa';

/**
 * Marks a route as requiring MFA verification
 */
export const RequireMfa = () => SetMetadata(REQUIRE_MFA_KEY, true);

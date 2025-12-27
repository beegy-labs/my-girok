import { SetMetadata } from '@nestjs/common';

export const REQUIRE_ACCOUNT_TYPE_KEY = 'requireAccountType';

export type AccountType = 'USER' | 'ADMIN' | 'OPERATOR';

/**
 * Decorator to require specific account type(s)
 * @param types - One or more account types that are allowed
 * Issue: #358
 *
 * @example
 * // Require admin only
 * @RequireAccountType('ADMIN')
 *
 * @example
 * // Allow admin or operator
 * @RequireAccountType('ADMIN', 'OPERATOR')
 */
export const RequireAccountType = (...types: AccountType[]) =>
  SetMetadata(REQUIRE_ACCOUNT_TYPE_KEY, types);

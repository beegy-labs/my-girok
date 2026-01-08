import { SetMetadata } from '@nestjs/common';
import { AccountType } from '../../config/constants';

export const ACCOUNT_TYPES_KEY = 'accountTypes';

/**
 * Restricts route access to specific account types
 */
export const AllowedAccountTypes = (...types: AccountType[]) =>
  SetMetadata(ACCOUNT_TYPES_KEY, types);

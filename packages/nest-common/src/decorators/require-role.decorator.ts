import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for required roles
 */
export const ROLES_KEY = 'roles';

/**
 * Metadata key for minimum role level
 */
export const ROLE_LEVEL_KEY = 'roleLevel';

/**
 * Require specific roles for route access
 * Used with RbacGuard to enforce role-based access control
 *
 * @param roles - Role names that are allowed to access the route
 *
 * @example
 * ```typescript
 * @RequireRole('ADMIN', 'MODERATOR')
 * @Get('admin/users')
 * async listUsers() {
 *   return this.userService.findAll();
 * }
 * ```
 */
export const RequireRole = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Require minimum role level for route access
 * Used with RbacGuard for hierarchical role checks
 *
 * Higher level = more permissions
 * Example levels: USER=1, MODERATOR=50, ADMIN=100, SUPER_ADMIN=1000
 *
 * @param minLevel - Minimum role level required
 *
 * @example
 * ```typescript
 * @RequireRoleLevel(100) // Requires ADMIN level or higher
 * @Get('admin/settings')
 * async getSettings() {
 *   return this.settingsService.getAll();
 * }
 * ```
 */
export const RequireRoleLevel = (minLevel: number) => SetMetadata(ROLE_LEVEL_KEY, minLevel);

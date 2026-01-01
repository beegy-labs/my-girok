import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for required permissions
 */
export const PERMISSIONS_KEY = 'permissions';

/**
 * Require specific permissions for route access
 * Used with PermissionGuard or RbacGuard to enforce permission-based access control
 *
 * Supports wildcard matching:
 * - '*' matches all permissions
 * - 'users:*' matches all user-related permissions
 * - 'users:read' matches exact permission
 *
 * @param permissions - Permission strings in "resource:action" format
 *
 * @example
 * ```typescript
 * @RequirePermission('users:read', 'users:list')
 * @Get('users')
 * async listUsers() {
 *   return this.userService.findAll();
 * }
 *
 * @RequirePermission('admin:*')
 * @Get('admin/dashboard')
 * async getDashboard() {
 *   return this.adminService.getDashboard();
 * }
 * ```
 */
export const RequirePermission = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * Require permission for a specific resource and action
 * Convenience decorator that formats the permission as "resource:action"
 *
 * @param resource - Resource name (e.g., 'users', 'posts', 'settings')
 * @param action - Action name (e.g., 'read', 'create', 'update', 'delete', 'manage')
 *
 * @example
 * ```typescript
 * @RequireResourcePermission('users', 'create')
 * @Post('users')
 * async createUser(@Body() dto: CreateUserDto) {
 *   return this.userService.create(dto);
 * }
 *
 * @RequireResourcePermission('posts', 'manage')
 * @Delete('posts/:id')
 * async deletePost(@Param('id') id: string) {
 *   return this.postService.delete(id);
 * }
 * ```
 */
export const RequireResourcePermission = (resource: string, action: string) =>
  SetMetadata(PERMISSIONS_KEY, [`${resource}:${action}`]);

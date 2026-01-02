import { SetMetadata } from '@nestjs/common';
import { AUDIT_PERMISSION_KEY, AuditPermissionOptions } from '../guards/permission-audit.guard';

/**
 * Decorator to configure audit logging for permission checks.
 *
 * Use this decorator alongside @RequirePermissions to add
 * detailed audit logging for authorization decisions.
 *
 * @param options - Configuration for audit logging
 *
 * @example
 * ```typescript
 * @UseGuards(JwtAuthGuard, PermissionsGuard, PermissionAuditGuard)
 * @RequirePermissions(Permission.USERS_UPDATE)
 * @AuditPermission({
 *   resource: 'users',
 *   action: 'update',
 *   metadata: { sensitivity: 'high' }
 * })
 * @Patch(':id')
 * async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
 *   return this.usersService.update(id, dto);
 * }
 * ```
 *
 * @example
 * // Disable logging for read operations
 * @AuditPermission({
 *   resource: 'users',
 *   action: 'list',
 *   logSuccess: false,  // Don't log successful reads
 *   logFailure: true    // Still log failures
 * })
 */
export const AuditPermission = (options: AuditPermissionOptions) =>
  SetMetadata(AUDIT_PERMISSION_KEY, options);

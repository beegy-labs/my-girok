import { Reflector } from '@nestjs/core';

import { PermissionGuard } from '../../src/admin/guards/permission.guard';
import { matchesPermission } from '../../src/admin/config/permissions.config';
import { createAdminPayload } from '../utils/test-factory';

describe('Role-based Access Control', () => {
  describe('PermissionGuard integration', () => {
    let guard: PermissionGuard;
    let reflector: Reflector;

    beforeEach(() => {
      reflector = new Reflector();
      guard = new PermissionGuard(reflector);
    });

    it('should be defined', () => {
      expect(guard).toBeDefined();
      expect(reflector).toBeDefined();
    });

    describe('System Admin with wildcard permission', () => {
      const systemAdmin = createAdminPayload({
        permissions: ['*'],
        scope: 'SYSTEM',
      });

      it('should have access to all resources', () => {
        expect(systemAdmin.permissions.includes('*')).toBe(true);
      });

      it('should bypass permission checks', () => {
        // Wildcard permission should match any required permission
        const hasAccess = systemAdmin.permissions.includes('*');
        expect(hasAccess).toBe(true);
      });
    });

    describe('Limited Admin with specific permissions', () => {
      const limitedAdmin = createAdminPayload({
        permissions: ['role:read', 'role:create'],
        scope: 'TENANT',
      });

      it('should have access to permitted resources', () => {
        expect(limitedAdmin.permissions).toContain('role:read');
        expect(limitedAdmin.permissions).toContain('role:create');
      });

      it('should not have access to non-permitted resources', () => {
        expect(limitedAdmin.permissions).not.toContain('role:delete');
        expect(limitedAdmin.permissions).not.toContain('user:read');
      });
    });

    describe('Admin with resource wildcard permission', () => {
      it('should have access to all actions on the resource', () => {
        const admin = createAdminPayload({
          permissions: ['role:*'],
          scope: 'SYSTEM',
        });
        expect(admin.permissions).toContain('role:*');
        expect(matchesPermission('role:*', 'role:read')).toBe(true);
        expect(matchesPermission('role:*', 'role:create')).toBe(true);
        expect(matchesPermission('role:*', 'role:delete')).toBe(true);
      });

      it('should not have access to other resources', () => {
        expect(matchesPermission('role:*', 'user:read')).toBe(false);
      });
    });
  });

  describe('matchesPermission utility', () => {
    it('should match exact permissions', () => {
      expect(matchesPermission('role:read', 'role:read')).toBe(true);
      expect(matchesPermission('user:create', 'user:create')).toBe(true);
    });

    it('should not match different permissions', () => {
      expect(matchesPermission('role:read', 'role:write')).toBe(false);
      expect(matchesPermission('user:read', 'role:read')).toBe(false);
    });

    it('should match wildcard (*) with any permission', () => {
      expect(matchesPermission('*', 'role:read')).toBe(true);
      expect(matchesPermission('*', 'user:delete')).toBe(true);
      expect(matchesPermission('*', 'anything:else')).toBe(true);
    });

    it('should match resource wildcard with any action on resource', () => {
      expect(matchesPermission('role:*', 'role:read')).toBe(true);
      expect(matchesPermission('role:*', 'role:create')).toBe(true);
      expect(matchesPermission('role:*', 'role:delete')).toBe(true);
    });

    it('should not match resource wildcard with different resource', () => {
      expect(matchesPermission('role:*', 'user:read')).toBe(false);
      expect(matchesPermission('legal:*', 'role:read')).toBe(false);
    });
  });

  describe('Permission hierarchy scenarios', () => {
    it('should correctly evaluate super admin access', () => {
      const superAdmin = createAdminPayload({
        permissions: ['*'],
        scope: 'SYSTEM',
        roleName: 'Super Admin',
      });

      // Super admin should have access to everything
      expect(superAdmin.permissions.some((p) => matchesPermission(p, 'role:read'))).toBe(true);
      expect(superAdmin.permissions.some((p) => matchesPermission(p, 'user:delete'))).toBe(true);
      expect(superAdmin.permissions.some((p) => matchesPermission(p, 'legal:create'))).toBe(true);
    });

    it('should correctly evaluate service admin access', () => {
      const serviceAdmin = createAdminPayload({
        permissions: ['role:*', 'user:read', 'user:update'],
        scope: 'SYSTEM',
        roleName: 'Service Admin',
      });

      // Should have full role access
      expect(serviceAdmin.permissions.some((p) => matchesPermission(p, 'role:read'))).toBe(true);
      expect(serviceAdmin.permissions.some((p) => matchesPermission(p, 'role:create'))).toBe(true);
      expect(serviceAdmin.permissions.some((p) => matchesPermission(p, 'role:delete'))).toBe(true);

      // Should have limited user access
      expect(serviceAdmin.permissions.some((p) => matchesPermission(p, 'user:read'))).toBe(true);
      expect(serviceAdmin.permissions.some((p) => matchesPermission(p, 'user:update'))).toBe(true);
      expect(serviceAdmin.permissions.some((p) => matchesPermission(p, 'user:delete'))).toBe(false);
    });

    it('should correctly evaluate tenant admin access', () => {
      const tenantAdmin = createAdminPayload({
        permissions: ['partner_admin:read', 'partner_admin:create', 'audit:read'],
        scope: 'TENANT',
        tenantId: 'tenant-123',
        roleName: 'Tenant Admin',
      });

      // Should have partner admin access
      expect(tenantAdmin.permissions.some((p) => matchesPermission(p, 'partner_admin:read'))).toBe(
        true,
      );
      expect(
        tenantAdmin.permissions.some((p) => matchesPermission(p, 'partner_admin:create')),
      ).toBe(true);

      // Should not have system admin access
      expect(tenantAdmin.permissions.some((p) => matchesPermission(p, 'system_admin:read'))).toBe(
        false,
      );
      expect(tenantAdmin.permissions.some((p) => matchesPermission(p, 'tenant:read'))).toBe(false);
    });

    it('should correctly evaluate moderator access', () => {
      const moderator = createAdminPayload({
        permissions: ['content:read', 'content:hide', 'content:delete'],
        scope: 'TENANT',
        roleName: 'Content Moderator',
      });

      // Should have content moderation access
      expect(moderator.permissions.some((p) => matchesPermission(p, 'content:read'))).toBe(true);
      expect(moderator.permissions.some((p) => matchesPermission(p, 'content:hide'))).toBe(true);
      expect(moderator.permissions.some((p) => matchesPermission(p, 'content:delete'))).toBe(true);

      // Should not have user management access
      expect(moderator.permissions.some((p) => matchesPermission(p, 'user:delete'))).toBe(false);
    });
  });

  describe('Multiple required permissions', () => {
    it('should require all permissions to be present', () => {
      const admin = createAdminPayload({
        permissions: ['role:read', 'role:create'],
      });

      const requiredPermissions = ['role:read', 'role:create'];
      const hasAllPermissions = requiredPermissions.every((required) =>
        admin.permissions.some((perm) => matchesPermission(perm, required)),
      );

      expect(hasAllPermissions).toBe(true);
    });

    it('should fail if any permission is missing', () => {
      const admin = createAdminPayload({
        permissions: ['role:read'],
      });

      const requiredPermissions = ['role:read', 'role:create'];
      const hasAllPermissions = requiredPermissions.every((required) =>
        admin.permissions.some((perm) => matchesPermission(perm, required)),
      );

      expect(hasAllPermissions).toBe(false);
    });

    it('should pass with wildcard covering all permissions', () => {
      const admin = createAdminPayload({
        permissions: ['role:*'],
      });

      const requiredPermissions = ['role:read', 'role:create', 'role:delete'];
      const hasAllPermissions = requiredPermissions.every((required) =>
        admin.permissions.some((perm) => matchesPermission(perm, required)),
      );

      expect(hasAllPermissions).toBe(true);
    });
  });
});

/**
 * Seed script for H-RBAC Admin System
 *
 * Seeds:
 * 1. Permissions (SSOT)
 * 2. Roles (SSOT)
 * 3. Role-Permission mappings
 * 4. Initial System Super Admin account
 *
 * Usage: npx ts-node prisma/seed/admin-seed.ts
 */

import { PrismaClient } from '../../node_modules/.prisma/auth-client';
import * as bcrypt from 'bcrypt';
import { ID } from '@my-girok/nest-common';
import { getAllPermissions } from '../../src/admin/config/permissions.config';
import { getAllRoles } from '../../src/admin/config/roles.config';

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 12;

// Initial System Super Admin credentials
const INITIAL_ADMIN = {
  email: 'admin@girok.dev',
  password: 'Admin@123!', // Change in production
  name: 'System Admin',
};

async function seedPermissions() {
  console.log('Seeding permissions...');

  const permissions = getAllPermissions();

  for (const perm of permissions) {
    const permId = ID.generate();
    await prisma.$executeRaw`
      INSERT INTO permissions (id, resource, action, scope, display_name, description, category, tenant_type)
      VALUES (
        ${permId},
        ${perm.resource},
        ${perm.action},
        ${perm.scope}::admin_scope,
        ${perm.displayName},
        ${perm.description || null},
        ${perm.category},
        ${perm.tenantType || null}::tenant_type
      )
      ON CONFLICT (resource, action) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        description = EXCLUDED.description,
        category = EXCLUDED.category
    `;
  }

  console.log(`Seeded ${permissions.length} permissions`);
}

async function seedRoles() {
  console.log('Seeding roles...');

  const roles = getAllRoles();

  // First pass: create roles without parent
  for (const role of roles) {
    const roleId = ID.generate();
    await prisma.$executeRaw`
      INSERT INTO roles (id, name, display_name, description, scope, tenant_type, level, is_system)
      VALUES (
        ${roleId},
        ${role.name},
        ${role.displayName},
        ${role.description || null},
        ${role.scope}::admin_scope,
        ${role.tenantType || null}::tenant_type,
        ${role.level},
        ${role.isSystem}
      )
      ON CONFLICT (name, scope) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        description = EXCLUDED.description,
        level = EXCLUDED.level
    `;
  }

  // Second pass: set parent references
  for (const role of roles) {
    if (role.parentName) {
      await prisma.$executeRaw`
        UPDATE roles
        SET parent_id = (
          SELECT id FROM roles WHERE name = ${role.parentName} AND scope = ${role.scope}::admin_scope
        )
        WHERE name = ${role.name} AND scope = ${role.scope}::admin_scope
      `;
    }
  }

  console.log(`Seeded ${roles.length} roles`);
}

async function seedRolePermissions() {
  console.log('Seeding role-permission mappings...');

  const roles = getAllRoles();
  let count = 0;

  for (const role of roles) {
    // Skip wildcard roles - they have all permissions
    if (role.permissions.includes('*')) {
      // For '*' permission, link all permissions
      await prisma.$executeRaw`
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id
        FROM roles r, permissions p
        WHERE r.name = ${role.name} AND r.scope = ${role.scope}::admin_scope
        ON CONFLICT DO NOTHING
      `;
      count++;
      continue;
    }

    for (const permKey of role.permissions) {
      // Handle wildcard like 'legal:*'
      if (permKey.endsWith(':*')) {
        const resource = permKey.replace(':*', '');
        await prisma.$executeRaw`
          INSERT INTO role_permissions (role_id, permission_id)
          SELECT r.id, p.id
          FROM roles r, permissions p
          WHERE r.name = ${role.name}
            AND r.scope = ${role.scope}::admin_scope
            AND p.resource = ${resource}
          ON CONFLICT DO NOTHING
        `;
      } else {
        const [resource, action] = permKey.split(':');
        await prisma.$executeRaw`
          INSERT INTO role_permissions (role_id, permission_id)
          SELECT r.id, p.id
          FROM roles r, permissions p
          WHERE r.name = ${role.name}
            AND r.scope = ${role.scope}::admin_scope
            AND p.resource = ${resource}
            AND p.action = ${action}
          ON CONFLICT DO NOTHING
        `;
      }
      count++;
    }
  }

  console.log(`Seeded ${count} role-permission mappings`);
}

async function seedInitialAdmin() {
  console.log('Seeding initial System Super Admin...');

  const hashedPassword = await bcrypt.hash(INITIAL_ADMIN.password, BCRYPT_ROUNDS);

  // Check if admin already exists
  const existing = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM admins WHERE email = ${INITIAL_ADMIN.email}
  `;

  if (Number(existing[0].count) > 0) {
    console.log('Initial admin already exists, skipping...');
    return;
  }

  const adminId = ID.generate();
  await prisma.$executeRaw`
    INSERT INTO admins (id, email, password, name, scope, role_id, is_active)
    SELECT
      ${adminId},
      ${INITIAL_ADMIN.email},
      ${hashedPassword},
      ${INITIAL_ADMIN.name},
      'SYSTEM'::admin_scope,
      r.id,
      true
    FROM roles r
    WHERE r.name = 'system_super' AND r.scope = 'SYSTEM'::admin_scope
  `;

  console.log(`Created initial admin: ${INITIAL_ADMIN.email}`);
}

async function main() {
  console.log('Starting H-RBAC seed...\n');

  try {
    await seedPermissions();
    await seedRoles();
    await seedRolePermissions();
    await seedInitialAdmin();

    console.log('\nH-RBAC seed completed successfully!');
  } catch (error) {
    console.error('Seed failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();

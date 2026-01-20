import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthorizationGrpcClient, TupleKey } from '../../grpc-clients/authorization.client';
import {
  PermissionTuple,
  MenuPermissionItem,
  PermissionTemplate,
  ApplyTemplateDto,
} from './dto/permission.dto';

// Built-in permission templates
const PERMISSION_TEMPLATES: PermissionTemplate[] = [
  {
    id: 'service-admin',
    name: 'Service Administrator',
    description: 'Full access to a specific service',
    permissions: [{ relation: 'admin', objectType: 'service', objectScope: 'scoped' }],
  },
  {
    id: 'service-operator',
    name: 'Service Operator',
    description: 'Operational access to a specific service',
    permissions: [{ relation: 'operator', objectType: 'service', objectScope: 'scoped' }],
  },
  {
    id: 'service-viewer',
    name: 'Service Viewer',
    description: 'Read-only access to a specific service',
    permissions: [{ relation: 'viewer', objectType: 'service', objectScope: 'scoped' }],
  },
  {
    id: 'session-viewer',
    name: 'Session Recording Viewer',
    description: 'Can view session recordings',
    permissions: [{ relation: 'viewer', objectType: 'session_recording', objectScope: 'scoped' }],
  },
  {
    id: 'session-exporter',
    name: 'Session Recording Exporter',
    description: 'Can view and export session recordings',
    permissions: [
      { relation: 'viewer', objectType: 'session_recording', objectScope: 'scoped' },
      { relation: 'exporter', objectType: 'session_recording', objectScope: 'scoped' },
    ],
  },
  {
    id: 'audit-viewer',
    name: 'Audit Log Viewer',
    description: 'Can view audit logs',
    permissions: [{ relation: 'viewer', objectType: 'audit_log', objectScope: 'scoped' }],
  },
  {
    id: 'user-manager',
    name: 'User Manager',
    description: 'Can read and edit users',
    permissions: [
      { relation: 'reader', objectType: 'user_management', objectScope: 'scoped' },
      { relation: 'editor', objectType: 'user_management', objectScope: 'scoped' },
    ],
  },
  {
    id: 'department-head',
    name: 'Department Head',
    description: 'Full department management access',
    permissions: [{ relation: 'head', objectType: 'department', objectScope: 'scoped' }],
  },
  {
    id: 'department-manager',
    name: 'Department Manager',
    description: 'Department member management access',
    permissions: [{ relation: 'manager', objectType: 'department', objectScope: 'scoped' }],
  },
];

@Injectable()
export class PermissionService {
  constructor(private readonly authzClient: AuthorizationGrpcClient) {}

  /**
   * Get all direct permissions for a user
   */
  async getPermissionsForUser(user: string): Promise<PermissionTuple[]> {
    // Since Read API is not exposed via gRPC client, we need to use listObjects
    // This is a simplified version - in production, you'd add Read to the gRPC client
    // For now, we'll return an empty array and rely on check operations
    // TODO: Add Read operation to AuthorizationGrpcClient
    return [];
  }

  /**
   * Get inherited permissions for a user (via teams and departments)
   */
  async getInheritedPermissions(user: string): Promise<PermissionTuple[]> {
    const inherited: PermissionTuple[] = [];

    try {
      // Extract admin ID from user string (format: "admin:uuid")
      const adminId = user.replace('admin:', '');

      // Find teams this admin belongs to
      const teamMemberships = await this.authzClient.listObjects(user, 'member', 'team');

      // Find departments this admin belongs to
      const deptMemberships = await this.authzClient.listObjects(user, 'member', 'department');

      // Collect permissions from teams
      for (const teamObj of teamMemberships) {
        const teamUser = `${teamObj}#member`;
        // Get permissions granted to this team
        // Note: This is simplified - in production, implement proper Read operation
        inherited.push({
          user: teamUser,
          relation: 'member',
          object: teamObj,
          inheritedFrom: teamObj,
        });
      }

      // Collect permissions from departments
      for (const deptObj of deptMemberships) {
        const deptUser = `${deptObj}#member`;
        inherited.push({
          user: deptUser,
          relation: 'member',
          object: deptObj,
          inheritedFrom: deptObj,
        });
      }
    } catch (error) {
      console.error('Error getting inherited permissions:', error);
    }

    return inherited;
  }

  /**
   * Get menu permissions (which users/teams can access which menus)
   */
  async getMenuPermissions(): Promise<MenuPermissionItem[]> {
    // This requires Read API with objectType filter
    // For now, return empty array
    // TODO: Implement after adding Read operation to gRPC client
    return [];
  }

  /**
   * List available permission templates
   */
  async listTemplates(): Promise<PermissionTemplate[]> {
    return PERMISSION_TEMPLATES;
  }

  /**
   * Apply a permission template to a target user
   */
  async applyTemplate(
    templateId: string,
    targetUser: string,
    scope?: ApplyTemplateDto['scope'],
  ): Promise<PermissionTuple[]> {
    const template = PERMISSION_TEMPLATES.find((t) => t.id === templateId);
    if (!template) {
      throw new NotFoundException(`Template not found: ${templateId}`);
    }

    const writes: TupleKey[] = [];

    for (const perm of template.permissions) {
      if (perm.objectScope === 'all') {
        // Grant on all objects of this type (using wildcard)
        writes.push({
          user: targetUser,
          relation: perm.relation,
          object: `${perm.objectType}:*`,
        });
      } else if (perm.objectScope === 'scoped') {
        // Grant on specific scoped objects
        if (perm.objectType === 'service' && scope?.services) {
          for (const serviceId of scope.services) {
            writes.push({
              user: targetUser,
              relation: perm.relation,
              object: `service:${serviceId}`,
            });
          }
        } else if (perm.objectType === 'department' && scope?.services) {
          // For department templates, use first service as scope
          for (const serviceId of scope.services) {
            writes.push({
              user: targetUser,
              relation: perm.relation,
              object: `department:${serviceId}`,
            });
          }
        } else if (perm.objectType === 'country' && scope?.countries) {
          for (const countryCode of scope.countries) {
            writes.push({
              user: targetUser,
              relation: perm.relation,
              object: `country:${countryCode}`,
            });
          }
        }
      }
    }

    if (writes.length > 0) {
      await this.authzClient.write(writes);
    }

    return writes.map((w) => ({
      user: w.user,
      relation: w.relation,
      object: w.object,
    }));
  }
}

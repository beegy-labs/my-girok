import { Module } from '@nestjs/common';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { OperatorsModule } from './operators/operators.module';
import { SanctionsModule } from './sanctions/sanctions.module';

/**
 * Auth Module
 *
 * Aggregates all authorization-related submodules:
 * - Roles: Role-based access control
 * - Permissions: Fine-grained permissions
 * - Operators: Admin/operator management
 * - Sanctions: Account/operator sanctions
 */
@Module({
  imports: [RolesModule, PermissionsModule, OperatorsModule, SanctionsModule],
  exports: [RolesModule, PermissionsModule, OperatorsModule, SanctionsModule],
})
export class AuthModule {}

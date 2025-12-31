import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { AuthPrismaService } from '../../database/auth-prisma.service';
import {
  CreateOperatorInvitationDto,
  AcceptInvitationDto,
  CreateOperatorDirectDto,
  InvitationType,
  UpdateOperatorDto,
  QueryOperatorDto,
  GrantPermissionsDto,
  RevokeOperatorPermissionsDto,
  QueryInvitationDto,
} from './dto';
import {
  OperatorEntity,
  OperatorSummary,
  OperatorListResponse,
  OperatorWithPermissions,
  OperatorInvitationEntity,
  InvitationListResponse,
  InvitationStatus,
} from './entities/operator.entity';
import { Prisma, Operator, OperatorInvitation, Role } from '.prisma/identity-auth-client';

// Type for Operator with role relation
type OperatorWithRole = Operator & { role?: Role };

@Injectable()
export class OperatorsService {
  private readonly logger = new Logger(OperatorsService.name);

  constructor(private readonly prisma: AuthPrismaService) {}

  /**
   * Create an operator invitation
   */
  async createInvitation(
    dto: CreateOperatorInvitationDto,
    invitedBy: string,
  ): Promise<OperatorInvitationEntity> {
    // Check if operator already exists
    const existingOperator = await this.prisma.operator.findFirst({
      where: {
        email: dto.email,
        serviceId: dto.serviceId,
        deletedAt: null,
      },
    });

    if (existingOperator) {
      throw new ConflictException(
        `Operator with email "${dto.email}" already exists for this service`,
      );
    }

    // Check for pending invitation
    const existingInvitation = await this.prisma.operatorInvitation.findFirst({
      where: {
        email: dto.email,
        serviceId: dto.serviceId,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
    });

    if (existingInvitation) {
      throw new ConflictException(`A pending invitation already exists for "${dto.email}"`);
    }

    // Validate role exists
    const role = await this.prisma.role.findUnique({
      where: { id: dto.roleId },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID "${dto.roleId}" not found`);
    }

    // Generate token for email invitations
    const token = dto.type === InvitationType.EMAIL ? this.generateToken() : null;

    // Calculate expiration
    const expiresInDays = dto.expiresInDays ?? 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const invitation = await this.prisma.operatorInvitation.create({
      data: {
        email: dto.email,
        name: dto.name,
        serviceId: dto.serviceId,
        countryCode: dto.countryCode,
        roleId: dto.roleId,
        permissions: dto.permissionIds ?? [],
        invitedBy,
        type: dto.type,
        status: 'PENDING',
        token,
        expiresAt,
      },
    });

    this.logger.log(`Created invitation for ${dto.email} (${invitation.id})`);

    return this.mapToInvitationEntity(invitation);
  }

  /**
   * Accept an invitation
   */
  async acceptInvitation(dto: AcceptInvitationDto): Promise<OperatorEntity> {
    const invitation = await this.prisma.operatorInvitation.findFirst({
      where: {
        token: dto.token,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
    });

    if (!invitation) {
      throw new BadRequestException('Invalid or expired invitation token');
    }

    // Check if operator already exists
    const existingOperator = await this.prisma.operator.findFirst({
      where: {
        OR: [
          { accountId: dto.accountId, serviceId: invitation.serviceId },
          { email: invitation.email, serviceId: invitation.serviceId },
        ],
        deletedAt: null,
      },
    });

    if (existingOperator) {
      throw new ConflictException('Operator already exists for this account/email');
    }

    // Create operator and update invitation in a transaction
    const operator = await this.prisma.$transaction(async (tx) => {
      // Create operator
      const newOperator = await tx.operator.create({
        data: {
          accountId: dto.accountId,
          email: invitation.email,
          name: invitation.name,
          serviceId: invitation.serviceId,
          countryCode: invitation.countryCode,
          roleId: invitation.roleId,
          isActive: true,
          invitationId: invitation.id,
          invitedBy: invitation.invitedBy,
          invitedAt: invitation.createdAt,
          acceptedAt: new Date(),
        },
      });

      // Grant direct permissions if any
      const permissionIds = (invitation.permissions as string[]) || [];
      if (permissionIds.length > 0) {
        await tx.operatorPermission.createMany({
          data: permissionIds.map((permissionId) => ({
            operatorId: newOperator.id,
            permissionId,
            grantedBy: invitation.invitedBy,
          })),
        });
      }

      // Update invitation status
      await tx.operatorInvitation.update({
        where: { id: invitation.id },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date(),
        },
      });

      return newOperator;
    });

    this.logger.log(`Invitation accepted, created operator: ${operator.id}`);

    return this.mapToEntity(operator);
  }

  /**
   * Create operator directly (without invitation)
   */
  async createDirect(dto: CreateOperatorDirectDto, createdBy: string): Promise<OperatorEntity> {
    // Check if operator already exists
    const existingOperator = await this.prisma.operator.findFirst({
      where: {
        OR: [
          { accountId: dto.accountId, serviceId: dto.serviceId },
          { email: dto.email, serviceId: dto.serviceId },
        ],
        deletedAt: null,
      },
    });

    if (existingOperator) {
      throw new ConflictException('Operator already exists for this account/email');
    }

    // Validate role exists
    const role = await this.prisma.role.findUnique({
      where: { id: dto.roleId },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID "${dto.roleId}" not found`);
    }

    // Create operator in a transaction
    const operator = await this.prisma.$transaction(async (tx) => {
      const newOperator = await tx.operator.create({
        data: {
          accountId: dto.accountId,
          email: dto.email,
          name: dto.name,
          serviceId: dto.serviceId,
          countryCode: dto.countryCode,
          roleId: dto.roleId,
          isActive: true,
          invitedBy: createdBy,
          invitedAt: new Date(),
          acceptedAt: new Date(),
        },
      });

      // Grant direct permissions if any
      if (dto.permissionIds && dto.permissionIds.length > 0) {
        await tx.operatorPermission.createMany({
          data: dto.permissionIds.map((permissionId) => ({
            operatorId: newOperator.id,
            permissionId,
            grantedBy: createdBy,
          })),
        });
      }

      return newOperator;
    });

    this.logger.log(`Created operator directly: ${operator.id}`);

    return this.mapToEntity(operator);
  }

  /**
   * Get operator by ID
   */
  async findById(id: string): Promise<OperatorEntity> {
    const operator = await this.prisma.operator.findFirst({
      where: { id, deletedAt: null },
    });

    if (!operator) {
      throw new NotFoundException(`Operator with ID "${id}" not found`);
    }

    return this.mapToEntity(operator);
  }

  /**
   * Get operator with permissions
   */
  async findWithPermissions(id: string): Promise<OperatorWithPermissions> {
    const operator = await this.prisma.operator.findFirst({
      where: { id, deletedAt: null },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!operator) {
      throw new NotFoundException(`Operator with ID "${id}" not found`);
    }

    // Collect all permissions
    const rolePermissions = operator.role.rolePermissions.map(
      (rp) => `${rp.permission.resource}:${rp.permission.action}`,
    );

    const directPermissions = operator.permissions.map(
      (op) => `${op.permission.resource}:${op.permission.action}`,
    );

    const allPermissions = [...new Set([...rolePermissions, ...directPermissions])].sort();

    return {
      ...this.mapToEntity(operator),
      role: {
        id: operator.role.id,
        name: operator.role.name,
        displayName: operator.role.displayName,
      },
      permissions: allPermissions,
      directPermissions,
    };
  }

  /**
   * Update operator
   */
  async update(id: string, dto: UpdateOperatorDto): Promise<OperatorEntity> {
    const operator = await this.prisma.operator.findFirst({
      where: { id, deletedAt: null },
    });

    if (!operator) {
      throw new NotFoundException(`Operator with ID "${id}" not found`);
    }

    // Validate role if being updated
    if (dto.roleId) {
      const role = await this.prisma.role.findUnique({
        where: { id: dto.roleId },
      });

      if (!role) {
        throw new NotFoundException(`Role with ID "${dto.roleId}" not found`);
      }
    }

    const updated = await this.prisma.operator.update({
      where: { id },
      data: {
        name: dto.name,
        roleId: dto.roleId,
        isActive: dto.isActive,
      },
    });

    this.logger.log(`Updated operator: ${id}`);

    return this.mapToEntity(updated);
  }

  /**
   * Deactivate operator (soft delete)
   */
  async deactivate(id: string): Promise<void> {
    const operator = await this.prisma.operator.findFirst({
      where: { id, deletedAt: null },
    });

    if (!operator) {
      throw new NotFoundException(`Operator with ID "${id}" not found`);
    }

    await this.prisma.operator.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });

    this.logger.log(`Deactivated operator: ${id}`);
  }

  /**
   * Reactivate operator
   */
  async reactivate(id: string): Promise<OperatorEntity> {
    const operator = await this.prisma.operator.findUnique({
      where: { id },
    });

    if (!operator) {
      throw new NotFoundException(`Operator with ID "${id}" not found`);
    }

    const updated = await this.prisma.operator.update({
      where: { id },
      data: {
        isActive: true,
        deletedAt: null,
      },
    });

    this.logger.log(`Reactivated operator: ${id}`);

    return this.mapToEntity(updated);
  }

  /**
   * List operators with pagination and filters
   */
  async findAll(query: QueryOperatorDto): Promise<OperatorListResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.OperatorWhereInput = {
      deletedAt: null,
    };

    if (query.serviceId) {
      where.serviceId = query.serviceId;
    }

    if (query.countryCode) {
      where.countryCode = query.countryCode;
    }

    if (query.roleId) {
      where.roleId = query.roleId;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: 'insensitive' } },
        { name: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.OperatorOrderByWithRelationInput = {};
    if (query.sort) {
      orderBy[query.sort as keyof Prisma.OperatorOrderByWithRelationInput] = query.order ?? 'asc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [operators, total] = await Promise.all([
      this.prisma.operator.findMany({
        where,
        include: {
          role: true,
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.operator.count({ where }),
    ]);

    return {
      data: operators.map((op) => this.mapToSummary(op)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Grant permissions to operator
   */
  async grantPermissions(id: string, dto: GrantPermissionsDto, grantedBy: string): Promise<void> {
    const operator = await this.prisma.operator.findFirst({
      where: { id, deletedAt: null },
    });

    if (!operator) {
      throw new NotFoundException(`Operator with ID "${id}" not found`);
    }

    // Verify all permissions exist
    const permissions = await this.prisma.permission.findMany({
      where: { id: { in: dto.permissionIds } },
    });

    if (permissions.length !== dto.permissionIds.length) {
      throw new BadRequestException('One or more permissions not found');
    }

    await this.prisma.operatorPermission.createMany({
      data: dto.permissionIds.map((permissionId) => ({
        operatorId: id,
        permissionId,
        grantedBy,
      })),
      skipDuplicates: true,
    });

    this.logger.log(`Granted ${dto.permissionIds.length} permissions to operator ${id}`);
  }

  /**
   * Revoke permissions from operator
   */
  async revokePermissions(id: string, dto: RevokeOperatorPermissionsDto): Promise<void> {
    const operator = await this.prisma.operator.findFirst({
      where: { id, deletedAt: null },
    });

    if (!operator) {
      throw new NotFoundException(`Operator with ID "${id}" not found`);
    }

    await this.prisma.operatorPermission.deleteMany({
      where: {
        operatorId: id,
        permissionId: { in: dto.permissionIds },
      },
    });

    this.logger.log(`Revoked ${dto.permissionIds.length} permissions from operator ${id}`);
  }

  /**
   * List invitations
   */
  async findInvitations(query: QueryInvitationDto): Promise<InvitationListResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.OperatorInvitationWhereInput = {};

    if (query.serviceId) {
      where.serviceId = query.serviceId;
    }

    if (query.status) {
      where.status = query.status as InvitationStatus;
    }

    const [invitations, total] = await Promise.all([
      this.prisma.operatorInvitation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.operatorInvitation.count({ where }),
    ]);

    return {
      data: invitations.map((inv) => this.mapToInvitationEntity(inv)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Cancel invitation
   */
  async cancelInvitation(id: string): Promise<void> {
    const invitation = await this.prisma.operatorInvitation.findUnique({
      where: { id },
    });

    if (!invitation) {
      throw new NotFoundException(`Invitation with ID "${id}" not found`);
    }

    if (invitation.status !== 'PENDING') {
      throw new BadRequestException('Only pending invitations can be cancelled');
    }

    await this.prisma.operatorInvitation.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    this.logger.log(`Cancelled invitation: ${id}`);
  }

  /**
   * Resend invitation
   */
  async resendInvitation(id: string): Promise<OperatorInvitationEntity> {
    const invitation = await this.prisma.operatorInvitation.findUnique({
      where: { id },
    });

    if (!invitation) {
      throw new NotFoundException(`Invitation with ID "${id}" not found`);
    }

    if (invitation.status !== 'PENDING') {
      throw new BadRequestException('Only pending invitations can be resent');
    }

    // Generate new token and extend expiration
    const newToken = this.generateToken();
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

    const updated = await this.prisma.operatorInvitation.update({
      where: { id },
      data: {
        token: newToken,
        expiresAt: newExpiresAt,
      },
    });

    this.logger.log(`Resent invitation: ${id}`);

    return this.mapToInvitationEntity(updated);
  }

  /**
   * Generate secure token
   */
  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Map database model to entity
   */
  private mapToEntity(operator: Operator): OperatorEntity {
    return {
      id: operator.id,
      accountId: operator.accountId,
      email: operator.email,
      name: operator.name,
      serviceId: operator.serviceId,
      countryCode: operator.countryCode,
      roleId: operator.roleId,
      isActive: operator.isActive,
      invitationId: operator.invitationId,
      invitedBy: operator.invitedBy,
      invitedAt: operator.invitedAt,
      acceptedAt: operator.acceptedAt,
      lastLoginAt: operator.lastLoginAt,
      createdAt: operator.createdAt,
      updatedAt: operator.updatedAt,
      deletedAt: operator.deletedAt,
    };
  }

  /**
   * Map database model to summary
   */
  private mapToSummary(operator: OperatorWithRole): OperatorSummary {
    return {
      id: operator.id,
      email: operator.email,
      name: operator.name,
      serviceId: operator.serviceId,
      countryCode: operator.countryCode,
      roleName: operator.role?.name ?? '',
      roleDisplayName: operator.role?.displayName ?? '',
      isActive: operator.isActive,
      lastLoginAt: operator.lastLoginAt,
    };
  }

  /**
   * Map database model to invitation entity
   */
  private mapToInvitationEntity(invitation: OperatorInvitation): OperatorInvitationEntity {
    return {
      id: invitation.id,
      email: invitation.email,
      name: invitation.name,
      serviceId: invitation.serviceId,
      countryCode: invitation.countryCode,
      roleId: invitation.roleId,
      permissions: invitation.permissions as string[] | null,
      invitedBy: invitation.invitedBy,
      type: invitation.type as InvitationType,
      status: invitation.status as InvitationStatus,
      token: invitation.token,
      expiresAt: invitation.expiresAt,
      acceptedAt: invitation.acceptedAt,
      createdAt: invitation.createdAt,
    };
  }
}

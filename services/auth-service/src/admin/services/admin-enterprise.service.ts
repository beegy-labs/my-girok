/**
 * Admin Enterprise Service (Phase 2)
 * Manages NHI + Location + Access Control + Identity Verification + JSONB Extensions
 */

import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Prisma } from '../../../node_modules/.prisma/auth-client';
import { PrismaService } from '../../database/prisma.service';
import { IdentityType } from '@my-girok/types';
import {
  UpdateNhiAttributesDto,
  CreateNhiDto,
  UpdatePhysicalLocationDto,
  UpdateTaxLegalLocationDto,
  UpdateAccessControlDto,
  UpdateIdentityVerificationDto,
  VerifyAdminIdentityDto,
  UpdateExtensionAttributesDto,
  UpdateAdminEnterpriseDto,
  AdminListQueryDto,
  AdminDetailResponse,
} from '../dto';
import { AdminProfileService } from './admin-profile.service';

const adminInclude = {
  roles: true,
  tenants: true,
  admins: {
    // manager
    select: {
      id: true,
      name: true,
      email: true,
      job_title: true,
    },
  },
} satisfies Prisma.adminsInclude;

@Injectable()
export class AdminEnterpriseService {
  private readonly logger = new Logger(AdminEnterpriseService.name);

  constructor(
    private prisma: PrismaService,
    private adminProfileService: AdminProfileService,
  ) {}

  /**
   * Create Non-Human Identity (NHI)
   */
  async createNhi(dto: CreateNhiDto, createdBy: string): Promise<AdminDetailResponse> {
    // Validate identity type is not HUMAN
    if (dto.identityType === IdentityType.HUMAN) {
      throw new BadRequestException('Cannot create NHI with HUMAN identity type');
    }

    // Validate owner exists
    const owner = await this.prisma.admins.findUnique({
      where: { id: dto.ownerAdminId },
    });
    if (!owner) {
      throw new NotFoundException('Owner admin not found');
    }

    // Generate a random password for NHI (will be replaced with API key/token)
    const randomPassword = Math.random().toString(36).slice(-16);

    const nhi = await this.prisma.admins.create({
      data: {
        email: dto.email,
        password: randomPassword, // Will not be used for NHI
        name: dto.name,
        scope: 'SYSTEM', // NHI typically has SYSTEM scope
        role_id: await this.getDefaultNhiRoleId(),
        is_active: true,
        identity_type: dto.identityType,
        owner_admin_id: dto.ownerAdminId,
        secondary_owner_id: dto.secondaryOwnerId,
        nhi_purpose: dto.nhiPurpose,
        service_account_type: dto.serviceAccountType,
        credential_type: dto.credentialType,
        secret_rotation_days: dto.secretRotationDays ?? 90,
        nhi_expiry_date: dto.nhiExpiryDate ? new Date(dto.nhiExpiryDate) : undefined,
        nhi_config: (dto.nhiConfig as Prisma.JsonValue) ?? Prisma.JsonNull,
      },
      include: adminInclude,
    });

    this.logger.log(`NHI created: ${nhi.id} by admin ${createdBy}`);

    return this.adminProfileService.mapAdminToDetailResponse(nhi);
  }

  /**
   * Update NHI attributes
   */
  async updateNhiAttributes(
    adminId: string,
    dto: UpdateNhiAttributesDto,
  ): Promise<AdminDetailResponse> {
    const updatedAdmin = await this.prisma.admins.update({
      where: { id: adminId },
      data: {
        identity_type: dto.identityType,
        owner_admin_id: dto.ownerAdminId,
        secondary_owner_id: dto.secondaryOwnerId,
        nhi_purpose: dto.nhiPurpose,
        service_account_type: dto.serviceAccountType,
        credential_type: dto.credentialType,
        secret_rotation_days: dto.secretRotationDays,
        nhi_expiry_date: dto.nhiExpiryDate ? new Date(dto.nhiExpiryDate) : undefined,
        last_credential_rotation: dto.lastCredentialRotation
          ? new Date(dto.lastCredentialRotation)
          : undefined,
        nhi_config: (dto.nhiConfig as Prisma.JsonValue) ?? Prisma.JsonNull,
      },
      include: adminInclude,
    });

    return this.adminProfileService.mapAdminToDetailResponse(updatedAdmin);
  }

  /**
   * Rotate NHI credentials
   */
  async rotateNhiCredentials(adminId: string): Promise<{ rotatedAt: Date }> {
    const admin = await this.prisma.admins.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    if (admin.identity_type === 'HUMAN') {
      throw new BadRequestException('Cannot rotate credentials for human identity');
    }

    const rotatedAt = new Date();

    await this.prisma.admins.update({
      where: { id: adminId },
      data: {
        last_credential_rotation: rotatedAt,
      },
    });

    this.logger.log(`Credentials rotated for NHI: ${adminId}`);

    return { rotatedAt };
  }

  /**
   * Update Physical Location
   */
  async updatePhysicalLocation(
    adminId: string,
    dto: UpdatePhysicalLocationDto,
  ): Promise<AdminDetailResponse> {
    const updatedAdmin = await this.prisma.admins.update({
      where: { id: adminId },
      data: {
        legal_entity_id: dto.legalEntityId,
        primary_office_id: dto.primaryOfficeId,
        building_id: dto.buildingId,
        floor_id: dto.floorId,
        desk_code: dto.deskCode,
        remote_work_type: dto.remoteWorkType,
      },
      include: adminInclude,
    });
    return this.adminProfileService.mapAdminToDetailResponse(updatedAdmin);
  }

  /**
   * Update Tax & Legal Location
   */
  async updateTaxLegalLocation(
    adminId: string,
    dto: UpdateTaxLegalLocationDto,
  ): Promise<AdminDetailResponse> {
    const updatedAdmin = await this.prisma.admins.update({
      where: { id: adminId },
      data: {
        legal_country_code: dto.legalCountryCode,
        work_country_code: dto.workCountryCode,
        tax_residence_country: dto.taxResidenceCountry,
        payroll_country_code: dto.payrollCountryCode,
      },
      include: adminInclude,
    });
    return this.adminProfileService.mapAdminToDetailResponse(updatedAdmin);
  }

  /**
   * Update Access Control
   */
  async updateAccessControl(
    adminId: string,
    dto: UpdateAccessControlDto,
  ): Promise<AdminDetailResponse> {
    const updatedAdmin = await this.prisma.admins.update({
      where: { id: adminId },
      data: {
        security_clearance: dto.securityClearance,
        data_access_level: dto.dataAccessLevel,
        access_end_date: dto.accessEndDate ? new Date(dto.accessEndDate) : undefined,
        allowed_ip_ranges: dto.allowedIpRanges,
      },
      include: adminInclude,
    });
    return this.adminProfileService.mapAdminToDetailResponse(updatedAdmin);
  }

  /**
   * Update Identity Verification
   */
  async updateIdentityVerification(
    adminId: string,
    dto: UpdateIdentityVerificationDto,
  ): Promise<AdminDetailResponse> {
    const updatedAdmin = await this.prisma.admins.update({
      where: { id: adminId },
      data: {
        identity_verified: dto.identityVerified,
        identity_verified_at: dto.identityVerifiedAt ? new Date(dto.identityVerifiedAt) : undefined,
        verification_method: dto.verificationMethod,
        verification_level: dto.verificationLevel,
        background_check_status: dto.backgroundCheckStatus,
        background_check_date: dto.backgroundCheckDate
          ? new Date(dto.backgroundCheckDate)
          : undefined,
      },
      include: adminInclude,
    });
    return this.adminProfileService.mapAdminToDetailResponse(updatedAdmin);
  }

  /**
   * Verify Admin Identity (sets verified flag and timestamp)
   */
  async verifyIdentity(
    adminId: string,
    dto: VerifyAdminIdentityDto,
    verifiedBy: string,
  ): Promise<AdminDetailResponse> {
    const now = new Date();
    const currentMetadata = await this.getAdminMetadata(adminId);

    const updatedAdmin = await this.prisma.admins.update({
      where: { id: adminId },
      data: {
        identity_verified: true,
        identity_verified_at: now,
        verification_method: dto.method,
        verification_level: dto.level,
        metadata: {
          ...currentMetadata,
          identityVerification: {
            verifiedBy,
            verifiedAt: now.toISOString(),
            method: dto.method,
            level: dto.level,
            documentId: dto.documentId,
            notes: dto.notes,
          },
        },
      },
      include: adminInclude,
    });

    this.logger.log(`Identity verified for admin ${adminId} by ${verifiedBy}`);

    return this.adminProfileService.mapAdminToDetailResponse(updatedAdmin);
  }

  /**
   * Update JSONB Extension Attributes
   */
  async updateExtensions(
    adminId: string,
    dto: UpdateExtensionAttributesDto,
  ): Promise<AdminDetailResponse> {
    const updatedAdmin = await this.prisma.admins.update({
      where: { id: adminId },
      data: {
        skills: (dto.skills as unknown as Prisma.JsonValue) ?? Prisma.JsonNull,
        certifications: (dto.certifications as unknown as Prisma.JsonValue) ?? Prisma.JsonNull,
        education: (dto.education as unknown as Prisma.JsonValue) ?? Prisma.JsonNull,
        work_history: (dto.workHistory as unknown as Prisma.JsonValue) ?? Prisma.JsonNull,
        custom_attributes: (dto.customAttributes as unknown as Prisma.JsonValue) ?? Prisma.JsonNull,
        preferences: (dto.preferences as unknown as Prisma.JsonValue) ?? Prisma.JsonNull,
        metadata: (dto.metadata as unknown as Prisma.JsonValue) ?? Prisma.JsonNull,
      },
      include: adminInclude,
    });
    return this.adminProfileService.mapAdminToDetailResponse(updatedAdmin);
  }

  /**
   * Update complete enterprise attributes (all sections at once)
   */
  async updateEnterprise(
    adminId: string,
    dto: UpdateAdminEnterpriseDto,
  ): Promise<AdminDetailResponse> {
    const data: Prisma.adminsUpdateInput = {};

    if (dto.nhi) Object.assign(data, dto.nhi);
    if (dto.physicalLocation) Object.assign(data, dto.physicalLocation);
    if (dto.taxLegalLocation) Object.assign(data, dto.taxLegalLocation);
    if (dto.accessControl) Object.assign(data, dto.accessControl);
    if (dto.identityVerification) Object.assign(data, dto.identityVerification);
    if (dto.extensions) Object.assign(data, dto.extensions);

    const updatedAdmin = await this.prisma.admins.update({
      where: { id: adminId },
      data,
      include: adminInclude,
    });

    return this.adminProfileService.mapAdminToDetailResponse(updatedAdmin);
  }

  /**
   * List/Search Admins with Phase 2 filters
   */
  async listAdmins(query: AdminListQueryDto): Promise<{
    data: AdminDetailResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.adminsWhereInput = {};

    // Apply filters
    if (query.employeeType) where.employee_type = query.employeeType;
    if (query.identityType) where.identity_type = query.identityType;
    if (query.organizationUnitId) where.organization_unit_id = query.organizationUnitId;
    if (query.managerAdminId) where.manager_admin_id = query.managerAdminId;
    if (query.isActive !== undefined) where.is_active = query.isActive;

    // Search by name, email, or username
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [admins, total] = await this.prisma.$transaction([
      this.prisma.admins.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: adminInclude,
      }),
      this.prisma.admins.count({ where }),
    ]);

    // Map directly to DTO without additional DB queries
    const data = admins.map((admin) => this.adminProfileService.mapAdminToDetailResponse(admin));

    return {
      data,
      total,
      page,
      limit,
    };
  }

  // ========== Private Helper Methods ==========

  private async getDefaultNhiRoleId(): Promise<string> {
    const role = await this.prisma.roles.findFirst({
      where: { name: 'NHI_SERVICE_ACCOUNT' },
    });

    if (!role) {
      this.logger.warn('NHI_SERVICE_ACCOUNT role not found, falling back to lowest level role.');
      const fallbackRole = await this.prisma.roles.findFirst({
        orderBy: { level: 'asc' },
      });
      if (!fallbackRole) {
        throw new Error('No roles found in the database.');
      }
      return fallbackRole.id;
    }

    return role.id;
  }

  private async getAdminMetadata(adminId: string): Promise<Record<string, any>> {
    const admin = await this.prisma.admins.findUnique({
      where: { id: adminId },
      select: { metadata: true },
    });
    return (admin?.metadata as Record<string, any>) ?? {};
  }
}

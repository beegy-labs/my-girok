/**
 * Admin Profile Service (Phase 2)
 * Manages SCIM 2.0 Core + Employee + Job & Organization + JML + Contact attributes
 */

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '../../../node_modules/.prisma/auth-client';
import { PrismaService } from '../../database/prisma.service';
import {
  UpdateScimCoreDto,
  UpdateEmployeeInfoDto,
  UpdateJobOrganizationDto,
  UpdatePartnerInfoDto,
  UpdateJoinerInfoDto,
  UpdateMoverInfoDto,
  UpdateLeaverInfoDto,
  UpdateContactInfoDto,
  UpdateAdminProfileDto,
  AdminDetailResponse,
} from '../dto';
import { EmployeeType, EmploymentStatus, JobFamily, ProbationStatus } from '@my-girok/types';

const adminWithRelations = Prisma.validator<Prisma.adminsArgs>()({
  include: {
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
  },
});

type AdminWithRelations = Prisma.adminsGetPayload<typeof adminWithRelations>;

@Injectable()
export class AdminProfileService {
  constructor(private prisma: PrismaService) {}

  /**
   * Maps a Prisma admin object to the AdminDetailResponse DTO.
   * This is a public method to allow reuse by other services (e.g., for list operations).
   * @param admin The admin object with relations included.
   * @returns The detailed admin response DTO.
   */
  mapAdminToDetailResponse(admin: AdminWithRelations): AdminDetailResponse {
    return {
      // Core fields
      id: admin.id,
      email: admin.email,
      name: admin.name,
      scope: admin.scope,
      tenantId: admin.tenant_id,
      roleId: admin.role_id,
      isActive: admin.is_active,
      lastLoginAt: admin.last_login_at,
      createdAt: admin.created_at,
      updatedAt: admin.updated_at,
      accountMode: admin.account_mode,
      countryCode: admin.country_code,

      // SCIM Core
      username: admin.username,
      externalId: admin.external_id,
      displayName: admin.display_name,
      givenName: admin.given_name,
      familyName: admin.family_name,
      nativeGivenName: admin.native_given_name,
      nativeFamilyName: admin.native_family_name,
      nickname: admin.nickname,
      preferredLanguage: admin.preferred_language,
      locale: admin.locale,
      timezone: admin.timezone,
      profileUrl: admin.profile_url,
      profilePhotoUrl: admin.profile_photo_url,

      // Employee Info
      employeeNumber: admin.employee_number,
      employeeType: admin.employee_type as EmployeeType,
      employmentStatus: admin.employment_status as EmploymentStatus,
      lifecycleStatus: admin.lifecycle_status,

      // Job & Organization
      jobGradeId: admin.job_grade_id,
      jobTitle: admin.job_title,
      jobTitleEn: admin.job_title_en,
      jobCode: admin.job_code,
      jobFamily: admin.job_family as JobFamily,
      organizationUnitId: admin.organization_unit_id,
      costCenter: admin.cost_center,
      managerAdminId: admin.manager_admin_id,
      dottedLineManagerId: admin.dotted_line_manager_id,
      directReportsCount: admin.direct_reports_count,

      // Partner
      partnerCompanyId: admin.partner_company_id,
      partnerEmployeeId: admin.partner_employee_id,
      partnerContractEndDate: admin.partner_contract_end_date,

      // JML - Joiner
      hireDate: admin.hire_date,
      originalHireDate: admin.original_hire_date,
      startDate: admin.start_date,
      onboardingCompletedAt: admin.onboarding_completed_at,
      probationEndDate: admin.probation_end_date,
      probationStatus: admin.probation_status as ProbationStatus,

      // JML - Mover
      lastRoleChangeAt: admin.last_role_change_at,
      lastPromotionDate: admin.last_promotion_date,
      lastTransferDate: admin.last_transfer_date,

      // JML - Leaver
      terminationDate: admin.termination_date,
      lastWorkingDay: admin.last_working_day,
      terminationReason: admin.termination_reason,
      terminationType: admin.termination_type,
      eligibleForRehire: admin.eligible_for_rehire,
      exitInterviewCompleted: admin.exit_interview_completed,

      // Contact
      phoneNumber: admin.phone_number,
      phoneCountryCode: admin.phone_country_code,
      mobileNumber: admin.mobile_number,
      mobileCountryCode: admin.mobile_country_code,
      workPhone: admin.work_phone,
      emergencyContact: admin.emergency_contact
        ? (admin.emergency_contact as Record<string, any>)
        : undefined,

      // Relations
      role: admin.roles
        ? {
            id: admin.roles.id,
            name: admin.roles.name,
            displayName: admin.roles.display_name,
            level: admin.roles.level,
          }
        : undefined,
      tenant: admin.tenants
        ? {
            id: admin.tenants.id,
            name: admin.tenants.name,
            slug: admin.tenants.slug,
            type: admin.tenants.type,
            status: admin.tenants.status,
          }
        : undefined,
      manager: admin.admins
        ? {
            id: admin.admins.id,
            name: admin.admins.name,
            email: admin.admins.email,
            jobTitle: admin.admins.job_title,
          }
        : undefined,
    };
  }

  /**
   * Get admin detail with Phase 2 fields
   */
  async getAdminDetail(adminId: string): Promise<AdminDetailResponse> {
    const admin = await this.prisma.admins.findUnique({
      where: { id: adminId },
      ...adminWithRelations,
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    return this.mapAdminToDetailResponse(admin);
  }

  /**
   * Update SCIM Core attributes
   */
  async updateScimCore(adminId: string, dto: UpdateScimCoreDto): Promise<AdminDetailResponse> {
    // Check username uniqueness if provided
    if (dto.username) {
      const existing = await this.prisma.admins.findFirst({
        where: {
          username: dto.username,
          id: { not: adminId },
        },
      });
      if (existing) {
        throw new BadRequestException('Username already taken');
      }
    }

    const updatedAdmin = await this.prisma.admins.update({
      where: { id: adminId },
      data: {
        username: dto.username,
        external_id: dto.externalId,
        display_name: dto.displayName,
        given_name: dto.givenName,
        family_name: dto.familyName,
        native_given_name: dto.nativeGivenName,
        native_family_name: dto.nativeFamilyName,
        nickname: dto.nickname,
        preferred_language: dto.preferredLanguage,
        locale: dto.locale,
        timezone: dto.timezone,
        profile_url: dto.profileUrl,
        profile_photo_url: dto.profilePhotoUrl,
      },
      ...adminWithRelations,
    });

    return this.mapAdminToDetailResponse(updatedAdmin);
  }

  /**
   * Update Employee Info
   */
  async updateEmployeeInfo(
    adminId: string,
    dto: UpdateEmployeeInfoDto,
  ): Promise<AdminDetailResponse> {
    const updatedAdmin = await this.prisma.admins.update({
      where: { id: adminId },
      data: {
        employee_number: dto.employeeNumber,
        employee_type: dto.employeeType,
        employment_status: dto.employmentStatus,
        lifecycle_status: dto.lifecycleStatus,
      },
      ...adminWithRelations,
    });
    return this.mapAdminToDetailResponse(updatedAdmin);
  }

  /**
   * Update Job & Organization
   */
  async updateJobOrganization(
    adminId: string,
    dto: UpdateJobOrganizationDto,
  ): Promise<AdminDetailResponse> {
    const updatedAdmin = await this.prisma.admins.update({
      where: { id: adminId },
      data: {
        job_grade_id: dto.jobGradeId,
        job_title: dto.jobTitle,
        job_title_en: dto.jobTitleEn,
        job_code: dto.jobCode,
        job_family: dto.jobFamily,
        organization_unit_id: dto.organizationUnitId,
        cost_center: dto.costCenter,
        manager_admin_id: dto.managerAdminId,
        dotted_line_manager_id: dto.dottedLineManagerId,
        direct_reports_count: dto.directReportsCount,
      },
      ...adminWithRelations,
    });
    return this.mapAdminToDetailResponse(updatedAdmin);
  }

  /**
   * Update Partner Info
   */
  async updatePartnerInfo(
    adminId: string,
    dto: UpdatePartnerInfoDto,
  ): Promise<AdminDetailResponse> {
    const updatedAdmin = await this.prisma.admins.update({
      where: { id: adminId },
      data: {
        partner_company_id: dto.partnerCompanyId,
        partner_employee_id: dto.partnerEmployeeId,
        partner_contract_end_date: dto.partnerContractEndDate
          ? new Date(dto.partnerContractEndDate)
          : undefined,
      },
      ...adminWithRelations,
    });
    return this.mapAdminToDetailResponse(updatedAdmin);
  }

  /**
   * Update Joiner Info
   */
  async updateJoinerInfo(adminId: string, dto: UpdateJoinerInfoDto): Promise<AdminDetailResponse> {
    const updatedAdmin = await this.prisma.admins.update({
      where: { id: adminId },
      data: {
        hire_date: dto.hireDate ? new Date(dto.hireDate) : undefined,
        original_hire_date: dto.originalHireDate ? new Date(dto.originalHireDate) : undefined,
        start_date: dto.startDate ? new Date(dto.startDate) : undefined,
        onboarding_completed_at: dto.onboardingCompletedAt
          ? new Date(dto.onboardingCompletedAt)
          : undefined,
        probation_end_date: dto.probationEndDate ? new Date(dto.probationEndDate) : undefined,
        probation_status: dto.probationStatus,
      },
      ...adminWithRelations,
    });
    return this.mapAdminToDetailResponse(updatedAdmin);
  }

  /**
   * Update Mover Info
   */
  async updateMoverInfo(adminId: string, dto: UpdateMoverInfoDto): Promise<AdminDetailResponse> {
    const updatedAdmin = await this.prisma.admins.update({
      where: { id: adminId },
      data: {
        last_role_change_at: dto.lastRoleChangeAt ? new Date(dto.lastRoleChangeAt) : undefined,
        last_promotion_date: dto.lastPromotionDate ? new Date(dto.lastPromotionDate) : undefined,
        last_transfer_date: dto.lastTransferDate ? new Date(dto.lastTransferDate) : undefined,
      },
      ...adminWithRelations,
    });
    return this.mapAdminToDetailResponse(updatedAdmin);
  }

  /**
   * Update Leaver Info
   */
  async updateLeaverInfo(adminId: string, dto: UpdateLeaverInfoDto): Promise<AdminDetailResponse> {
    const updatedAdmin = await this.prisma.admins.update({
      where: { id: adminId },
      data: {
        termination_date: dto.terminationDate ? new Date(dto.terminationDate) : undefined,
        last_working_day: dto.lastWorkingDay ? new Date(dto.lastWorkingDay) : undefined,
        termination_reason: dto.terminationReason,
        termination_type: dto.terminationType,
        eligible_for_rehire: dto.eligibleForRehire,
        exit_interview_completed: dto.exitInterviewCompleted,
      },
      ...adminWithRelations,
    });
    return this.mapAdminToDetailResponse(updatedAdmin);
  }

  /**
   * Update Contact Info
   */
  async updateContactInfo(
    adminId: string,
    dto: UpdateContactInfoDto,
  ): Promise<AdminDetailResponse> {
    const updatedAdmin = await this.prisma.admins.update({
      where: { id: adminId },
      data: {
        phone_number: dto.phoneNumber,
        phone_country_code: dto.phoneCountryCode,
        mobile_number: dto.mobileNumber,
        mobile_country_code: dto.mobileCountryCode,
        work_phone: dto.workPhone,
        emergency_contact: dto.emergencyContact,
      },
      ...adminWithRelations,
    });
    return this.mapAdminToDetailResponse(updatedAdmin);
  }

  /**
   * Update complete admin profile (all sections at once)
   */
  async updateProfile(adminId: string, dto: UpdateAdminProfileDto): Promise<AdminDetailResponse> {
    const data: Prisma.adminsUpdateInput = {};

    if (dto.scim) Object.assign(data, dto.scim);
    if (dto.employee) Object.assign(data, dto.employee);
    if (dto.job) Object.assign(data, dto.job);
    if (dto.partner)
      Object.assign(data, {
        ...dto.partner,
        partner_contract_end_date: dto.partner.partnerContractEndDate
          ? new Date(dto.partner.partnerContractEndDate)
          : undefined,
      });
    if (dto.joiner)
      Object.assign(data, {
        ...dto.joiner,
        hire_date: dto.joiner.hireDate ? new Date(dto.joiner.hireDate) : undefined,
        original_hire_date: dto.joiner.originalHireDate
          ? new Date(dto.joiner.originalHireDate)
          : undefined,
        start_date: dto.joiner.startDate ? new Date(dto.joiner.startDate) : undefined,
        onboarding_completed_at: dto.joiner.onboardingCompletedAt
          ? new Date(dto.joiner.onboardingCompletedAt)
          : undefined,
        probation_end_date: dto.joiner.probationEndDate
          ? new Date(dto.joiner.probationEndDate)
          : undefined,
      });
    if (dto.mover)
      Object.assign(data, {
        ...dto.mover,
        last_role_change_at: dto.mover.lastRoleChangeAt
          ? new Date(dto.mover.lastRoleChangeAt)
          : undefined,
        last_promotion_date: dto.mover.lastPromotionDate
          ? new Date(dto.mover.lastPromotionDate)
          : undefined,
        last_transfer_date: dto.mover.lastTransferDate
          ? new Date(dto.mover.lastTransferDate)
          : undefined,
      });
    if (dto.leaver)
      Object.assign(data, {
        ...dto.leaver,
        termination_date: dto.leaver.terminationDate
          ? new Date(dto.leaver.terminationDate)
          : undefined,
        last_working_day: dto.leaver.lastWorkingDay
          ? new Date(dto.leaver.lastWorkingDay)
          : undefined,
      });
    if (dto.contact) Object.assign(data, dto.contact);

    const updatedAdmin = await this.prisma.admins.update({
      where: { id: adminId },
      data,
      ...adminWithRelations,
    });
    return this.mapAdminToDetailResponse(updatedAdmin);
  }
}

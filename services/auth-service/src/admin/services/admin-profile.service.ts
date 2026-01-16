/**
 * Admin Profile Service (Phase 2)
 * Manages SCIM 2.0 Core + Employee + Job & Organization + JML + Contact attributes
 */

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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

@Injectable()
export class AdminProfileService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get admin detail with Phase 2 fields
   */
  async getAdminDetail(adminId: string): Promise<AdminDetailResponse> {
    const admin = await this.prisma.admins.findUnique({
      where: { id: adminId },
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

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    // Map Prisma result to AdminDetailResponse
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
      username: admin.username ?? undefined,
      externalId: admin.external_id ?? undefined,
      displayName: admin.display_name ?? undefined,
      givenName: admin.given_name ?? undefined,
      familyName: admin.family_name ?? undefined,
      nativeGivenName: admin.native_given_name ?? undefined,
      nativeFamilyName: admin.native_family_name ?? undefined,
      nickname: admin.nickname ?? undefined,
      preferredLanguage: admin.preferred_language ?? undefined,
      locale: admin.locale ?? undefined,
      timezone: admin.timezone ?? undefined,
      profileUrl: admin.profile_url ?? undefined,
      profilePhotoUrl: admin.profile_photo_url ?? undefined,

      // Employee Info
      employeeNumber: admin.employee_number ?? undefined,
      employeeType: (admin.employee_type as any) ?? undefined,
      employmentStatus: (admin.employment_status as any) ?? undefined,
      lifecycleStatus: (admin.lifecycle_status as any) ?? undefined,

      // Job & Organization
      jobGradeId: admin.job_grade_id ?? undefined,
      jobTitle: admin.job_title ?? undefined,
      jobTitleEn: admin.job_title_en ?? undefined,
      jobCode: admin.job_code ?? undefined,
      jobFamily: (admin.job_family as any) ?? undefined,
      organizationUnitId: admin.organization_unit_id ?? undefined,
      costCenter: admin.cost_center ?? undefined,
      managerAdminId: admin.manager_admin_id ?? undefined,
      dottedLineManagerId: admin.dotted_line_manager_id ?? undefined,
      directReportsCount: admin.direct_reports_count ?? undefined,

      // Partner
      partnerCompanyId: admin.partner_company_id ?? undefined,
      partnerEmployeeId: admin.partner_employee_id ?? undefined,
      partnerContractEndDate: admin.partner_contract_end_date ?? undefined,

      // JML - Joiner
      hireDate: admin.hire_date ?? undefined,
      originalHireDate: admin.original_hire_date ?? undefined,
      startDate: admin.start_date ?? undefined,
      onboardingCompletedAt: admin.onboarding_completed_at ?? undefined,
      probationEndDate: admin.probation_end_date ?? undefined,
      probationStatus: admin.probation_status as any,

      // JML - Mover
      lastRoleChangeAt: admin.last_role_change_at ?? undefined,
      lastPromotionDate: admin.last_promotion_date ?? undefined,
      lastTransferDate: admin.last_transfer_date ?? undefined,

      // JML - Leaver
      terminationDate: admin.termination_date ?? undefined,
      lastWorkingDay: admin.last_working_day ?? undefined,
      terminationReason: admin.termination_reason ?? undefined,
      terminationType: admin.termination_type ?? undefined,
      eligibleForRehire: admin.eligible_for_rehire ?? undefined,
      exitInterviewCompleted: admin.exit_interview_completed ?? undefined,

      // Contact
      phoneNumber: admin.phone_number ?? undefined,
      phoneCountryCode: admin.phone_country_code ?? undefined,
      mobileNumber: admin.mobile_number ?? undefined,
      mobileCountryCode: admin.mobile_country_code ?? undefined,
      workPhone: admin.work_phone ?? undefined,
      emergencyContact: (admin.emergency_contact as any) ?? undefined,

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
            jobTitle: admin.admins.job_title ?? undefined,
          }
        : undefined,
    };
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

    await this.prisma.admins.update({
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
    });

    return this.getAdminDetail(adminId);
  }

  /**
   * Update Employee Info
   */
  async updateEmployeeInfo(
    adminId: string,
    dto: UpdateEmployeeInfoDto,
  ): Promise<AdminDetailResponse> {
    await this.prisma.admins.update({
      where: { id: adminId },
      data: {
        employee_number: dto.employeeNumber,
        employee_type: dto.employeeType,
        employment_status: dto.employmentStatus,
        lifecycle_status: dto.lifecycleStatus,
      },
    });

    return this.getAdminDetail(adminId);
  }

  /**
   * Update Job & Organization
   */
  async updateJobOrganization(
    adminId: string,
    dto: UpdateJobOrganizationDto,
  ): Promise<AdminDetailResponse> {
    await this.prisma.admins.update({
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
    });

    return this.getAdminDetail(adminId);
  }

  /**
   * Update Partner Info
   */
  async updatePartnerInfo(
    adminId: string,
    dto: UpdatePartnerInfoDto,
  ): Promise<AdminDetailResponse> {
    await this.prisma.admins.update({
      where: { id: adminId },
      data: {
        partner_company_id: dto.partnerCompanyId,
        partner_employee_id: dto.partnerEmployeeId,
        partner_contract_end_date: dto.partnerContractEndDate
          ? new Date(dto.partnerContractEndDate)
          : undefined,
      },
    });

    return this.getAdminDetail(adminId);
  }

  /**
   * Update Joiner Info
   */
  async updateJoinerInfo(adminId: string, dto: UpdateJoinerInfoDto): Promise<AdminDetailResponse> {
    await this.prisma.admins.update({
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
    });

    return this.getAdminDetail(adminId);
  }

  /**
   * Update Mover Info
   */
  async updateMoverInfo(adminId: string, dto: UpdateMoverInfoDto): Promise<AdminDetailResponse> {
    await this.prisma.admins.update({
      where: { id: adminId },
      data: {
        last_role_change_at: dto.lastRoleChangeAt ? new Date(dto.lastRoleChangeAt) : undefined,
        last_promotion_date: dto.lastPromotionDate ? new Date(dto.lastPromotionDate) : undefined,
        last_transfer_date: dto.lastTransferDate ? new Date(dto.lastTransferDate) : undefined,
      },
    });

    return this.getAdminDetail(adminId);
  }

  /**
   * Update Leaver Info
   */
  async updateLeaverInfo(adminId: string, dto: UpdateLeaverInfoDto): Promise<AdminDetailResponse> {
    await this.prisma.admins.update({
      where: { id: adminId },
      data: {
        termination_date: dto.terminationDate ? new Date(dto.terminationDate) : undefined,
        last_working_day: dto.lastWorkingDay ? new Date(dto.lastWorkingDay) : undefined,
        termination_reason: dto.terminationReason,
        termination_type: dto.terminationType,
        eligible_for_rehire: dto.eligibleForRehire,
        exit_interview_completed: dto.exitInterviewCompleted,
      },
    });

    return this.getAdminDetail(adminId);
  }

  /**
   * Update Contact Info
   */
  async updateContactInfo(
    adminId: string,
    dto: UpdateContactInfoDto,
  ): Promise<AdminDetailResponse> {
    await this.prisma.admins.update({
      where: { id: adminId },
      data: {
        phone_number: dto.phoneNumber,
        phone_country_code: dto.phoneCountryCode,
        mobile_number: dto.mobileNumber,
        mobile_country_code: dto.mobileCountryCode,
        work_phone: dto.workPhone,
        emergency_contact: dto.emergencyContact as any,
      },
    });

    return this.getAdminDetail(adminId);
  }

  /**
   * Update complete admin profile (all sections at once)
   */
  async updateProfile(adminId: string, dto: UpdateAdminProfileDto): Promise<AdminDetailResponse> {
    if (dto.scim) {
      await this.updateScimCore(adminId, dto.scim);
    }
    if (dto.employee) {
      await this.updateEmployeeInfo(adminId, dto.employee);
    }
    if (dto.job) {
      await this.updateJobOrganization(adminId, dto.job);
    }
    if (dto.partner) {
      await this.updatePartnerInfo(adminId, dto.partner);
    }
    if (dto.joiner) {
      await this.updateJoinerInfo(adminId, dto.joiner);
    }
    if (dto.mover) {
      await this.updateMoverInfo(adminId, dto.mover);
    }
    if (dto.leaver) {
      await this.updateLeaverInfo(adminId, dto.leaver);
    }
    if (dto.contact) {
      await this.updateContactInfo(adminId, dto.contact);
    }

    return this.getAdminDetail(adminId);
  }
}

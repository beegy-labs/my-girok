/**
 * Employee Profile Service (Phase 5.1)
 * Allows employees to view and update their OWN profile with limited fields
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AdminProfileService } from '../../admin/services/admin-profile.service';
import { UpdateEmployeeProfileDto } from './dto';
import { AdminDetailResponse } from '../../admin/dto';

@Injectable()
export class EmployeeProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminProfileService: AdminProfileService,
  ) {}

  /**
   * Get employee's own profile
   * @param employeeId The ID of the employee (from JWT)
   */
  async getMyProfile(employeeId: string): Promise<AdminDetailResponse> {
    return this.adminProfileService.getAdminDetail(employeeId);
  }

  /**
   * Update employee's own profile (limited fields)
   * @param employeeId The ID of the employee (from JWT)
   * @param dto Update data with limited fields
   */
  async updateMyProfile(
    employeeId: string,
    dto: UpdateEmployeeProfileDto,
  ): Promise<AdminDetailResponse> {
    // Verify employee exists
    const employee = await this.prisma.admins.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Update allowed fields only
    const updatedEmployee = await this.prisma.admins.update({
      where: { id: employeeId },
      data: {
        // SCIM Core - limited fields
        display_name: dto.displayName,
        nickname: dto.nickname,
        preferred_language: dto.preferredLanguage,
        locale: dto.locale,
        timezone: dto.timezone,
        profile_url: dto.profileUrl,
        profile_photo_url: dto.profilePhotoUrl,

        // Contact Info
        phone_number: dto.phoneNumber,
        phone_country_code: dto.phoneCountryCode,
        mobile_number: dto.mobileNumber,
        mobile_country_code: dto.mobileCountryCode,
        emergency_contact: dto.emergencyContact,
      },
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

    return this.adminProfileService.mapAdminToDetailResponse(updatedEmployee);
  }
}

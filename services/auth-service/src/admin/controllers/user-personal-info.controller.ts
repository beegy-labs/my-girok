import { Controller, Get, Param, Query, Ip, Headers, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PersonalInfoService } from '../../users/services/personal-info.service';
import { PersonalInfoResponse } from '../../users/dto/personal-info.dto';
import { CurrentAdmin } from '../decorators/current-admin.decorator';
import { Permissions } from '../decorators/permissions.decorator';
import { PermissionGuard } from '../guards/permission.guard';
import { AdminPayload } from '../types/admin.types';

@ApiTags('Admin - User Personal Info')
@Controller('admin/users')
@UseGuards(PermissionGuard)
export class UserPersonalInfoController {
  constructor(private personalInfoService: PersonalInfoService) {}

  /**
   * Get user's personal info
   * GET /v1/admin/users/:id/personal-info
   */
  @Get(':id/personal-info')
  @Permissions('personal_info:read')
  @ApiOperation({ summary: "Get user's personal info" })
  async getPersonalInfo(
    @CurrentAdmin() admin: AdminPayload,
    @Param('id') userId: string,
    @Query('serviceId') serviceId: string | undefined,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ): Promise<PersonalInfoResponse | null> {
    return this.personalInfoService.getPersonalInfoByAdmin(admin.sub, userId, serviceId || null, {
      ip: ip || '0.0.0.0',
      userAgent: userAgent || 'unknown',
    });
  }
}

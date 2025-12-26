import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  HttpCode,
  HttpStatus,
  Ip,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '@my-girok/nest-common';
import { PersonalInfoService } from '../services/personal-info.service';
import { UpdatePersonalInfoDto, PersonalInfoResponse } from '../dto/personal-info.dto';

interface AuthenticatedUser {
  sub: string;
  email: string;
  name: string;
  type: string;
}

@ApiTags('Personal Info')
@Controller('users/me/personal-info')
export class PersonalInfoController {
  constructor(private personalInfoService: PersonalInfoService) {}

  /**
   * Get my personal info
   * GET /v1/users/me/personal-info
   */
  @Get()
  @ApiOperation({ summary: 'Get my personal info' })
  async getMyPersonalInfo(
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ): Promise<PersonalInfoResponse | null> {
    return this.personalInfoService.getMyPersonalInfo(user.sub, {
      ip: ip || '0.0.0.0',
      userAgent: userAgent || 'unknown',
    });
  }

  /**
   * Update my personal info
   * PATCH /v1/users/me/personal-info
   */
  @Patch()
  @ApiOperation({ summary: 'Update my personal info' })
  async updatePersonalInfo(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePersonalInfoDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ): Promise<PersonalInfoResponse> {
    return this.personalInfoService.updatePersonalInfo(user.sub, dto, {
      ip: ip || '0.0.0.0',
      userAgent: userAgent || 'unknown',
    });
  }

  /**
   * Delete my personal info
   * DELETE /v1/users/me/personal-info
   */
  @Delete()
  @ApiOperation({ summary: 'Delete my personal info' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePersonalInfo(
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ): Promise<void> {
    return this.personalInfoService.deletePersonalInfo(user.sub, {
      ip: ip || '0.0.0.0',
      userAgent: userAgent || 'unknown',
    });
  }
}

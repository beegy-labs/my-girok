import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { IntegrityService } from '../services/integrity.service';
import { AdminAuthGuard } from '../guards/admin-auth.guard';
import {
  VerifyIntegrityQueryDto,
  IntegrityVerificationResponse,
  ChainStatsResponse,
} from '../dto/integrity.dto';

@ApiTags('integrity')
@Controller('v1/audit/integrity')
@UseGuards(AdminAuthGuard)
export class IntegrityController {
  constructor(private readonly integrityService: IntegrityService) {}

  @Get('verify')
  @ApiOperation({
    summary: 'Verify audit log chain integrity',
    description:
      'Verifies the SHA-256 checksum chain for audit logs within the specified date range. ' +
      'Returns details of any invalid or tampered entries.',
  })
  @ApiResponse({
    status: 200,
    description: 'Verification completed successfully',
  })
  async verifyIntegrity(
    @Query() query: VerifyIntegrityQueryDto,
  ): Promise<IntegrityVerificationResponse> {
    return this.integrityService.verifyIntegrity(query);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get audit log chain statistics',
    description:
      'Returns statistics about the audit log chain including total entries, ' +
      'entries with/without checksums, and distribution by service.',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  async getChainStats(): Promise<ChainStatsResponse> {
    return this.integrityService.getChainStats();
  }
}

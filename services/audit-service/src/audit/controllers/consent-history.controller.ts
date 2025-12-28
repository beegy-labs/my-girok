import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, ParseUUIDPipe } from '@my-girok/nest-common';
import { ConsentHistoryService } from '../services/consent-history.service';
import {
  ConsentHistoryQueryDto,
  ConsentHistoryResponseDto,
  PaginatedConsentHistoryResponseDto,
  ConsentStatsQueryDto,
  ConsentStatsResponseDto,
} from '../dto/consent-history.dto';

@ApiTags('Consent History')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('audit/consents')
export class ConsentHistoryController {
  constructor(private readonly consentHistoryService: ConsentHistoryService) {}

  @Get()
  @ApiOperation({ summary: 'Get consent history' })
  @ApiResponse({ status: 200, description: 'Consent history retrieved' })
  async getConsentHistory(
    @Query() query: ConsentHistoryQueryDto,
  ): Promise<PaginatedConsentHistoryResponseDto> {
    return this.consentHistoryService.getConsentHistory(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get consent statistics' })
  @ApiResponse({ status: 200, description: 'Consent statistics retrieved' })
  async getConsentStats(@Query() query: ConsentStatsQueryDto): Promise<ConsentStatsResponseDto> {
    return this.consentHistoryService.getConsentStats(query);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get consent history for a specific user' })
  @ApiResponse({ status: 200, description: 'User consent history retrieved' })
  async getUserConsentHistory(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<ConsentHistoryResponseDto[]> {
    return this.consentHistoryService.getUserConsentHistory(userId);
  }
}

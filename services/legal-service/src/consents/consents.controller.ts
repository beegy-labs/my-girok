import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ConsentsService } from './consents.service';
import { GrantConsentDto, WithdrawConsentDto, ConsentResponseDto } from './dto';

@ApiTags('consents')
@ApiBearerAuth()
@Controller('consents')
export class ConsentsController {
  constructor(private readonly consentsService: ConsentsService) {}

  @Post()
  @ApiOperation({ summary: 'Grant consent for a legal document' })
  @ApiResponse({ status: 201, description: 'Consent granted', type: ConsentResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async grantConsent(@Body() dto: GrantConsentDto): Promise<ConsentResponseDto> {
    return this.consentsService.grantConsent(dto);
  }

  @Get('account/:accountId')
  @ApiOperation({ summary: 'Get all consents for an account' })
  @ApiParam({ name: 'accountId', description: 'Account UUID' })
  @ApiQuery({ name: 'status', required: false, enum: ['GRANTED', 'WITHDRAWN', 'EXPIRED'] })
  @ApiResponse({ status: 200, description: 'List of consents', type: [ConsentResponseDto] })
  async getConsentsForAccount(
    @Param('accountId') accountId: string,
    @Query('status') status?: string,
  ): Promise<ConsentResponseDto[]> {
    return this.consentsService.getConsentsForAccount(accountId, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get consent by ID' })
  @ApiParam({ name: 'id', description: 'Consent UUID' })
  @ApiResponse({ status: 200, description: 'Consent details', type: ConsentResponseDto })
  @ApiResponse({ status: 404, description: 'Consent not found' })
  async getConsent(@Param('id') id: string): Promise<ConsentResponseDto> {
    return this.consentsService.getConsent(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Withdraw consent' })
  @ApiParam({ name: 'id', description: 'Consent UUID' })
  @ApiResponse({ status: 204, description: 'Consent withdrawn' })
  @ApiResponse({ status: 404, description: 'Consent not found' })
  async withdrawConsent(@Param('id') id: string, @Body() dto: WithdrawConsentDto): Promise<void> {
    await this.consentsService.withdrawConsent(id, dto);
  }

  @Get('document/:documentId/check/:accountId')
  @ApiOperation({ summary: 'Check if account has consented to a document' })
  @ApiParam({ name: 'documentId', description: 'Legal document UUID' })
  @ApiParam({ name: 'accountId', description: 'Account UUID' })
  @ApiResponse({ status: 200, description: 'Consent status' })
  async checkConsent(
    @Param('documentId') documentId: string,
    @Param('accountId') accountId: string,
  ): Promise<{ hasConsent: boolean; consent?: ConsentResponseDto }> {
    return this.consentsService.checkConsent(documentId, accountId);
  }
}

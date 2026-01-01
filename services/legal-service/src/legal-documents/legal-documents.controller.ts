import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { LegalDocumentsService } from './legal-documents.service';
import { CreateLegalDocumentDto, UpdateLegalDocumentDto, LegalDocumentResponseDto } from './dto';

@ApiTags('legal-documents')
@ApiBearerAuth()
@Controller('legal-documents')
export class LegalDocumentsController {
  constructor(private readonly legalDocumentsService: LegalDocumentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new legal document' })
  @ApiResponse({
    status: 201,
    description: 'Legal document created',
    type: LegalDocumentResponseDto,
  })
  async create(@Body() dto: CreateLegalDocumentDto): Promise<LegalDocumentResponseDto> {
    return this.legalDocumentsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List legal documents' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'countryCode', required: false })
  @ApiQuery({ name: 'locale', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiResponse({
    status: 200,
    description: 'List of legal documents',
    type: [LegalDocumentResponseDto],
  })
  async findAll(
    @Query('type') type?: string,
    @Query('countryCode') countryCode?: string,
    @Query('locale') locale?: string,
    @Query('status') status?: string,
  ): Promise<LegalDocumentResponseDto[]> {
    return this.legalDocumentsService.findAll({ type, countryCode, locale, status });
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active legal documents for a country/locale' })
  @ApiQuery({ name: 'countryCode', required: true })
  @ApiQuery({ name: 'locale', required: false })
  @ApiResponse({
    status: 200,
    description: 'Active legal documents',
    type: [LegalDocumentResponseDto],
  })
  async getActiveDocuments(
    @Query('countryCode') countryCode: string,
    @Query('locale') locale?: string,
  ): Promise<LegalDocumentResponseDto[]> {
    return this.legalDocumentsService.getActiveDocuments(countryCode, locale);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get legal document by ID' })
  @ApiParam({ name: 'id', description: 'Legal document UUID' })
  @ApiResponse({
    status: 200,
    description: 'Legal document details',
    type: LegalDocumentResponseDto,
  })
  async findOne(@Param('id') id: string): Promise<LegalDocumentResponseDto> {
    return this.legalDocumentsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update legal document' })
  @ApiParam({ name: 'id', description: 'Legal document UUID' })
  @ApiResponse({
    status: 200,
    description: 'Legal document updated',
    type: LegalDocumentResponseDto,
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateLegalDocumentDto,
  ): Promise<LegalDocumentResponseDto> {
    return this.legalDocumentsService.update(id, dto);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activate a legal document' })
  @ApiParam({ name: 'id', description: 'Legal document UUID' })
  @ApiResponse({
    status: 200,
    description: 'Legal document activated',
    type: LegalDocumentResponseDto,
  })
  async activate(@Param('id') id: string): Promise<LegalDocumentResponseDto> {
    return this.legalDocumentsService.activate(id);
  }

  @Patch(':id/archive')
  @ApiOperation({ summary: 'Archive a legal document' })
  @ApiParam({ name: 'id', description: 'Legal document UUID' })
  @ApiResponse({
    status: 200,
    description: 'Legal document archived',
    type: LegalDocumentResponseDto,
  })
  async archive(@Param('id') id: string): Promise<LegalDocumentResponseDto> {
    return this.legalDocumentsService.archive(id);
  }
}

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  ParseEnumPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { LegalDocumentsService } from './legal-documents.service';
import {
  CreateLegalDocumentDto,
  UpdateLegalDocumentDto,
  LegalDocumentQueryDto,
  LegalDocumentResponseDto,
  LegalDocumentSummaryDto,
  LegalDocumentListResponseDto,
} from './dto/legal-document.dto';
import { LegalDocumentType } from '.prisma/identity-legal-client';

/**
 * Legal Documents Controller
 *
 * Manages legal document CRUD operations including:
 * - Document creation and versioning
 * - Document retrieval by type, locale, and version
 * - Document updates and archival
 */
@ApiTags('Legal Documents')
@Controller('legal/documents')
export class LegalDocumentsController {
  constructor(private readonly legalDocumentsService: LegalDocumentsService) {}

  /**
   * Create a new legal document
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create legal document',
    description: 'Create a new legal document with version and locale',
  })
  @ApiResponse({ status: 201, type: LegalDocumentResponseDto })
  @ApiResponse({ status: 409, description: 'Document version already exists' })
  async create(@Body() dto: CreateLegalDocumentDto): Promise<LegalDocumentResponseDto> {
    return this.legalDocumentsService.create(dto);
  }

  /**
   * List all legal documents
   */
  @Get()
  @ApiOperation({
    summary: 'List legal documents',
    description: 'List all legal documents with optional filters and pagination',
  })
  @ApiQuery({ name: 'type', required: false, enum: LegalDocumentType })
  @ApiQuery({ name: 'locale', required: false, example: 'en' })
  @ApiQuery({ name: 'countryCode', required: false, example: 'KR' })
  @ApiQuery({ name: 'serviceId', required: false })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, type: LegalDocumentListResponseDto })
  async findAll(@Query() query: LegalDocumentQueryDto): Promise<LegalDocumentListResponseDto> {
    return this.legalDocumentsService.findAll(query);
  }

  /**
   * Get latest active document by type
   */
  @Get('latest/:type')
  @ApiOperation({
    summary: 'Get latest document by type',
    description:
      'Get the latest active document for a type and locale. Falls back to English if locale not found.',
  })
  @ApiParam({ name: 'type', enum: LegalDocumentType })
  @ApiQuery({ name: 'locale', required: false, example: 'en' })
  @ApiQuery({ name: 'countryCode', required: false, example: 'KR' })
  @ApiQuery({ name: 'serviceId', required: false })
  @ApiResponse({ status: 200, type: LegalDocumentResponseDto })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async findLatest(
    @Param('type', new ParseEnumPipe(LegalDocumentType)) type: LegalDocumentType,
    @Query('locale') locale?: string,
    @Query('countryCode') countryCode?: string,
    @Query('serviceId') serviceId?: string,
  ): Promise<LegalDocumentResponseDto> {
    return this.legalDocumentsService.findLatest(type, locale || 'en', countryCode, serviceId);
  }

  /**
   * Get document by ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get document by ID',
    description: 'Retrieve a specific legal document by its ID',
  })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiResponse({ status: 200, type: LegalDocumentResponseDto })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<LegalDocumentResponseDto> {
    return this.legalDocumentsService.findById(id);
  }

  /**
   * Get document by version
   */
  @Get('type/:type/version/:version')
  @ApiOperation({
    summary: 'Get document by version',
    description: 'Retrieve a specific version of a document',
  })
  @ApiParam({ name: 'type', enum: LegalDocumentType })
  @ApiParam({ name: 'version', example: '1.0.0' })
  @ApiQuery({ name: 'locale', required: false, example: 'en' })
  @ApiResponse({ status: 200, type: LegalDocumentResponseDto })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async findByVersion(
    @Param('type', new ParseEnumPipe(LegalDocumentType)) type: LegalDocumentType,
    @Param('version') version: string,
    @Query('locale') locale?: string,
  ): Promise<LegalDocumentResponseDto> {
    return this.legalDocumentsService.findByVersion(type, version, locale || 'en');
  }

  /**
   * Get all versions of a document type
   */
  @Get('type/:type/versions')
  @ApiOperation({
    summary: 'Get document versions',
    description: 'Get all versions of a document type for a locale',
  })
  @ApiParam({ name: 'type', enum: LegalDocumentType })
  @ApiQuery({ name: 'locale', required: false, example: 'en' })
  @ApiResponse({ status: 200, type: [LegalDocumentSummaryDto] })
  async getVersions(
    @Param('type', new ParseEnumPipe(LegalDocumentType)) type: LegalDocumentType,
    @Query('locale') locale?: string,
  ): Promise<LegalDocumentSummaryDto[]> {
    return this.legalDocumentsService.getVersions(type, locale || 'en');
  }

  /**
   * Update a legal document
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Update legal document',
    description: 'Update an existing legal document',
  })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiResponse({ status: 200, type: LegalDocumentResponseDto })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLegalDocumentDto,
  ): Promise<LegalDocumentResponseDto> {
    return this.legalDocumentsService.update(id, dto);
  }

  /**
   * Archive a legal document
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Archive legal document',
    description: 'Archive a legal document (sets isActive to false)',
  })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiResponse({ status: 204, description: 'Document archived successfully' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async archive(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.legalDocumentsService.archive(id);
  }

  /**
   * Create new version of a document
   */
  @Post('type/:type/versions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create new document version',
    description: 'Create a new version of a document, deactivating previous versions',
  })
  @ApiParam({ name: 'type', enum: LegalDocumentType })
  @ApiQuery({ name: 'locale', required: false, example: 'en' })
  @ApiResponse({ status: 201, type: LegalDocumentResponseDto })
  async createVersion(
    @Param('type', new ParseEnumPipe(LegalDocumentType)) type: LegalDocumentType,
    @Query('locale') locale: string = 'en',
    @Body() dto: CreateLegalDocumentDto,
  ): Promise<LegalDocumentResponseDto> {
    return this.legalDocumentsService.createVersion(type, locale, dto);
  }
}

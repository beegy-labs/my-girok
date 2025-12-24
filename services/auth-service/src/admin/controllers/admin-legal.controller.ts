import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdminLegalService } from '../services/admin-legal.service';
import {
  CreateLegalDocumentDto,
  UpdateLegalDocumentDto,
  DocumentListQuery,
  DocumentResponse,
  DocumentListResponse,
  ConsentListQuery,
  ConsentListResponse,
  ConsentStatsResponse,
} from '../dto/admin-legal.dto';
import { AdminAuthGuard } from '../guards/admin-auth.guard';
import { PermissionGuard } from '../guards/permission.guard';
import { Permissions } from '../decorators/permissions.decorator';
import { CurrentAdmin } from '../decorators/current-admin.decorator';
import { AdminPayload } from '../types/admin.types';

@Controller('admin/legal')
@UseGuards(AdminAuthGuard, PermissionGuard)
export class AdminLegalController {
  constructor(private readonly adminLegalService: AdminLegalService) {}

  // ============================================================
  // DOCUMENTS
  // ============================================================

  /**
   * List all legal documents
   * GET /v1/admin/legal/documents
   */
  @Get('documents')
  @Permissions('legal:read')
  async listDocuments(@Query() query: DocumentListQuery): Promise<DocumentListResponse> {
    return this.adminLegalService.listDocuments(query);
  }

  /**
   * Get document by ID
   * GET /v1/admin/legal/documents/:id
   */
  @Get('documents/:id')
  @Permissions('legal:read')
  async getDocument(@Param('id') id: string): Promise<DocumentResponse> {
    return this.adminLegalService.getDocumentById(id);
  }

  /**
   * Create new legal document
   * POST /v1/admin/legal/documents
   */
  @Post('documents')
  @Permissions('legal:create')
  async createDocument(
    @Body() dto: CreateLegalDocumentDto,
    @CurrentAdmin() admin: AdminPayload,
  ): Promise<DocumentResponse> {
    return this.adminLegalService.createDocument(dto, admin);
  }

  /**
   * Update legal document
   * PUT /v1/admin/legal/documents/:id
   */
  @Put('documents/:id')
  @Permissions('legal:update')
  async updateDocument(
    @Param('id') id: string,
    @Body() dto: UpdateLegalDocumentDto,
    @CurrentAdmin() admin: AdminPayload,
  ): Promise<DocumentResponse> {
    return this.adminLegalService.updateDocument(id, dto, admin);
  }

  /**
   * Delete legal document (soft delete)
   * DELETE /v1/admin/legal/documents/:id
   */
  @Delete('documents/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions('legal:delete')
  async deleteDocument(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminPayload,
  ): Promise<void> {
    await this.adminLegalService.deleteDocument(id, admin);
  }

  // ============================================================
  // CONSENTS
  // ============================================================

  /**
   * List user consents
   * GET /v1/admin/legal/consents
   */
  @Get('consents')
  @Permissions('legal:read')
  async listConsents(@Query() query: ConsentListQuery): Promise<ConsentListResponse> {
    return this.adminLegalService.listConsents(query);
  }

  /**
   * Get consent statistics
   * GET /v1/admin/legal/consents/stats
   */
  @Get('consents/stats')
  @Permissions('legal:read')
  async getConsentStats(): Promise<ConsentStatsResponse> {
    return this.adminLegalService.getConsentStats();
  }
}

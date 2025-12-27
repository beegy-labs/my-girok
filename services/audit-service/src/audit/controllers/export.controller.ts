import { Controller, Get, Post, Body, Param, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, ParseUlidPipe, CurrentUser } from '@my-girok/nest-common';
import { ExportService } from '../services/export.service';
import { CreateExportDto, ExportResponseDto } from '../dto/export.dto';

@ApiTags('Export')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('audit/export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new export request' })
  @ApiResponse({ status: 201, description: 'Export request created' })
  async createExport(
    @Body() dto: CreateExportDto,
    @CurrentUser() user: { sub: string },
  ): Promise<ExportResponseDto> {
    return this.exportService.createExport(dto, user.sub);
  }

  @Get(':exportId')
  @ApiOperation({ summary: 'Get export status' })
  @ApiResponse({ status: 200, description: 'Export status retrieved' })
  async getExportStatus(
    @Param('exportId', ParseUlidPipe) exportId: string,
  ): Promise<ExportResponseDto> {
    return this.exportService.getExportStatus(exportId);
  }

  @Get(':exportId/download')
  @ApiOperation({ summary: 'Download export file' })
  @ApiResponse({ status: 200, description: 'File download' })
  @ApiResponse({ status: 404, description: 'Export not found or not ready' })
  async downloadExport(
    @Param('exportId', ParseUlidPipe) exportId: string,
    @Res() res: Response,
  ): Promise<void> {
    const downloadUrl = await this.exportService.getExportDownloadUrl(exportId);
    res.redirect(downloadUrl);
  }
}

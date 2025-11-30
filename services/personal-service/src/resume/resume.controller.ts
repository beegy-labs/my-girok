import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Patch,
  Param,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  Query,
  ParseEnumPipe,
  Res,
  Header,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam, ApiConsumes, ApiBody, ApiQuery } from '@nestjs/swagger';
import { CurrentUser, Public } from '@my-girok/nest-common';
import { ResumeService } from './resume.service';
import { CreateResumeDto, UpdateResumeDto, UpdateSectionOrderDto, ToggleSectionVisibilityDto } from './dto';
import { AttachmentType } from '../storage/dto';
import { StorageService } from '../storage/storage.service';

@ApiTags('resume')
@Controller('resume')
export class ResumeController {
  constructor(
    private readonly resumeService: ResumeService,
    private readonly storageService: StorageService,
  ) {}

  // Public endpoint - Get user's default resume by username
  @Public()
  @Get('public/:username')
  @ApiOperation({ summary: 'Get user default resume by username (public access)' })
  @ApiParam({ name: 'username', description: 'User username' })
  @ApiResponse({ status: 200, description: 'Resume found' })
  @ApiResponse({ status: 404, description: 'User or resume not found' })
  @HttpCode(HttpStatus.OK)
  async getPublicResumeByUsername(@Param('username') username: string) {
    return this.resumeService.getPublicResumeByUsername(username);
  }

  // ========== Image Proxy Endpoint (for PDF export) ==========
  // IMPORTANT: Must be defined BEFORE dynamic routes like /:resumeId to prevent route conflicts

  @Public()
  @Get('image-proxy')
  @ApiOperation({
    summary: 'Proxy images from MinIO with CORS headers',
    description: 'Serves images from MinIO with proper CORS headers for PDF export via html2canvas'
  })
  @ApiQuery({ name: 'key', description: 'MinIO file key (e.g., resumes/userId/resumeId/filename.jpg)' })
  @ApiResponse({ status: 200, description: 'Image retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Missing or invalid file key' })
  @ApiResponse({ status: 404, description: 'Image not found' })
  @Header('Access-Control-Allow-Origin', '*')
  @Header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
  @Header('Access-Control-Allow-Headers', '*')
  @Header('Cache-Control', 'public, max-age=31536000')
  async proxyImage(@Query('key') fileKey: string, @Res() res: Response): Promise<void> {
    if (!fileKey) {
      res.status(400).json({ message: 'File key is required' });
      return;
    }

    // Log the requested file key for debugging
    console.log(`[ImageProxy] Requested fileKey: ${fileKey}`);

    try {
      const { stream, contentType, size } = await this.storageService.getFileStream(fileKey);

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', size);

      stream.pipe(res);
    } catch (error) {
      console.error(`[ImageProxy] Failed to get file: ${fileKey}`, error);
      res.status(404).json({ message: 'Image not found' });
    }
  }

  // Protected endpoints below - JwtAuthGuard is applied globally
  @Post()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new resume' })
  @ApiResponse({ status: 201, description: 'Resume created successfully' })
  async create(@CurrentUser() user: any, @Body() dto: CreateResumeDto) {
    return this.resumeService.create(user.id, dto);
  }

  @Get()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all my resumes' })
  @ApiResponse({ status: 200, description: 'Resumes found', isArray: true })
  async getAllResumes(@CurrentUser() user: any) {
    return this.resumeService.findAllByUserId(user.id);
  }

  @Get('default')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get my default resume (or first resume)' })
  @ApiResponse({ status: 200, description: 'Default resume found' })
  @ApiResponse({ status: 404, description: 'No resume found' })
  async getDefaultResume(@CurrentUser() user: any) {
    return this.resumeService.getDefaultResume(user.id);
  }

  @Get(':resumeId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get specific resume by ID' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiResponse({ status: 200, description: 'Resume found' })
  @ApiResponse({ status: 404, description: 'Resume not found' })
  async getResume(@CurrentUser() user: any, @Param('resumeId') resumeId: string) {
    return this.resumeService.findByIdAndUserId(resumeId, user.id);
  }

  @Put(':resumeId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update specific resume' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiResponse({ status: 200, description: 'Resume updated successfully' })
  @ApiResponse({ status: 404, description: 'Resume not found' })
  async update(
    @CurrentUser() user: any,
    @Param('resumeId') resumeId: string,
    @Body() dto: UpdateResumeDto,
  ) {
    return this.resumeService.update(resumeId, user.id, dto);
  }

  @Delete(':resumeId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete specific resume' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiResponse({ status: 200, description: 'Resume deleted successfully' })
  @ApiResponse({ status: 404, description: 'Resume not found' })
  async delete(@CurrentUser() user: any, @Param('resumeId') resumeId: string) {
    return this.resumeService.delete(resumeId, user.id);
  }

  @Patch(':resumeId/default')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Set resume as default' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiResponse({ status: 200, description: 'Resume set as default' })
  @ApiResponse({ status: 404, description: 'Resume not found' })
  async setDefault(@CurrentUser() user: any, @Param('resumeId') resumeId: string) {
    return this.resumeService.setDefaultResume(resumeId, user.id);
  }

  @Post(':resumeId/copy')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Copy/duplicate a resume' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID to copy' })
  @ApiResponse({ status: 201, description: 'Resume copied successfully' })
  @ApiResponse({ status: 404, description: 'Resume not found' })
  async copyResume(@CurrentUser() user: any, @Param('resumeId') resumeId: string) {
    return this.resumeService.copyResume(resumeId, user.id);
  }

  @Patch(':resumeId/sections/order')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update section display order' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiResponse({ status: 200, description: 'Section order updated' })
  async updateSectionOrder(
    @CurrentUser() user: any,
    @Param('resumeId') resumeId: string,
    @Body() dto: UpdateSectionOrderDto,
  ) {
    return this.resumeService.updateSectionOrder(resumeId, user.id, dto);
  }

  @Patch(':resumeId/sections/visibility')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Toggle section visibility' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiResponse({ status: 200, description: 'Section visibility updated' })
  async toggleSectionVisibility(
    @CurrentUser() user: any,
    @Param('resumeId') resumeId: string,
    @Body() dto: ToggleSectionVisibilityDto,
  ) {
    return this.resumeService.toggleSectionVisibility(resumeId, user.id, dto);
  }

  // ========== Temporary File Upload Endpoints ==========

  @Post('temp-upload')
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Upload file to temporary storage',
    description: 'Upload image to temp storage for preview. Returns presigned URL. File moves to permanent storage on resume save.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file to upload (max 10MB)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded to temp storage',
    schema: {
      type: 'object',
      properties: {
        tempKey: { type: 'string', description: 'Temporary file key' },
        previewUrl: { type: 'string', description: 'Presigned URL for preview (1 hour validity)' },
        fileSize: { type: 'number', description: 'File size in bytes' },
        mimeType: { type: 'string', description: 'File MIME type' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid file or file type' })
  async uploadToTemp(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.storageService.uploadToTemp(file, user.id);
  }

  @Delete('temp-upload')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete temporary file',
    description: 'Delete file from temp storage (for cleanup when user cancels)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['tempKey'],
      properties: {
        tempKey: { type: 'string', description: 'Temporary file key' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Temp file deleted' })
  @ApiResponse({ status: 400, description: 'Invalid temp key' })
  @HttpCode(HttpStatus.OK)
  async deleteTempFile(
    @CurrentUser() user: any,
    @Body('tempKey') tempKey: string,
  ) {
    await this.storageService.deleteTempFile(tempKey, user.id);
    return { message: 'Temp file deleted successfully' };
  }

  // ========== File Attachment Endpoints ==========

  @Post(':resumeId/attachments')
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Upload file attachment to resume',
    description: 'Upload profile photo (auto-converted to grayscale), portfolio, or certificate. Max size: 10MB.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'type'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to upload',
        },
        type: {
          type: 'string',
          enum: ['PROFILE_PHOTO', 'PORTFOLIO', 'CERTIFICATE', 'OTHER'],
          description: 'Type of attachment',
        },
        title: {
          type: 'string',
          description: 'Optional title',
          maxLength: 200,
        },
        description: {
          type: 'string',
          description: 'Optional description',
          maxLength: 1000,
        },
      },
    },
  })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file or file type' })
  @ApiResponse({ status: 404, description: 'Resume not found' })
  async uploadAttachment(
    @CurrentUser() user: any,
    @Param('resumeId') resumeId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('type', new ParseEnumPipe(AttachmentType)) type: AttachmentType,
    @Body('title') title?: string,
    @Body('description') description?: string,
  ) {
    return this.resumeService.uploadAttachment(resumeId, user.id, file, type, title, description);
  }

  @Get(':resumeId/attachments')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all attachments for a resume' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: AttachmentType,
    description: 'Filter by attachment type',
  })
  @ApiResponse({ status: 200, description: 'Attachments found', isArray: true })
  @ApiResponse({ status: 404, description: 'Resume not found' })
  async getAttachments(
    @CurrentUser() user: any,
    @Param('resumeId') resumeId: string,
    @Query('type') type?: AttachmentType,
  ) {
    if (type) {
      return this.resumeService.getAttachmentsByType(resumeId, user.id, type);
    }
    return this.resumeService.getAttachments(resumeId, user.id);
  }

  @Patch(':resumeId/attachments/:attachmentId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update attachment metadata' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiParam({ name: 'attachmentId', description: 'Attachment ID' })
  @ApiResponse({ status: 200, description: 'Attachment updated successfully' })
  @ApiResponse({ status: 404, description: 'Resume or attachment not found' })
  async updateAttachment(
    @CurrentUser() user: any,
    @Param('resumeId') resumeId: string,
    @Param('attachmentId') attachmentId: string,
    @Body('title') title?: string,
    @Body('description') description?: string,
    @Body('visible') visible?: boolean,
  ) {
    return this.resumeService.updateAttachment(attachmentId, resumeId, user.id, title, description, visible);
  }

  @Delete(':resumeId/attachments/:attachmentId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete attachment' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiParam({ name: 'attachmentId', description: 'Attachment ID' })
  @ApiResponse({ status: 200, description: 'Attachment deleted successfully' })
  @ApiResponse({ status: 404, description: 'Resume or attachment not found' })
  async deleteAttachment(
    @CurrentUser() user: any,
    @Param('resumeId') resumeId: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    return this.resumeService.deleteAttachment(attachmentId, resumeId, user.id);
  }

  @Patch(':resumeId/attachments/reorder')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Reorder attachments of a specific type' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiResponse({ status: 200, description: 'Attachments reordered successfully' })
  @ApiResponse({ status: 404, description: 'Resume not found' })
  async reorderAttachments(
    @CurrentUser() user: any,
    @Param('resumeId') resumeId: string,
    @Body('type', new ParseEnumPipe(AttachmentType)) type: AttachmentType,
    @Body('attachmentIds') attachmentIds: string[],
  ) {
    return this.resumeService.reorderAttachments(resumeId, user.id, type, attachmentIds);
  }
}

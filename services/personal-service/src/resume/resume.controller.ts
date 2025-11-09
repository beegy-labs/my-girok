import { Controller, Get, Post, Put, Delete, Body, UseGuards, Patch, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ResumeService } from './resume.service';
import { CreateResumeDto, UpdateResumeDto, UpdateSectionOrderDto, ToggleSectionVisibilityDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators';

@ApiTags('resume')
@Controller('v1/resume')
export class ResumeController {
  constructor(private readonly resumeService: ResumeService) {}

  // Public endpoint - Get user's default resume by username
  @Get('public/:username')
  @ApiOperation({ summary: 'Get user default resume by username (public access)' })
  @ApiParam({ name: 'username', description: 'User username' })
  @ApiResponse({ status: 200, description: 'Resume found' })
  @ApiResponse({ status: 404, description: 'User or resume not found' })
  @HttpCode(HttpStatus.OK)
  async getPublicResumeByUsername(@Param('username') username: string) {
    return this.resumeService.getPublicResumeByUsername(username);
  }

  // Protected endpoints below
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')

  @Post()
  @ApiOperation({ summary: 'Create a new resume' })
  @ApiResponse({ status: 201, description: 'Resume created successfully' })
  async create(@CurrentUser() user: any, @Body() dto: CreateResumeDto) {
    return this.resumeService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all my resumes' })
  @ApiResponse({ status: 200, description: 'Resumes found', isArray: true })
  async getAllResumes(@CurrentUser() user: any) {
    return this.resumeService.findAllByUserId(user.id);
  }

  @Get('default')
  @ApiOperation({ summary: 'Get my default resume (or first resume)' })
  @ApiResponse({ status: 200, description: 'Default resume found' })
  @ApiResponse({ status: 404, description: 'No resume found' })
  async getDefaultResume(@CurrentUser() user: any) {
    return this.resumeService.getDefaultResume(user.id);
  }

  @Get(':resumeId')
  @ApiOperation({ summary: 'Get specific resume by ID' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiResponse({ status: 200, description: 'Resume found' })
  @ApiResponse({ status: 404, description: 'Resume not found' })
  async getResume(@CurrentUser() user: any, @Param('resumeId') resumeId: string) {
    return this.resumeService.findByIdAndUserId(resumeId, user.id);
  }

  @Put(':resumeId')
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
  @ApiOperation({ summary: 'Delete specific resume' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiResponse({ status: 200, description: 'Resume deleted successfully' })
  @ApiResponse({ status: 404, description: 'Resume not found' })
  async delete(@CurrentUser() user: any, @Param('resumeId') resumeId: string) {
    return this.resumeService.delete(resumeId, user.id);
  }

  @Patch(':resumeId/default')
  @ApiOperation({ summary: 'Set resume as default' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiResponse({ status: 200, description: 'Resume set as default' })
  @ApiResponse({ status: 404, description: 'Resume not found' })
  async setDefault(@CurrentUser() user: any, @Param('resumeId') resumeId: string) {
    return this.resumeService.setDefaultResume(resumeId, user.id);
  }

  @Patch(':resumeId/sections/order')
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
}

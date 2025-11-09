import { Controller, Get, Post, Put, Delete, Body, UseGuards, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { ResumeService } from './resume.service';
import { CreateResumeDto, UpdateResumeDto, UpdateSectionOrderDto, ToggleSectionVisibilityDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators';

@ApiTags('resume')
@Controller('v1/resume')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ResumeController {
  constructor(private readonly resumeService: ResumeService) {}

  @Post()
  @ApiOperation({ summary: 'Create resume (one per user)' })
  @ApiResponse({ status: 201, description: 'Resume created successfully' })
  @ApiResponse({ status: 409, description: 'Resume already exists' })
  async create(@CurrentUser() user: any, @Body() dto: CreateResumeDto) {
    return this.resumeService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get my resume' })
  @ApiResponse({ status: 200, description: 'Resume found' })
  @ApiResponse({ status: 404, description: 'Resume not found' })
  async getMyResume(@CurrentUser() user: any) {
    return this.resumeService.findByUserId(user.id);
  }

  @Put()
  @ApiOperation({ summary: 'Update resume' })
  @ApiResponse({ status: 200, description: 'Resume updated successfully' })
  @ApiResponse({ status: 404, description: 'Resume not found' })
  async update(@CurrentUser() user: any, @Body() dto: UpdateResumeDto) {
    return this.resumeService.update(user.id, dto);
  }

  @Delete()
  @ApiOperation({ summary: 'Delete resume' })
  @ApiResponse({ status: 200, description: 'Resume deleted successfully' })
  @ApiResponse({ status: 404, description: 'Resume not found' })
  async delete(@CurrentUser() user: any) {
    return this.resumeService.delete(user.id);
  }

  @Patch('sections/order')
  @ApiOperation({ summary: 'Update section display order' })
  @ApiResponse({ status: 200, description: 'Section order updated' })
  async updateSectionOrder(@CurrentUser() user: any, @Body() dto: UpdateSectionOrderDto) {
    return this.resumeService.updateSectionOrder(user.id, dto);
  }

  @Patch('sections/visibility')
  @ApiOperation({ summary: 'Toggle section visibility' })
  @ApiResponse({ status: 200, description: 'Section visibility updated' })
  async toggleSectionVisibility(@CurrentUser() user: any, @Body() dto: ToggleSectionVisibilityDto) {
    return this.resumeService.toggleSectionVisibility(user.id, dto);
  }
}

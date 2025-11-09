import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { ShareService } from './share.service';
import { CreateShareLinkDto, UpdateShareLinkDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, Public } from '../common/decorators';

@ApiTags('share')
@Controller('v1/share')
export class ShareController {
  constructor(private readonly shareService: ShareService) {}

  @Post('resume/:resumeId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create resume share link' })
  @ApiResponse({ status: 201, description: 'Share link created' })
  @ApiResponse({ status: 404, description: 'Resume not found' })
  async createResumeShare(
    @CurrentUser() user: any,
    @Param('resumeId') resumeId: string,
    @Body() dto: CreateShareLinkDto,
  ) {
    return this.shareService.createForResume(user.id, resumeId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get my share links' })
  @ApiResponse({ status: 200, description: 'Share links retrieved' })
  async getMyShareLinks(@CurrentUser() user: any) {
    return this.shareService.findAllByUser(user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get share link by ID' })
  @ApiResponse({ status: 200, description: 'Share link found' })
  @ApiResponse({ status: 404, description: 'Share link not found' })
  async getShareLink(@Param('id') id: string, @CurrentUser() user: any) {
    return this.shareService.findOne(id, user.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update share link settings' })
  @ApiResponse({ status: 200, description: 'Share link updated' })
  @ApiResponse({ status: 404, description: 'Share link not found' })
  async updateShareLink(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateShareLinkDto,
  ) {
    return this.shareService.update(id, user.id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete share link' })
  @ApiResponse({ status: 200, description: 'Share link deleted' })
  @ApiResponse({ status: 404, description: 'Share link not found' })
  async deleteShareLink(@Param('id') id: string, @CurrentUser() user: any) {
    return this.shareService.delete(id, user.id);
  }

  @Get('public/:token')
  @Public()
  @ApiOperation({ summary: 'Get public resume by share token (no auth)' })
  @ApiResponse({ status: 200, description: 'Resume retrieved' })
  @ApiResponse({ status: 404, description: 'Invalid share link' })
  @ApiResponse({ status: 403, description: 'Share link expired or deactivated' })
  async getPublicResume(@Param('token') token: string) {
    return this.shareService.getPublicResume(token);
  }
}

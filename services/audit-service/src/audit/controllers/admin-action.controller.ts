import { Controller, Get, Query, Param, NotFoundException, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, ParseUUIDPipe } from '@my-girok/nest-common';
import { AdminActionService } from '../services/admin-action.service';
import {
  AdminActionQueryDto,
  AdminActionResponseDto,
  PaginatedAdminActionResponseDto,
} from '../dto/admin-action.dto';

@ApiTags('Admin Actions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('audit/admin-actions')
export class AdminActionController {
  constructor(private readonly adminActionService: AdminActionService) {}

  @Get()
  @ApiOperation({ summary: 'Get admin actions' })
  @ApiResponse({ status: 200, description: 'Admin actions retrieved' })
  async getAdminActions(
    @Query() query: AdminActionQueryDto,
  ): Promise<PaginatedAdminActionResponseDto> {
    return this.adminActionService.getAdminActions(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get admin action by ID' })
  @ApiResponse({ status: 200, description: 'Admin action found' })
  @ApiResponse({ status: 404, description: 'Admin action not found' })
  async getAdminActionById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AdminActionResponseDto> {
    const action = await this.adminActionService.getAdminActionById(id);
    if (!action) {
      throw new NotFoundException(`Admin action ${id} not found`);
    }
    return action;
  }
}

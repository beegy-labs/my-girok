import { Controller, Get, Patch, Param, Body, NotFoundException, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@my-girok/nest-common';
import { RetentionService, RetentionPolicy } from './retention.service';

class UpdateRetentionPolicyDto {
  retentionDays?: number;
  isActive?: boolean;
}

@ApiTags('Retention')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('audit/retention')
export class RetentionController {
  constructor(private readonly retentionService: RetentionService) {}

  @Get()
  @ApiOperation({ summary: 'Get all retention policies' })
  @ApiResponse({ status: 200 })
  async getPolicies(): Promise<RetentionPolicy[]> {
    return this.retentionService.getPolicies();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get retention policy by ID' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Policy not found' })
  async getPolicy(@Param('id') id: string): Promise<RetentionPolicy> {
    const policy = await this.retentionService.getPolicy(id);
    if (!policy) {
      throw new NotFoundException(`Retention policy ${id} not found`);
    }
    return policy;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update retention policy' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Policy not found' })
  async updatePolicy(
    @Param('id') id: string,
    @Body() dto: UpdateRetentionPolicyDto,
  ): Promise<RetentionPolicy> {
    const policy = await this.retentionService.updatePolicy(id, dto);
    if (!policy) {
      throw new NotFoundException(`Retention policy ${id} not found`);
    }
    return policy;
  }
}

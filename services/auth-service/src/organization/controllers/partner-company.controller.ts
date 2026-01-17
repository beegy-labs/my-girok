import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { AdminAuthGuard } from '../../admin/guards/admin-auth.guard';
import { PartnerCompanyService } from '../services/partner-company.service';
import {
  CreatePartnerCompanyDto,
  UpdatePartnerCompanyDto,
  PartnerCompanyResponseDto,
  PartnerCompanyListQueryDto,
} from '../dto/partner-company.dto';

@ApiTags('Organization - Partner Companies')
@ApiBearerAuth()
@UseGuards(AdminAuthGuard)
@Controller('organization/partner-companies')
export class PartnerCompanyController {
  constructor(private readonly partnerCompanyService: PartnerCompanyService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new partner company' })
  @ApiResponse({
    status: 201,
    description: 'Partner company created successfully',
    type: PartnerCompanyResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Partner company code already exists' })
  create(@Body() dto: CreatePartnerCompanyDto): Promise<PartnerCompanyResponseDto> {
    return this.partnerCompanyService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all partner companies' })
  @ApiQuery({
    name: 'partnerType',
    required: false,
    enum: ['VENDOR', 'CONTRACTOR', 'CONSULTANT', 'AGENCY', 'SUPPLIER', 'PARTNER'],
  })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: 'List of partner companies',
    type: [PartnerCompanyResponseDto],
  })
  findAll(@Query() query: PartnerCompanyListQueryDto): Promise<PartnerCompanyResponseDto[]> {
    return this.partnerCompanyService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a partner company by ID' })
  @ApiResponse({
    status: 200,
    description: 'Partner company details',
    type: PartnerCompanyResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Partner company not found' })
  findOne(@Param('id') id: string): Promise<PartnerCompanyResponseDto> {
    return this.partnerCompanyService.findOne(id);
  }

  @Get(':id/agreements')
  @ApiOperation({
    summary: 'Get service agreements for a partner company',
    description: 'Returns all service agreements with this partner',
  })
  @ApiResponse({
    status: 200,
    description: 'List of service agreements',
  })
  @ApiResponse({ status: 404, description: 'Partner company not found' })
  findAgreements(@Param('id') id: string): Promise<any[]> {
    return this.partnerCompanyService.findAgreements(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a partner company' })
  @ApiResponse({
    status: 200,
    description: 'Partner company updated successfully',
    type: PartnerCompanyResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Partner company not found' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePartnerCompanyDto,
  ): Promise<PartnerCompanyResponseDto> {
    return this.partnerCompanyService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a partner company' })
  @ApiResponse({ status: 204, description: 'Partner company deleted successfully' })
  @ApiResponse({ status: 404, description: 'Partner company not found' })
  remove(@Param('id') id: string): Promise<void> {
    return this.partnerCompanyService.remove(id);
  }
}

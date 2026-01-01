import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { DsrRequestsService } from './dsr-requests.service';
import { CreateDsrRequestDto, UpdateDsrRequestDto, DsrRequestResponseDto } from './dto';

@ApiTags('dsr')
@ApiBearerAuth()
@Controller('dsr-requests')
export class DsrRequestsController {
  constructor(private readonly dsrService: DsrRequestsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new DSR request' })
  @ApiResponse({ status: 201, description: 'DSR request created', type: DsrRequestResponseDto })
  async create(@Body() dto: CreateDsrRequestDto): Promise<DsrRequestResponseDto> {
    return this.dsrService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List DSR requests' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of DSR requests', type: [DsrRequestResponseDto] })
  async findAll(
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<{ data: DsrRequestResponseDto[]; total: number }> {
    return this.dsrService.findAll({ status, type, page, limit });
  }

  @Get('account/:accountId')
  @ApiOperation({ summary: 'Get DSR requests for an account' })
  @ApiParam({ name: 'accountId', description: 'Account UUID' })
  @ApiResponse({ status: 200, description: 'List of DSR requests', type: [DsrRequestResponseDto] })
  async findByAccount(@Param('accountId') accountId: string): Promise<DsrRequestResponseDto[]> {
    return this.dsrService.findByAccount(accountId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get DSR request by ID' })
  @ApiParam({ name: 'id', description: 'DSR request UUID' })
  @ApiResponse({ status: 200, description: 'DSR request details', type: DsrRequestResponseDto })
  @ApiResponse({ status: 404, description: 'DSR request not found' })
  async findOne(@Param('id') id: string): Promise<DsrRequestResponseDto> {
    return this.dsrService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update DSR request status' })
  @ApiParam({ name: 'id', description: 'DSR request UUID' })
  @ApiResponse({ status: 200, description: 'DSR request updated', type: DsrRequestResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDsrRequestDto,
  ): Promise<DsrRequestResponseDto> {
    return this.dsrService.update(id, dto);
  }
}

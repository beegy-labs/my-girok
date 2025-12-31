import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { DsrRequestsService } from './dsr-requests.service';
import {
  CreateDsrRequestDto,
  VerifyDsrRequestDto,
  ProcessDsrRequestDto,
  ExtendDsrDeadlineDto,
  DsrRequestQueryDto,
  DsrRequestResponseDto,
  DsrRequestListResponseDto,
  DsrRequestSummaryDto,
  DsrRequestLogDto,
  DsrStatisticsDto,
} from './dto/dsr-request.dto';

/**
 * DSR Requests Controller
 *
 * REST API endpoints for Data Subject Request management
 * (GDPR Article 15-22, CCPA, etc.)
 */
@ApiTags('DSR Requests')
@Controller('dsr-requests')
export class DsrRequestsController {
  constructor(private readonly dsrRequestsService: DsrRequestsService) {}

  /**
   * Submit a new DSR request
   */
  @Post()
  @ApiOperation({ summary: 'Submit a new DSR request' })
  @ApiResponse({
    status: 201,
    description: 'Request submitted successfully',
    type: DsrRequestResponseDto,
  })
  async submit(@Body() dto: CreateDsrRequestDto): Promise<DsrRequestResponseDto> {
    return this.dsrRequestsService.submit(dto);
  }

  /**
   * List DSR requests with filters
   */
  @Get()
  @ApiOperation({ summary: 'List DSR requests with filters' })
  @ApiResponse({
    status: 200,
    description: 'List of DSR requests',
    type: DsrRequestListResponseDto,
  })
  async findAll(@Query() query: DsrRequestQueryDto): Promise<DsrRequestListResponseDto> {
    return this.dsrRequestsService.findAll(query);
  }

  /**
   * Get DSR statistics
   */
  @Get('statistics')
  @ApiOperation({ summary: 'Get DSR request statistics' })
  @ApiResponse({
    status: 200,
    description: 'DSR statistics',
    type: DsrStatisticsDto,
  })
  async getStatistics(): Promise<DsrStatisticsDto> {
    return this.dsrRequestsService.getStatistics();
  }

  /**
   * Get overdue requests
   */
  @Get('overdue')
  @ApiOperation({ summary: 'Get overdue DSR requests' })
  @ApiResponse({
    status: 200,
    description: 'List of overdue requests',
    type: [DsrRequestSummaryDto],
  })
  async getOverdueRequests(): Promise<DsrRequestSummaryDto[]> {
    return this.dsrRequestsService.getOverdueRequests();
  }

  /**
   * Get pending count
   */
  @Get('pending/count')
  @ApiOperation({ summary: 'Get count of pending DSR requests' })
  @ApiResponse({
    status: 200,
    description: 'Pending count',
    schema: { type: 'object', properties: { count: { type: 'number' } } },
  })
  async getPendingCount(): Promise<{ count: number }> {
    const count = await this.dsrRequestsService.getPendingCount();
    return { count };
  }

  /**
   * Get requests for an account
   */
  @Get('account/:accountId')
  @ApiOperation({ summary: 'Get DSR requests for an account' })
  @ApiParam({ name: 'accountId', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'List of requests for the account',
    type: [DsrRequestSummaryDto],
  })
  async findByAccount(@Param('accountId') accountId: string): Promise<DsrRequestSummaryDto[]> {
    return this.dsrRequestsService.findByAccount(accountId);
  }

  /**
   * Get DSR request by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get DSR request by ID' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'DSR request details',
    type: DsrRequestResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Request not found' })
  async findById(@Param('id') id: string): Promise<DsrRequestResponseDto> {
    return this.dsrRequestsService.findById(id);
  }

  /**
   * Get audit logs for a request
   */
  @Get(':id/logs')
  @ApiOperation({ summary: 'Get audit logs for a DSR request' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'List of audit logs',
    type: [DsrRequestLogDto],
  })
  async getLogs(@Param('id') id: string): Promise<DsrRequestLogDto[]> {
    return this.dsrRequestsService.getLogs(id);
  }

  /**
   * Verify a DSR request
   */
  @Post(':id/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify a DSR request' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Request verified',
    type: DsrRequestResponseDto,
  })
  async verify(
    @Param('id') id: string,
    @Body() dto: VerifyDsrRequestDto,
  ): Promise<DsrRequestResponseDto> {
    // TODO: Get operator ID from auth context
    const operatorId = 'system';
    return this.dsrRequestsService.verify(id, dto, operatorId);
  }

  /**
   * Process a DSR request
   */
  @Post(':id/process')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process a DSR request (start, complete, reject)' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Request processed',
    type: DsrRequestResponseDto,
  })
  async process(
    @Param('id') id: string,
    @Body() dto: ProcessDsrRequestDto,
  ): Promise<DsrRequestResponseDto> {
    // TODO: Get operator ID from auth context
    const operatorId = 'system';
    return this.dsrRequestsService.process(id, dto, operatorId);
  }

  /**
   * Extend deadline for a DSR request
   */
  @Post(':id/extend-deadline')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Extend deadline for a DSR request' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Deadline extended',
    type: DsrRequestResponseDto,
  })
  async extendDeadline(
    @Param('id') id: string,
    @Body() dto: ExtendDsrDeadlineDto,
  ): Promise<DsrRequestResponseDto> {
    // TODO: Get operator ID from auth context
    const operatorId = 'system';
    return this.dsrRequestsService.extendDeadline(id, dto, operatorId);
  }

  /**
   * Assign request to operator
   */
  @Post(':id/assign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign DSR request to an operator' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Request assigned',
    type: DsrRequestResponseDto,
  })
  async assign(
    @Param('id') id: string,
    @Body('assignedTo') assignedTo: string,
  ): Promise<DsrRequestResponseDto> {
    // TODO: Get operator ID from auth context
    const operatorId = 'system';
    return this.dsrRequestsService.assign(id, assignedTo, operatorId);
  }

  /**
   * Cancel a DSR request
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel a DSR request' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 204, description: 'Request cancelled' })
  async cancel(@Param('id') id: string, @Body('reason') reason: string): Promise<void> {
    // TODO: Get operator ID from auth context
    const operatorId = 'system';
    await this.dsrRequestsService.cancel(id, reason, operatorId);
  }
}

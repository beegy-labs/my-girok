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
  UseGuards,
  ParseUUIDPipe,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiHeader,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
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
@ApiBearerAuth()
@UseGuards(ApiKeyGuard)
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
  async findByAccount(
    @Param('accountId', ParseUUIDPipe) accountId: string,
  ): Promise<DsrRequestSummaryDto[]> {
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
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<DsrRequestResponseDto> {
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
  async getLogs(@Param('id', ParseUUIDPipe) id: string): Promise<DsrRequestLogDto[]> {
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
  @ApiHeader({
    name: 'x-operator-id',
    description: 'Operator ID from auth context',
    required: true,
  })
  async verify(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VerifyDsrRequestDto,
    @Headers('x-operator-id') operatorId: string,
  ): Promise<DsrRequestResponseDto> {
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
  @ApiHeader({
    name: 'x-operator-id',
    description: 'Operator ID from auth context',
    required: true,
  })
  async process(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ProcessDsrRequestDto,
    @Headers('x-operator-id') operatorId: string,
  ): Promise<DsrRequestResponseDto> {
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
  @ApiHeader({
    name: 'x-operator-id',
    description: 'Operator ID from auth context',
    required: true,
  })
  async extendDeadline(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ExtendDsrDeadlineDto,
    @Headers('x-operator-id') operatorId: string,
  ): Promise<DsrRequestResponseDto> {
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
  @ApiHeader({
    name: 'x-operator-id',
    description: 'Operator ID from auth context',
    required: true,
  })
  async assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('assignedTo') assignedTo: string,
    @Headers('x-operator-id') operatorId: string,
  ): Promise<DsrRequestResponseDto> {
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
  @ApiHeader({
    name: 'x-operator-id',
    description: 'Operator ID from auth context',
    required: true,
  })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @Headers('x-operator-id') operatorId: string,
  ): Promise<void> {
    await this.dsrRequestsService.cancel(id, reason, operatorId);
  }
}

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { DevicesService, DeviceResponse } from './devices.service';
import { PaginatedResponse } from '../../common/pagination';
import { RegisterDeviceDto, DeviceQueryDto, DeviceType } from './dto/register-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';

@ApiTags('devices')
@Controller('devices')
@ApiBearerAuth()
@UseGuards(ApiKeyGuard)
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 device registrations per minute
  @ApiOperation({ summary: 'Register a new device' })
  @ApiResponse({
    status: 201,
    description: 'Device registered successfully',
  })
  @ApiResponse({ status: 404, description: 'Account not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async register(@Body() dto: RegisterDeviceDto): Promise<DeviceResponse> {
    return this.devicesService.register(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List devices with pagination and filtering' })
  @ApiQuery({
    name: 'accountId',
    required: false,
    type: String,
    description: 'Filter by account ID',
  })
  @ApiQuery({
    name: 'deviceType',
    required: false,
    enum: DeviceType,
    description: 'Filter by device type',
  })
  @ApiQuery({
    name: 'isTrusted',
    required: false,
    type: Boolean,
    description: 'Filter by trusted status',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20, max: 100)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of devices with pagination metadata',
  })
  async findAll(
    @Query('accountId') accountId?: string,
    @Query('deviceType') deviceType?: DeviceType,
    @Query('isTrusted') isTrusted?: boolean,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<PaginatedResponse<DeviceResponse>> {
    const params: DeviceQueryDto = {
      accountId,
      deviceType,
      isTrusted,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    };
    return this.devicesService.findAll(params);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get device by ID' })
  @ApiParam({ name: 'id', description: 'Device UUID' })
  @ApiResponse({ status: 200, description: 'Device found' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<DeviceResponse> {
    return this.devicesService.findById(id);
  }

  @Get('account/:accountId/fingerprint/:fingerprint')
  @ApiOperation({ summary: 'Get device by fingerprint for account' })
  @ApiParam({ name: 'accountId', description: 'Account UUID' })
  @ApiParam({ name: 'fingerprint', description: 'Device fingerprint' })
  @ApiResponse({ status: 200, description: 'Device found' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  async findByFingerprint(
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Param('fingerprint') fingerprint: string,
  ): Promise<DeviceResponse | null> {
    return this.devicesService.findByFingerprint(accountId, fingerprint);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update device' })
  @ApiParam({ name: 'id', description: 'Device UUID' })
  @ApiResponse({ status: 200, description: 'Device updated' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDeviceDto,
  ): Promise<DeviceResponse> {
    return this.devicesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a device' })
  @ApiParam({ name: 'id', description: 'Device UUID' })
  @ApiResponse({ status: 204, description: 'Device removed successfully' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.devicesService.remove(id);
  }

  @Post(':id/trust')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 trust operations per minute
  @ApiOperation({ summary: 'Trust a device' })
  @ApiParam({ name: 'id', description: 'Device UUID' })
  @ApiResponse({ status: 200, description: 'Device trusted' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  @ApiResponse({ status: 409, description: 'Device is already trusted' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async trust(@Param('id', ParseUUIDPipe) id: string): Promise<DeviceResponse> {
    return this.devicesService.trust(id);
  }

  @Post(':id/untrust')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 untrust operations per minute
  @ApiOperation({ summary: 'Untrust a device' })
  @ApiParam({ name: 'id', description: 'Device UUID' })
  @ApiResponse({ status: 200, description: 'Device untrusted' })
  @ApiResponse({ status: 400, description: 'Device is not trusted' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async untrust(@Param('id', ParseUUIDPipe) id: string): Promise<DeviceResponse> {
    return this.devicesService.untrust(id);
  }

  @Post(':id/activity')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Update device activity timestamp' })
  @ApiParam({ name: 'id', description: 'Device UUID' })
  @ApiQuery({ name: 'ipAddress', required: false, description: 'Client IP address' })
  @ApiResponse({ status: 204, description: 'Activity updated' })
  async updateActivity(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('ipAddress') ipAddress?: string,
  ): Promise<void> {
    return this.devicesService.updateActivity(id, ipAddress);
  }

  @Get('account/:accountId/count')
  @ApiOperation({ summary: 'Get device count for account' })
  @ApiParam({ name: 'accountId', description: 'Account UUID' })
  @ApiResponse({
    status: 200,
    description: 'Device count',
    schema: {
      properties: {
        total: { type: 'number' },
        trusted: { type: 'number' },
      },
    },
  })
  async getDeviceCount(
    @Param('accountId', ParseUUIDPipe) accountId: string,
  ): Promise<{ total: number; trusted: number }> {
    const [total, trusted] = await Promise.all([
      this.devicesService.getDeviceCount(accountId),
      this.devicesService.getTrustedDeviceCount(accountId),
    ]);
    return { total, trusted };
  }

  @Delete('account/:accountId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove all devices for an account' })
  @ApiParam({ name: 'accountId', description: 'Account UUID' })
  @ApiResponse({
    status: 200,
    description: 'Devices removed',
    schema: {
      properties: {
        count: { type: 'number', description: 'Number of devices removed' },
      },
    },
  })
  async removeAllForAccount(
    @Param('accountId', ParseUUIDPipe) accountId: string,
  ): Promise<{ count: number }> {
    const count = await this.devicesService.removeAllForAccount(accountId);
    return { count };
  }
}
